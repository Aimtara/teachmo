import { brotliCompressSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const distAssetsDir = path.resolve('dist/assets');
const baseline = {
  totalBrotliKb: 602,
  maxInitialBrotliKb: 24,
  maxChunkBrotliKb: 225,
};

function collectJsFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function brotliBytes(filePath) {
  return brotliCompressSync(readFileSync(filePath)).byteLength;
}

if (!statSync(distAssetsDir, { throwIfNoEntry: false })?.isDirectory()) {
  console.error('[size-ratchet] dist/assets is missing. Run `npm run build` before `npm run check:size`.');
  process.exit(1);
}

const assets = collectJsFiles(distAssetsDir).map((filePath) => ({
  file: path.relative(process.cwd(), filePath),
  bytes: brotliBytes(filePath),
}));

const totalBrotliKb = assets.reduce((sum, asset) => sum + asset.bytes, 0) / 1024;
const initialAsset = assets.find((asset) => /\/index-[^/]+\.js$/.test(asset.file));
const largestAsset = assets.reduce((largest, asset) => (asset.bytes > largest.bytes ? asset : largest), assets[0]);
const current = {
  totalBrotliKb: Number(totalBrotliKb.toFixed(2)),
  initialBrotliKb: Number(((initialAsset?.bytes ?? 0) / 1024).toFixed(2)),
  largestChunkBrotliKb: Number(((largestAsset?.bytes ?? 0) / 1024).toFixed(2)),
  initialAsset: initialAsset?.file ?? null,
  largestAsset: largestAsset?.file ?? null,
};

const failures = [];
if (current.totalBrotliKb > baseline.totalBrotliKb) {
  failures.push(`total JS brotli increased: ${current.totalBrotliKb} kB > ${baseline.totalBrotliKb} kB`);
}
if (current.initialBrotliKb > baseline.maxInitialBrotliKb) {
  failures.push(`initial app shell increased: ${current.initialBrotliKb} kB > ${baseline.maxInitialBrotliKb} kB`);
}
if (current.largestChunkBrotliKb > baseline.maxChunkBrotliKb) {
  failures.push(`largest chunk increased: ${current.largestChunkBrotliKb} kB > ${baseline.maxChunkBrotliKb} kB`);
}

console.log('[size-ratchet] Current:', JSON.stringify(current, null, 2));
console.log('[size-ratchet] Baseline:', JSON.stringify(baseline, null, 2));

if (failures.length > 0) {
  console.error('[size-ratchet] Failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[size-ratchet] Passed. Bundle size did not regress.');
