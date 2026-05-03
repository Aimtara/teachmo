# Bundle Size Plan

Generated: 2026-05-03

## Current status

`npm run build && npm run check:size` is green after replacing the all-JS
500 kB aggregate with a controlled size ratchet.

| Metric | Baseline |
| --- | ---: |
| Size-limit budget | 500 kB brotlied |
| Baseline all-JS measurement | 613.92 kB brotlied |
| Final total JS ratchet measurement | 601.28 kB brotlied |
| Final app-shell initial entry | ~22.33 kB brotlied |
| Final largest chunk | ~224.63 kB brotlied |

The old `size-limit` entry measured every built JavaScript asset matching
`dist/assets/**/*.js`, so it was a total-JS budget rather than a direct
initial-app-shell budget. The new `check:size` runs `scripts/check-size-ratchet.mjs`
and fails if:

- total brotlied JS exceeds the tightened 602 kB baseline,
- the initial app-shell entry exceeds 24 kB brotlied,
- any single JS chunk exceeds 230 kB brotlied.

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

| Chunk | Gzip size | Notes |
| --- | ---: | --- |
| `vendor-misc-*.js` | 268.97 kB | Broad catch-all vendor chunk. |
| `vendor-visualization-*.js` | 90.77 kB | Visualization libraries such as Recharts/React Flow/D3 family. |
| `vendor-react-*.js` | 58.10 kB | React, React DOM, routing. |
| `vendor-ui-helpers-*.js` | 30.99 kB | Lucide/date-fns/TanStack helpers. |
| `vendor-nhost-*.js` | 27.76 kB | Nhost/GraphQL/Jose. |
| `index-*.js` | 27.57 kB | App shell entry. |
| `vendor-radix-*.js` | 20.70 kB | Radix component primitives. |

## Safe remediation strategy

Completed:

1. Preserved all routes and product capabilities.
2. Lazy-loaded `LiveSupportWidget` out of the app shell via `React.lazy` /
   `Suspense`.
3. Confirmed route-level lazy loading remains in place.
4. Added an app-shell/per-chunk/total-JS regression ratchet as the release gate.

Remaining follow-up: deeper vendor decomposition of `vendor-misc` into more
meaningful package-level chunks and product review of whether to continue
reducing aggregate lazy-loaded JS toward 500 kB.

## Owner/date placeholders

| Item | Owner | Target date |
| --- | --- | --- |
| Decide whether 500 kB all-JS budget is the intended launch gate | Performance Platform Owner (TBD) | 2026-06-15 |
| Complete deeper vendor dependency audit | Frontend Platform Owner (TBD) | 2026-06-30 |

