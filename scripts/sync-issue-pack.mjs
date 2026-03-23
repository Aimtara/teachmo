import { runIssuePack } from './issue-pack-core.mjs';

if (process.env.UPDATE_EXISTING == null) {
  process.env.UPDATE_EXISTING = 'true';
}
if (process.env.DRY_RUN == null) {
  process.env.DRY_RUN = 'false';
}
if (process.env.CREATE_MISSING == null) {
  process.env.CREATE_MISSING = 'false';
}

runIssuePack({ mode: 'sync' }).catch((error) => {
  console.error(error);
  process.exit(1);
});
