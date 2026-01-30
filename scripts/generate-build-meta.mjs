import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outputPath = resolve('src/generated/buildMeta.ts');

const buildTime = new Date().toISOString();
const shaFromEnv =
  process.env.BUILD_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA;

let buildSha = shaFromEnv;
if (!buildSha) {
  try {
    buildSha = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    buildSha = 'dev';
  }
}

const appEnv = process.env.VITE_APP_ENV || process.env.NODE_ENV || 'development';

const contents = `export const BUILD_SHA = ${JSON.stringify(buildSha)};\nexport const BUILD_TIME = ${JSON.stringify(
  buildTime
)};\nexport const APP_ENV = ${JSON.stringify(appEnv)};\n`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, contents);

console.log(`[build-meta] Wrote ${outputPath}`);
