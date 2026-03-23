import { runIssuePack } from './issue-pack-core.mjs';

runIssuePack({ mode: 'bootstrap' }).catch((error) => {
  console.error(error);
  process.exit(1);
});
