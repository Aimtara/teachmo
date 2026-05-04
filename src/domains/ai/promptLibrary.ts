import { domainJson } from '@/domains/http';

export type AIPrompt = {
  id: string;
  name: string;
  description?: string | null;
  version?: number | string | null;
  is_archived?: boolean | null;
};

export type AIPromptVersion = {
  id: string;
  content: string;
  is_active?: boolean | null;
};

export type AIPromptDetails = {
  prompt?: AIPrompt | null;
  versions?: AIPromptVersion[];
};

type AuthHeaders = Record<string, string>;

export function listAIPrompts(headers: AuthHeaders) {
  return domainJson<{ prompts?: AIPrompt[] }>('/admin/ai/prompts', { headers });
}

export function getAIPromptVersions(promptId: string, headers: AuthHeaders) {
  return domainJson<AIPromptDetails>(`/admin/ai/prompts/${encodeURIComponent(promptId)}/versions`, { headers });
}

export function createAIPrompt(
  payload: { name: string; description: string; content: string },
  headers: AuthHeaders,
) {
  return domainJson<AIPrompt>('/admin/ai/prompts', {
    method: 'POST',
    headers,
    json: payload,
  });
}

export function updateAIPrompt(
  promptId: string,
  payload: { name: string; description: string; isArchived: boolean },
  headers: AuthHeaders,
) {
  return domainJson<AIPrompt>(`/admin/ai/prompts/${encodeURIComponent(promptId)}`, {
    method: 'PUT',
    headers,
    json: payload,
  });
}

export function createAIPromptVersion(
  promptId: string,
  payload: { content: string; setActive: boolean },
  headers: AuthHeaders,
) {
  return domainJson<AIPromptVersion>(`/admin/ai/prompts/${encodeURIComponent(promptId)}/versions`, {
    method: 'POST',
    headers,
    json: payload,
  });
}
