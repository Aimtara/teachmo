const CONFIDENCE_MARKERS = ['definitely', 'certainly', 'guaranteed', 'always', 'never', 'proven', '100%'];

function countMatches(text: string, regex: RegExp) {
  const match = text.match(regex);
  return match ? match.length : 0;
}

export function estimateTokens(text: string) {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.trim().length / 4));
}

export function scoreHallucinationRisk(text: string) {
  if (!text) return { score: 0, flags: [] as string[] };
  const flags: string[] = [];
  const numericClaims = /\d+[%]?\b/g.test(text);
  const confidenceHits = CONFIDENCE_MARKERS.some((marker) => text.toLowerCase().includes(marker));
  const hasSources = /(http|https|source|according to|study|report)/i.test(text);
  const namedEntities = countMatches(text, /\b[A-Z][a-z]+\b/g);

  let score = 0.1;
  if (numericClaims) {
    score += 0.2;
    flags.push('numeric_claims');
  }
  if (confidenceHits) {
    score += 0.2;
    flags.push('high_confidence_language');
  }
  if (!hasSources) {
    score += 0.2;
    flags.push('missing_sources');
  }
  if (namedEntities >= 6) {
    score += 0.2;
    flags.push('many_named_entities');
  }

  score = Math.min(1, Math.max(0, score));
  return { score, flags };
}
