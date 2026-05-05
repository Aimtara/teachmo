# Container and Dependency Security Scanning

Teachmo uses layered security automation so dependency, source, filesystem, and
container-image findings are visible before production rollout.

## Workflows

| Workflow | Scope | Trigger |
| --- | --- | --- |
| `dependency-security.yml` | npm audit policy and GitHub dependency review | PRs touching dependency manifests, pushes to `main`, daily schedule |
| `codeql.yml` | JavaScript/TypeScript static analysis | PRs, pushes to `main`, weekly schedule |
| `container-security.yml` | Trivy filesystem and Docker image vulnerability scans | PRs touching Docker/dependency files, pushes to `main`, weekly schedule |

## Trivy policy

`container-security.yml` runs three scans:

1. Repository filesystem scan.
2. Frontend image scan from the root `Dockerfile`.
3. Backend image scan from `backend/Dockerfile`.

The scans report `HIGH` and `CRITICAL` vulnerabilities and upload SARIF to
GitHub code scanning. Image scans use placeholder non-secret Vite build args so
the frontend production Dockerfile can be built without exposing environment
secrets.

## Blocking policy

Start with the workflow as advisory until initial SARIF baselines are reviewed.
After false positives are triaged, make high/critical Trivy and CodeQL checks
required in branch protection.

Do not ignore findings silently. If an exception is required, document:

- package/image layer,
- CVE or rule ID,
- reason the finding is not exploitable,
- expiration or review date,
- owner responsible for remediation.

## Local verification

Install Trivy locally or run the same scans through GitHub Actions. Docker image
build validation can be reproduced with:

```bash
docker build \
  --build-arg VITE_NHOST_BACKEND_URL=https://placeholder.local \
  --build-arg VITE_NHOST_SUBDOMAIN=placeholder \
  --build-arg VITE_NHOST_REGION=local \
  -t teachmo-web:scan .

docker build -t teachmo-backend:scan backend
```
