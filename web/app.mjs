import { fuzzyScore } from './utils/fuzzy.mjs';

const manifestUrl = './slidey-decks/deck-manifest.json';
const hasDocument = typeof document !== 'undefined';
const searchInput = hasDocument ? document.querySelector('#search') : null;
const deckListEl = hasDocument ? document.querySelector('#deck-list') : null;
const statusEl = hasDocument ? document.querySelector('#status') : null;
const deckTemplate = hasDocument ? document.querySelector('#deck-item-template') : null;

let decks = [];

if (hasDocument) {
  document.addEventListener('DOMContentLoaded', () => {
    initialize().catch((error) => {
      console.error(error);
      setStatus('Unable to load deck manifest. Did you run npm run generate:manifest?');
    });
  });

  searchInput?.addEventListener('input', handleSearchInput);
}

async function initialize() {
  setStatus('Loading decks…');
  decks = await loadManifest();

  if (!decks.length) {
    setStatus('No decks found yet. Add a deck and regenerate the manifest.');
    renderDecks([]);
    return;
  }

  setStatus(`Loaded ${decks.length} deck${decks.length === 1 ? '' : 's'}.`);
  renderDecks(decks);
}

async function loadManifest() {
  const response = await fetch(manifestUrl, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Failed to fetch deck manifest: ${response.status}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.decks)) {
    throw new Error('Manifest format is invalid.');
  }

  return payload.decks.map((deck) => ({
    ...deck,
    tags: Array.isArray(deck.tags) ? deck.tags : [],
  }));
}

function handleSearchInput() {
  const query = searchInput.value.trim();
  if (!query) {
    setStatus(`Showing all ${decks.length} decks.`);
    renderDecks(decks);
    return;
  }

  const results = searchDecks(decks, query);
  if (results.length) {
    const message =
      results.length === decks.length
        ? `Showing all ${results.length} decks (query matches everything).`
        : `Showing ${results.length} match${results.length === 1 ? '' : 'es'} for “${query}”.`;
    setStatus(message);
  } else {
    setStatus(`No matches for “${query}”.`);
  }
  renderDecks(results);
}

function searchDecks(deckList, query) {
  const normalizedQuery = query.trim();
  const normalizedLower = normalizedQuery.toLowerCase();

  return deckList
    .map((deck) => {
      const fields = [
        deck.title || '',
        deck.id || '',
        deck.dir || '',
        ...(Array.isArray(deck.tags) ? deck.tags : []),
      ];

      let bestScore = 0;

      for (const field of fields) {
        if (!field) {
          continue;
        }

        const directIndex = field.toLowerCase().indexOf(normalizedLower);
        const directScore = directIndex >= 0 ? 500 + (field.length - directIndex) : 0;
        const fuzzy = fuzzyScore(normalizedQuery, field);

        bestScore = Math.max(bestScore, directScore, fuzzy);
      }

      return { deck, score: bestScore };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.deck);
}

function renderDecks(deckList) {
  if (!deckListEl || !deckTemplate) {
    return;
  }

  deckListEl.innerHTML = '';
  const fragment = document.createDocumentFragment();

  deckList.forEach((deck) => {
    const node = deckTemplate.content.firstElementChild.cloneNode(true);
    const link = node.querySelector('.deck-link');
    const pathLabel = node.querySelector('.deck-path');
    const tagsContainer = node.querySelector('.deck-tags');

    link.textContent = deck.title;
    link.href = deck.href;
    pathLabel.textContent = deck.dir;

    if (tagsContainer) {
      tagsContainer.innerHTML = '';
      if (deck.tags && deck.tags.length) {
        deck.tags.forEach((tag) => {
          const badge = document.createElement('span');
          badge.className = 'deck-tag';
          badge.textContent = tag;
          tagsContainer.appendChild(badge);
        });
        tagsContainer.classList.remove('hidden');
        tagsContainer.setAttribute('aria-hidden', 'false');
      } else {
        tagsContainer.classList.add('hidden');
        tagsContainer.setAttribute('aria-hidden', 'true');
      }
    }

    fragment.appendChild(node);
  });

  deckListEl.appendChild(fragment);
}

function setStatus(message) {
  if (statusEl) {
    statusEl.textContent = message;
  }
}

export { loadManifest, searchDecks };
