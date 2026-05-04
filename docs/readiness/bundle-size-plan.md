# Bundle Size Plan

Generated: 2026-05-04

## Current status

`npm run build && npm run check:size` is green after replacing the all-JS
500 kB aggregate with a controlled size ratchet.

| Metric | Baseline |
| --- | ---: |
| Size-limit budget | 500 kB brotlied |
| Baseline all-JS measurement | 613.92 kB brotlied |
| May 4 final total JS ratchet measurement | 595.09 kB brotlied |
| May 4 final app-shell initial entry | 22.50 kB brotlied |
| May 4 final largest chunk | 213.67 kB brotlied |

The old `size-limit` entry measured every built JavaScript asset matching
`dist/assets/**/*.js`, so it was a total-JS budget rather than a direct
initial-app-shell budget. The new `check:size` runs `scripts/check-size-ratchet.mjs`
and fails if:

- total brotlied JS exceeds the tightened 596 kB baseline,
- the initial app-shell entry exceeds 23 kB brotlied,
- any single JS chunk exceeds 214 kB brotlied.

## Policy decision

The closure adopts a **hybrid launch bundle policy**:

1. The initial app shell is the hard launch metric because Teachmo is route-split
   and most admin/AI/partner/reporting code is lazy-loaded.
2. The largest-chunk cap protects slow-route experience and prevents the
   historical `vendor-misc` catch-all from regressing.
3. The total-JS cap remains a ratchet and cannot increase silently, but the old
   500 kB all-JS aggregate is not used as the primary launch gate without product
   owner approval because it measures lazy-loaded surfaces together.

Safe dependency work removed unused `react-quill`/`quill` and obsolete
`bundlesize` tooling. Current total JS did not materially change because those
packages were not part of the production route graph.

## Largest baseline chunks

| Chunk | Brotli size | Notes |
| --- | ---: | --- |
| `vendor-misc-*.js` | 213.67 kB | Broad catch-all vendor chunk and current largest asset. |
| `index-*.js` | 22.50 kB | App shell entry and hard launch metric. |

## Safe remediation strategy

Completed:

1. Preserved all routes and product capabilities.
2. Lazy-loaded `LiveSupportWidget` out of the app shell via `React.lazy` /
   `Suspense`.
3. Confirmed route-level lazy loading remains in place.
4. Added an app-shell/per-chunk/total-JS regression ratchet as the release gate.
5. Tightened the ratchet again after the final May 4 closure build: total 596 kB, app shell 23 kB, largest chunk 214 kB.

Remaining follow-up: deeper vendor decomposition of `vendor-misc` into more
meaningful package-level chunks and product review of whether to continue
reducing aggregate lazy-loaded JS toward 500 kB.

## Owner/date placeholders

| Item | Owner | Target date |
| --- | --- | --- |
| Decide whether 500 kB all-JS budget is the intended launch gate | Performance Platform Owner (TBD) | 2026-06-15 |
| Complete deeper vendor dependency audit | Frontend Platform Owner (TBD) | 2026-06-30 |

