type ContractResponseInput = {
  summary?: string | null;
  nextStep?: string | null;
  detail?: string | null;
};

type ContractResponse = {
  summary: string;
  nextStep: string;
  detail: string | null;
};

export function buildContractResponse({ summary, nextStep, detail }: ContractResponseInput): ContractResponse {
  return {
    summary: summary || '',
    nextStep: nextStep || '',
    detail: detail || null
  };
}
