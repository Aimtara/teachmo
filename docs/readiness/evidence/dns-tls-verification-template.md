# DNS/TLS Verification Evidence Template

Status: `[ ] pending`

## Scope
- Environment: staging / production
- Domains checked:

## Required checks
1. DNS A/AAAA/CNAME records point to approved deploy target.
2. HTTPS certificate is valid, trusted, unexpired, and covers all hostnames.
3. HTTP redirects to HTTPS.
4. HSTS is enabled where approved.
5. Auth callback and app domains match Nhost/deploy allowlists.

## Evidence
- `dig`/DNS dashboard output:
- SSL Labs or equivalent result:
- Browser screenshot:
- Owner:
- Date:
