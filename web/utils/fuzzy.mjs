export function fuzzyScore(query, text) {
  if (!query || !text) {
    return 0;
  }

  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let score = 0;
  let searchIndex = 0;

  for (const char of q) {
    const foundIndex = t.indexOf(char, searchIndex);
    if (foundIndex === -1) {
      return 0;
    }

    score += 1 + (t.length - foundIndex);
    searchIndex = foundIndex + 1;
  }

  return score;
}

export function bestFuzzyMatch(query, candidates) {
  if (!Array.isArray(candidates) || !candidates.length) {
    return { score: 0, value: null };
  }

  let bestScore = 0;
  let bestValue = null;

  for (const value of candidates) {
    if (typeof value !== 'string' || !value) {
      continue;
    }
    const score = fuzzyScore(query, value);
    if (score > bestScore) {
      bestScore = score;
      bestValue = value;
    }
  }

  return { score: bestScore, value: bestValue };
}
