interface ContractResponseInput {
  summary?: string;
  nextStep?: string;
  detail?: unknown;
}

export function buildContractResponse({ summary, nextStep, detail }: ContractResponseInput) {
  return {
    summary: summary || '',
    nextStep: nextStep || '',
    detail: detail || null
  };
}
