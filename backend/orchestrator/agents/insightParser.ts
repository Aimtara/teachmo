/**
 * Lightweight parser shim used by orchestrator engine import paths.
 * Returns an empty insight set when NLP parsing is not configured.
 */
export async function parseEmailToInsights(): Promise<never[]> {
  return [];
}
