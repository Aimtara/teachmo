#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const UI_PREFIXES = ['src/pages/', 'src/components/', 'src/hooks/', 'src/app/', 'src/routes/'];
const APPROVED_PREFIXES = [
  'src/pages/__tests__/',
  'src/components/**/__tests__/',
  'src/components/testing/',
  'src/components/specs/',
  'src/hooks/__tests__/',
  'src/domains/',
  'src/domain/',
  'src/services/',
  'src/api/',
  'src/lib/',
  'src/observability/',
  'backend/',
  'nhost/functions/',
  'tests/',
  'scripts/',
];

const TEMPORARY_ALLOWLIST = [
  {
    path: 'src/components/teacher/AssignmentsView.jsx',
    patterns: ['graphqlRequest'],
    owner: 'Frontend Platform',
    targetRemoval: '2026-06-30',
    reason:
      'Characterized legacy teacher assignment UI; needs dedicated assignments domain extraction before removal.',
  },
  {
    path: 'src/pages/TeacherDashboard.jsx',
    patterns: ['graphqlRequest'],
    owner: 'Frontend Platform',
    targetRemoval: '2026-06-30',
    reason:
      'Legacy teacher dashboard summary query remains temporarily direct pending dashboard domain consolidation.',
  },
  {
    pathPrefix: 'src/pages/Admin',
    patterns: ['graphqlRequest', 'fetch'],
    owner: 'Admin Platform',
    targetRemoval: '2026-07-15',
    reason:
      'Admin surfaces need a larger GraphQL/service adapter migration; direct access is quarantined as launch-blocking follow-up.',
  },
  {
    pathPrefix: 'src/pages/Partner',
    patterns: ['fetch'],
    owner: 'Partner Platform',
    targetRemoval: '2026-07-15',
    reason:
      'Partner REST surfaces are isolated integration paths; service-adapter extraction is tracked before production scale.',
  },
  {
    path: 'src/components/messages/ChatWindow.jsx',
    patterns: ['fetch'],
    owner: 'Messaging Platform',
    targetRemoval: '2026-06-30',
    reason:
      'Translation function invocation must move into canonical messaging domain after Nhost function contract review.',
  },
  {
    path: 'src/components/integration/ServiceConnect.jsx',
    patterns: ['fetch'],
    owner: 'Integrations Platform',
    targetRemoval: '2026-07-15',
    reason:
      'External integration OAuth endpoints are REST-backed; UI adapter migration tracked as production follow-up.',
  },
  {
    pathPrefix: 'src/components/admin/',
    patterns: ['fetch'],
    owner: 'Admin Platform',
    targetRemoval: '2026-07-15',
    reason: 'Admin widgets require service extraction with admin smoke coverage before production scale.',
  },
  {
    pathPrefix: 'src/components/ai/',
    patterns: ['fetch'],
    owner: 'AI Platform',
    targetRemoval: '2026-07-15',
    reason: 'AI service calls require governance-aware service adapter extraction.',
  },
  {
    pathPrefix: 'src/components/compliance/',
    patterns: ['fetch'],
    owner: 'Compliance Platform',
    targetRemoval: '2026-07-15',
    reason: 'Compliance REST calls require a dedicated compliance service adapter.',
  },
  {
    pathPrefix: 'src/components/discover/',
    patterns: ['graphqlRequest'],
    owner: 'Discover Platform',
    targetRemoval: '2026-06-30',
    reason: 'Discover GraphQL query requires a discover domain hook extraction.',
  },
  {
    pathPrefix: 'src/hooks/',
    patterns: ['graphqlRequest'],
    owner: 'Frontend Platform',
    targetRemoval: '2026-06-30',
    reason: 'Legacy hooks are domain-like compatibility boundaries pending relocation to src/domains or src/services.',
  },
  {
    path: 'src/components/SecurityStatusWidget.tsx',
    patterns: ['fetch'],
    owner: 'Security Platform',
    targetRemoval: '2026-07-15',
    reason: 'Security status widget calls ops status REST until a security service adapter is extracted.',
  },
  {
    path: 'src/pages/AIPromptLibrary.jsx',
    patterns: ['fetch'],
    owner: 'AI Platform',
    targetRemoval: '2026-07-15',
    reason: 'AI prompt library requires governance-aware service adapter extraction.',
  },
  {
    path: 'src/pages/AITransparency.jsx',
    patterns: ['graphqlRequest'],
    owner: 'AI Platform',
    targetRemoval: '2026-07-15',
    reason: 'AI transparency query requires AI governance domain extraction.',
  },
  {
    path: 'src/pages/ExecutionBoard.jsx',
    patterns: ['fetch'],
    owner: 'Ops Platform',
    targetRemoval: '2026-07-15',
    reason: 'Execution board fallback fetch remains temporarily direct pending full ops domain migration.',
  },
  {
    path: 'src/pages/SchoolDirectoryAdmin.jsx',
    patterns: ['graphqlRequest'],
    owner: 'Directory Platform',
    targetRemoval: '2026-07-15',
    reason: 'School directory admin query requires directory admin service extraction.',
  },
  {
    path: 'src/components/shared/ProtectedRoute.tsx',
    patterns: ['permissionDeniedAudit'],
    owner: 'Security Platform',
    targetRemoval: '2026-07-15',
    reason:
      'Route guard is the only approved UI edge allowed to emit permission-denied telemetry; Hasura remains authoritative.',
  },
];

