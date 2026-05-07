export interface SpecialistInput {
  text?: string;
  entities?: Record<string, unknown>;
  safety?: unknown;
}

export interface SpecialistExecuteParams {
  ctx: Record<string, unknown>;
  input: SpecialistInput;
  [key: string]: unknown;
}

export interface SpecialistFormatParams {
  result: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface Specialist {
  requiredContext: () => string[];
  execute: (params: SpecialistExecuteParams) => Record<string, unknown>;
  formatResponse: (params: SpecialistFormatParams) => Record<string, unknown>;
}

export function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
