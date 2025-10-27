import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

import { fuzzyScore } from '../web/utils/fuzzy.mjs';
import { searchDecks } from '../web/app.mjs';

const require = createRequire(import.meta.url);
const countdownTimer = require('../slidey-plugins/countdown-timer/countdown-timer.js');
const { parseTimeToSeconds, formatTime } = countdownTimer.__internals;

test('fuzzyScore returns zero when characters are missing', () => {
  assert.equal(fuzzyScore('abc', 'def'), 0);
});

test('fuzzyScore is case-insensitive and rewards order', () => {
  const score = fuzzyScore('deck', 'My Deck Title');
  assert.ok(score > 0);
  const reversed = fuzzyScore('ked', 'My Deck Title');
  assert.ok(score > reversed);
});

test('searchDecks matches tags and ids', () => {
  const decks = [
    { title: 'First Deck', id: 'deck-one', dir: 'slidey-decks/deck-one/', tags: ['react', 'demo'] },
    { title: 'Second', id: 'deck-two', dir: 'slidey-decks/deck-two/', tags: ['workshop'] },
  ];

  const tagMatches = searchDecks(decks, 'react');
  assert.equal(tagMatches.length, 1);
  assert.equal(tagMatches[0].id, 'deck-one');

  const idMatches = searchDecks(decks, 'deck-two');
  assert.equal(idMatches.length, 1);
  assert.equal(idMatches[0].id, 'deck-two');
});

test('parseTimeToSeconds parses minute or minute:second strings', () => {
  assert.equal(parseTimeToSeconds('10'), 600);
  assert.equal(parseTimeToSeconds('5:30'), 330);
});

test('parseTimeToSeconds rejects invalid inputs', () => {
  assert.equal(parseTimeToSeconds(''), null);
  assert.equal(parseTimeToSeconds('-1'), null);
  assert.equal(parseTimeToSeconds('3:-10'), null);
  assert.equal(parseTimeToSeconds('1:75'), null);
  assert.equal(parseTimeToSeconds('nope'), null);
});

test('formatTime formats and clamps values', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(-20), '00:00');
});