const DISALLOWED_PATTERNS = [
  {
    id: 'graphqlRequest',
    regex: /\bgraphqlRequest\b/,
    reason: 'UI must call domain modules/hooks instead of raw GraphQL helpers.',
  },
  {
    id: 'apiClient.entity',
    regex: /\bapiClient\.entity\./,
    reason: 'UI must not call platform entity client directly.',
  },
  {
    id: 'platform entity maps',
    regex: /\b(platformEntitiesMap|entityMap|platformFunctionsMap)\b/,
    reason: 'UI must not use platform compatibility maps directly.',
  },
  {
    id: 'compatClient',
    regex: /\bcompatClient\b|['"]@\/api\/compatClient['"]|jest\.mock\(['"]@\/api\/compatClient['"]/,
    reason: 'UI must not call legacy compatibility client directly.',
  },
  {
    id: 'base44',
    regex: /\bbase44\b|@base44\/sdk|@\/api\/base44/i,
    reason: 'Base44 is legacy scaffolding and must not be used from UI/runtime paths.',
  },
  {
    id: 'fetch',
    regex: /\bfetch\s*\(/,
    reason: 'UI must call service/domain adapters instead of direct REST fetch.',
  },
  {
    id: 'nhost-admin',
    regex: /NHOST_ADMIN_SECRET|x-hasura-admin-secret|adminSecret/i,
    reason: 'Server-only Nhost/Hasura admin access must never appear in UI files.',
  },
  {
    id: 'permissionDeniedAudit',
    regex: /\bpermissionDeniedAudit\b/,
    reason: 'UI must not emit audit events directly except the central route guard edge.',
  },
];

function trackedFiles() {
  return execFileSync('git', ['ls-files', '*.js', '*.jsx', '*.ts', '*.tsx'], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
}

function isUiFile(file) {
  return UI_PREFIXES.some((prefix) => file.startsWith(prefix));
}

function isApprovedNonUi(file) {
  if (!isUiFile(file)) return true;
  return APPROVED_PREFIXES.some((prefix) => {
    if (prefix.includes('**')) {
      const [start, end] = prefix.split('**');
      return file.startsWith(start) && file.includes(end.replace(/^\//, ''));
    }
    return file.startsWith(prefix);
  });
}

function allowlistEntry(file, patternId) {
  return TEMPORARY_ALLOWLIST.find((entry) => {
    const pathMatches = entry.path ? entry.path === file : file.startsWith(entry.pathPrefix);
    return pathMatches && entry.patterns.includes(patternId);
  });
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

const violations = [];
const allowed = [];

for (const file of trackedFiles()) {
  if (!isUiFile(file) || isApprovedNonUi(file)) continue;
  const source = readFileSync(file, 'utf8');
  for (const pattern of DISALLOWED_PATTERNS) {
    pattern.regex.lastIndex = 0;
    const match = pattern.regex.exec(source);
    if (!match) continue;
    const entry = allowlistEntry(file, pattern.id);
    const record = {
      file,
      line: lineNumber(source, match.index),
      pattern: pattern.id,
      reason: pattern.reason,
      allowlist: entry,
    };
    if (entry) allowed.push(record);
    else violations.push(record);
  }
}

if (allowed.length) {
  console.log('API boundary temporary exceptions:');
  for (const item of allowed) {
    console.log(
      `${item.file}:${item.line} ${item.pattern} TEMPORARY owner=${item.allowlist.owner} target=${item.allowlist.targetRemoval} reason=${item.allowlist.reason}`
    );
  }
}

if (violations.length) {
  console.error('API boundary violations:');
  for (const item of violations) {
    console.error(`${item.file}:${item.line} ${item.pattern} ${item.reason}`);
  }
  process.exit(1);
}

console.log(
  `API boundary check passed (${allowed.length} temporary exception${allowed.length === 1 ? '' : 's'} documented).`
);
