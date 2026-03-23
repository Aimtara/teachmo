// JS compatibility shim – see contract.ts for the typed source.

export function buildContractResponse({ summary, nextStep, detail }) {
  return {
    summary: summary || '',
    nextStep: nextStep || '',
    detail: detail || null
  };
}
