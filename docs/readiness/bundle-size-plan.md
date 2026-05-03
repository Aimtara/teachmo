# Bundle Size Plan

Generated: 2026-05-03

## Current status

`npm run build && npm run check:size` is red at baseline.

| Metric | Baseline |
| --- | ---: |
| Size-limit budget | 500 kB brotlied |
| Current size-limit measurement | 613.92 kB brotlied |
| Delta over budget | 113.92 kB |

The current `size-limit` entry measures every built JavaScript asset matching
`dist/assets/**/*.js`, so it is a total-JS budget rather than a direct
initial-app-shell budget.

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

1. Preserve all routes and product capabilities.
2. Inspect heavy eager imports in the app shell, especially provider/widget
   imports in `src/App.jsx`.
3. Keep admin, ops, AI, partner, reports, and visualization-heavy surfaces
   lazy-loaded behind route boundaries.
4. If the all-JS 500 kB budget remains unsuitable after safe reductions, replace
   the release gate with:
   - an app-shell budget,
   - per-chunk caps,
   - a total-JS regression ratchet,
   - owner approval placeholder and target date.

## Owner/date placeholders

| Item | Owner | Target date |
| --- | --- | --- |
| Decide whether 500 kB all-JS budget is the intended launch gate | Performance Platform Owner (TBD) | 2026-06-15 |
| Complete deeper vendor dependency audit | Frontend Platform Owner (TBD) | 2026-06-30 |

