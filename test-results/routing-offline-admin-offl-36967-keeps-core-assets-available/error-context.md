# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - paragraph [ref=e6]: Teachmo
      - heading "Welcome back" [level=1] [ref=e7]
      - paragraph [ref=e8]: Sign in with your district or social account to continue.
    - generic [ref=e9]:
      - paragraph [ref=e10]: Select parent/guardian or school/district sign in to continue with the correct onboarding flow.
      - link "Continue to sign in" [ref=e11] [cursor=pointer]:
        - /url: /login
      - paragraph [ref=e12]: By signing in you agree to the Teachmo privacy policy and acceptable use guidelines.
      - generic [ref=e13]:
        - text: Don't have an account?
        - link "Start parent sign up" [ref=e14] [cursor=pointer]:
          - /url: /login?flow=parent
  - button "Open support widget" [ref=e16] [cursor=pointer]:
    - img [ref=e17]
  - region "Notifications alt+T"
  - region "Notifications (F8)":
    - list
  - generic [ref=e19]:
    - img [ref=e21]
    - button "Open Tanstack query devtools" [ref=e69] [cursor=pointer]:
      - img [ref=e70]
```