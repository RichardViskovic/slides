#!/usr/bin/env node

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(__dirname, '..');
const decksRoot = join(projectRoot, 'slidey-decks');
const manifestPath = join(decksRoot, 'deck-manifest.json');

/**
 * Returns the list of sub-directories inside slidey-decks.
 */
async function getDeckDirectories() {
  const entries = await readdir(decksRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

/**
 * Extracts optional YAML front matter from markdown and returns a metadata object.
 * Only a very small subset is supported to avoid third-party dependencies.
 */
function extractFrontMatter(markdown) {
  const trimmed = markdown.trimStart();
  if (!trimmed.startsWith('---')) {
    return {};
  }

  const endIndex = trimmed.indexOf('\n---', 3);
  if (endIndex === -1) {
    return {};
  }

  const frontMatterRaw = trimmed.slice(3, endIndex).trim();
  const lines = frontMatterRaw.split(/\r?\n/);
  const meta = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (!key) {
      continue;
    }

    if (key === 'tags') {
      if (!value) {
        meta.tags = [];
      } else if (value.startsWith('[') && value.endsWith(']')) {
        const items = value.slice(1, -1).split(',').map((item) => item.trim()).filter(Boolean);
        meta.tags = items;
      } else if (value.includes(',')) {
        meta.tags = value.split(',').map((item) => item.trim()).filter(Boolean);
      } else {
        meta.tags = [value];
      }
    } else {
      meta[key] = value;
    }
  }

  return meta;
}

async function extractMarkdownTitle(markdownPath) {
  try {
    const markdown = await readFile(markdownPath, 'utf8');
    const { tags = [] } = extractFrontMatter(markdown);
    const titleMatch = markdown.match(/^\s*#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : null;
    return { title, tags };
  } catch {
    return { title: null, tags: [] };
  }
}

async function extractHtmlTitle(htmlPath) {
  try {
    const markup = await readFile(htmlPath, 'utf8');
    const match = markup.match(/<title>\s*(.*?)\s*<\/title>/i);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

async function resolveDeckInfo(dirName) {
  const deckPath = join(decksRoot, dirName);
  const indexPath = join(deckPath, 'index.html');
  const markdownPath = join(deckPath, 'slides.md');

  const { title: markdownTitle, tags } = await extractMarkdownTitle(markdownPath);
  const htmlTitle = await extractHtmlTitle(indexPath);

  const title = markdownTitle || htmlTitle || dirName.replace(/[-_]/g, ' ');

  const deckStat = await stat(deckPath);

  return {
    id: dirName,
    title,
    href: relative(projectRoot, join(deckPath, 'index.html')).replace(/\\/g, '/'),
    dir: `${relative(projectRoot, deckPath).replace(/\\/g, '/')}/`,
    tags,
    updatedAt: deckStat.mtime.toISOString(),
  };
}

async function buildManifest() {
  const directories = await getDeckDirectories();
  const entries = await Promise.all(
    directories.map(async (dirName) => {
      try {
        return await resolveDeckInfo(dirName);
      } catch (error) {
        console.warn(`Skipping deck "${dirName}" due to error: ${error.message}`);
        return null;
      }
    }),
  );

  const filtered = entries.filter(Boolean).sort((a, b) => a.title.localeCompare(b.title));
  const payload = {
    generatedAt: new Date().toISOString(),
    decks: filtered,
  };

  await writeFile(manifestPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${filtered.length} deck(s) to ${relative(projectRoot, manifestPath)}`);
}

buildManifest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
