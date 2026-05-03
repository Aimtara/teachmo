# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - heading "This feature is currently disabled" [level=1] [ref=e4]
    - paragraph [ref=e5]:
      - text: It’s in migration/QA. Enable it in
      - code [ref=e6]: src/config/features.ts
      - text: when ready.
    - link "Go back to Dashboard" [active] [ref=e8] [cursor=pointer]:
      - /url: /dashboard
  - button "Open support widget" [ref=e10] [cursor=pointer]:
    - img [ref=e11]
  - region "Notifications alt+T"
  - region "Notifications (F8)":
    - list
  - generic [ref=e13]:
    - img [ref=e15]
    - button "Open Tanstack query devtools" [ref=e63] [cursor=pointer]:
      - img [ref=e64]
```