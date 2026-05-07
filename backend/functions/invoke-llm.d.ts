export function invokeLLM(params: {
  prompt: string;
  model?: string;
  context?: string | { role: string; content: string }[];
  user?: string;
  timeoutMs?: number;
}): Promise<{ content: string | null; model: string; usage: Record<string, unknown> }>;
