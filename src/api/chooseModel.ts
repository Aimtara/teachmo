// Dynamic model selection helper
//
// This utility determines which large language model to use based on
// prompt complexity, length, or other criteria. Use this helper in
// backend functions (e.g. generateWeeklyBrief, invokeAdvancedAI wrappers)
// to optimise cost and performance. The default fallback returns
// gpt-3.5-turbo for short prompts and gpt-4 for longer or more complex
// requests.

interface ModelOptions {
  /** Temperature controls randomness; 0.0–1.0. */
  temperature?: number;
  /** Additional model parameters; using unknown instead of any for type safety. */
  [key: string]: unknown;
}

export function chooseModel(prompt: string, options: ModelOptions = {}) {
  const wordCount = prompt.split(/\s+/).length;
  if (wordCount < 100) {
    return { model: 'gpt-3.5-turbo', temperature: options.temperature ?? 0.5 };
  }
  return { model: 'gpt-4', temperature: options.temperature ?? 0.5 };
}
