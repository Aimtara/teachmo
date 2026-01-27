export function buildContractResponse({ summary, nextStep, detail }) {
  return {
    summary: summary || '',
    nextStep: nextStep || '',
    detail: detail || null
  };
}
