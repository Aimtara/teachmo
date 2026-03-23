# Matrix Tracker Automation Go-Live

This runbook is the operator sequence for taking the issue-pack + GitHub Project automation live.

## 1) Required configuration

1. Confirm `ops/issue-pack.yml` is current and includes:
   - `meta.project.owner`
   - `meta.project.number`
   - `meta.project.fields.status`
   - `meta.project.fields.priority`
   - `meta.project.fields.workstream`
   - `meta.global_labels` includes `in-progress` and `blocked`
2. Add repository (or org) secret: `PROJECT_AUTOMATION_TOKEN`.
3. Confirm the target GitHub Project v2 contains fields and options:
   - `Status`: `Todo`, `In Progress`, `Blocked`, `Done`
   - `Priority`: `P0`, `P1`, `P2`
   - `Workstream`

## 2) Local/CLI execution order

Export environment variables:

```bash
export GITHUB_REPOSITORY="<owner>/<repo>"
export PROJECT_AUTOMATION_TOKEN="<token>"
export GITHUB_TOKEN="$PROJECT_AUTOMATION_TOKEN"
```

Run the go-live sequence in one command (defaults to `DRY_RUN=true` and now validates project field shape first):

```bash
npm run issues:go-live
```

Or run each command directly:

```bash
npm run issues:validate
npm run issues:project-validate
npm run issues:bootstrap
npm run issues:project-sync
npm run issues:rollup
```

To execute against live GitHub resources, set:

```bash
export DRY_RUN=false
npm run issues:go-live
```

## 3) Status automation smoke test

Pick a child issue and run:

```bash
export ISSUE_NUMBER=<child_issue_number>
npm run issues:smoke-activity
```

The smoke script performs this exact loop on the issue:
- add `in-progress`
- add `blocked`
- close issue
- reopen issue

## 4) Exit criteria

System is live when:
- issue-pack validation passes
- parent + child issues exist
- rollup updates parent tracker
- issue-pack issues are on the configured GitHub Project
- project fields sync from YAML
- project status auto-updates from issue activity
- scheduled workflows are enabled and succeeding
- operational owners/runbook are assigned
