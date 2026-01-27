/* eslint-env node */
import { clearExpiredMitigations } from '../orchestrator/mitigation.js';

async function main() {
  const out = await clearExpiredMitigations();
  console.log(JSON.stringify({ ok: true, ...out }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
