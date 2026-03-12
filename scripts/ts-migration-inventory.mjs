#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const exts = ['js', 'jsx', 'ts', 'tsx'];
const files = execSync("git ls-files '*.js' '*.jsx' '*.ts' '*.tsx'", { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

const totals = Object.fromEntries(exts.map((ext) => [ext, 0]));
const byTop = new Map();

for (const file of files) {
  const ext = file.split('.').pop();
  if (!exts.includes(ext)) continue;
  totals[ext] += 1;

  const top = file.includes('/') ? file.split('/')[0] : '(repo root)';
  if (!byTop.has(top)) {
    byTop.set(top, Object.fromEntries(exts.map((kind) => [kind, 0])));
  }
  byTop.get(top)[ext] += 1;
}

const planningMetadata = {
  src: { owner: 'Frontend Platform', risk: 'High', targetSprint: 'Sprint 2-6', blockedBy: 'Shared type contracts + slice DRIs' },
  backend: { owner: 'Backend Platform', risk: 'High', targetSprint: 'Sprint 4-8', blockedBy: 'Typed request/response + middleware context contracts' },
  nhost: { owner: 'Data Platform', risk: 'Medium', targetSprint: 'Sprint 5-8', blockedBy: 'Schema-adjacent TS utility ownership alignment' },
  tests: { owner: 'QA & Reliability', risk: 'Medium', targetSprint: 'Sprint 6-9', blockedBy: 'Typed fixtures + helper migration sequencing' },
  scripts: { owner: 'Developer Experience', risk: 'Low', targetSprint: 'Sprint 6-9', blockedBy: 'Tooling compatibility review' },
  '.storybook': { owner: 'Design System', risk: 'Low', targetSprint: 'Sprint 6-9', blockedBy: 'Storybook TS config parity checks' },
  public: { owner: 'Frontend Platform', risk: 'Low', targetSprint: 'Sprint 8-10', blockedBy: 'Generated/static file exemption review' },
  '(repo root)': { owner: 'Developer Experience', risk: 'Medium', targetSprint: 'Sprint 6-10', blockedBy: 'Config-level JS exception decisions' },
};

const rows = [...byTop.entries()]
  .map(([dir, counts]) => {
    const metadata = planningMetadata[dir] ?? {
      owner: 'TBD',
      risk: 'TBD',
      targetSprint: 'TBD',
      blockedBy: 'TBD',
    };
    return { dir, ...counts, ...metadata };
  })
  .sort((a, b) => (b.js + b.jsx) - (a.js + a.jsx) || a.dir.localeCompare(b.dir));

const generatedAt = new Date().toISOString();
const markdown = [
  '# TypeScript Migration Tracker',
  '',
  `Generated: ${generatedAt}`,
  '',
  '## Baseline totals (tracked files)',
  '',
  '| Extension | Count |',
  '| --- | ---: |',
  ...exts.map((ext) => `| .${ext} | ${totals[ext]} |`),
  '',
  '## JS/TS inventory by top-level directory',
  '',
  '| Directory | .js | .jsx | .ts | .tsx |',
  '| --- | ---: | ---: | ---: | ---: |',
  ...rows.map((row) => `| ${row.dir} | ${row.js} | ${row.jsx} | ${row.ts} | ${row.tsx} |`),
  '',
  '## Phase 0 ownership and sprint plan',
  '',
  '| Directory | Owner | Risk level | Target sprint | Blocked by |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map((row) => `| ${row.dir} | ${row.owner} | ${row.risk} | ${row.targetSprint} | ${row.blockedBy} |`),
  '',
  '## Temporary JavaScript exception register (initial)',
  '',
  '| Path/pattern | Owner | Reason | Risk impact | Target removal date | Tracking issue |',
  '| --- | --- | --- | --- | --- | --- |',
  '| `src/**/*.jsx` and `src/**/*.js` | Frontend Platform | Legacy React/UI slices pending vertical migration sequencing. | High | 2026-08-31 | TS-MIG-101 |',
  '| `backend/**/*.js` | Backend Platform | Service and route conversion depends on typed boundary contracts. | High | 2026-09-30 | TS-MIG-102 |',
  '| `*.js`, `*.cjs`, and `*.mjs` build/tooling config in repo root | Developer Experience | Ecosystem compatibility exceptions pending TS-first config decisions. | Medium | 2026-10-15 | TS-MIG-103 |',
  '| `public/**/*.js` | Frontend Platform | Static/runtime browser artifacts reviewed as explicit JS exceptions. | Low | 2026-10-15 | TS-MIG-104 |',
  '',

  '## Phase 1 foundation hardening progress',
  '',
  '- [x] Established shared foundational types in `src/types/api.ts` (`Result`, `PaginatedResponse`, `TenantScope`, queued mutation response).',
  '- [x] Added typed API config boundary by migrating `src/config/api.js` to `src/config/api.ts`.',
  '- [x] Added typed partner HTTP boundary by migrating `src/api/partner/client.js` to `src/api/partner/client.ts`.',
  '- [x] Normalized tenant scope usage in analytics/workflows clients onto shared `TenantScope` type.',
  '- [x] Expanded shared boundary utilities with a shared typed HTTP client for auth headers, JSON requests, blob requests, and offline queue handling in migrated API clients.',
  '- [x] Continued applying the shared HTTP client to additional API modules (`src/api/ai/client.ts`, `src/api/integrations/index.ts`) and standardized auth header handling.',
  '- [x] Introduced runtime response validation at an integration boundary (`src/api/integrations/index.ts`) using `zod` schemas for safer typed parsing.',
  '- [x] Migrated additional API compatibility boundaries to TypeScript (`src/api/functions.ts`, `src/api/entities.ts`) and removed JS shims where extensionless imports remain compatible.',
  '- [x] Added typed function response envelopes for key integration calls (`googleAuth`, `googleClassroomSync`, `searchSchools`, `submitSchoolParticipationRequest`) and propagated safer optional-envelope handling into service/UI consumers to reduce weak dynamic contracts at API boundaries.',
  '- [x] Added runtime validation for CSV roster row ingestion in `src/services/integrations/csvRosterService.ts` to replace unsafe row casting.',
  '- [x] Removed residual type assertions in school envelope parsing by typing `zod` schemas directly to `SearchSchoolsData` and `SchoolRequestData`.',
  '- [x] Migrated shared audit diff utility from `src/utils/auditDiff.js` to `src/utils/auditDiff.ts` with explicit change-entry typing.',
  '- [x] Migrated navigation config from `src/config/navigation.js` to `src/config/navigation.ts` with explicit navigation item typing and role-aware helpers.',
  '- [x] Migrated layout barrel export from `src/components/layout/index.js` to `src/components/layout/index.ts` to reduce JS compatibility surface.',
  '- [x] Migrated domain barrel export from `src/domain/index.js` to `src/domain/index.ts` to reduce shared JS surface area.',
  '- [x] Migrated React Query client helper from `src/lib/queryClient.js` to `src/lib/queryClient.ts` to shrink shared JS utility surface area.',
  '- [x] Migrated active role session helper from `src/lib/activeRole.js` to `src/lib/activeRole.ts` with explicit role/null typing.',
  '- [x] Migrated onboarding flow session helper from `src/lib/onboardingFlow.js` to `src/lib/onboardingFlow.ts` with explicit flow and path typing.',
  '- [x] Migrated domain API modules (`src/domain/{assignments,learners,messaging,orgs}.js`) to TypeScript to reduce shared JS slice surface area.',
  '- [x] Migrated i18n bootstrap from `src/i18n.js` to `src/i18n.ts` to reduce root-level shared JS setup surface.',
  '- [x] Migrated Vitest setup bootstrap from `src/test/setup.js` to `src/test/setup.ts` and updated config references.',
  '- [x] Migrated events domain module from `src/domains/events.js` to `src/domains/events.ts` with typed list/filter params.',
  '- [x] Migrated children domain module from `src/domains/children.js` to `src/domains/children.ts` with typed mutation/query params.',
  '- [x] Migrated messages domain module from `src/domains/messages.js` to `src/domains/messages.ts` with typed pagination and moderation inputs.',
  '- [x] Migrated activities domain module from `src/domains/activities.js` to `src/domains/activities.ts` with typed list/order params.',
  '- [ ] Continue applying the shared HTTP client and runtime-validation-backed contracts across remaining API modules and backend integration boundaries.',
  '',

  '## Phase 0 kickoff checklist',
  '',
  '- [x] Baseline inventory generated and committed.',
  '- [x] Assign DRI owners for each top-level directory.',
  '- [x] Add risk level + target sprint per directory.',
  '- [x] Capture temporary JavaScript exception list with retirement dates.',
  '',
].join('\n');

const shouldWrite = process.argv.includes('--write');
if (shouldWrite) {
  writeFileSync('docs/typescript-migration-tracker.md', markdown);
  console.log('Wrote docs/typescript-migration-tracker.md');
} else {
  console.log(markdown);
}
