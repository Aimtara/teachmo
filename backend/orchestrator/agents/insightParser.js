// JS compatibility shim – see insightParser.ts for the typed source.
/**
 * Lightweight parser shim used by orchestrator engine import paths.
 * Returns an empty insight set when NLP parsing is not configured.
 */
export async function parseEmailToInsights() {
  return [];
}
