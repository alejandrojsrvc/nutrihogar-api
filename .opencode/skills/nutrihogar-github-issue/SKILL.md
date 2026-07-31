---
name: nutrihogar-github-issue
description: Use when implementing or continuing one or more GitHub issues in alejandrojsrvc/nutrihogar-api. Applies the repository-only workflow, targeted validation, per-issue commits, and PR closure rules.
---

# NutriHogar API Issues

Work only in this repository and follow `AGENTS.md`; do not inspect or modify the web repository.

## Workflow

1. Fetch every requested issue as readable Markdown with `gh issue view <number> --repo alejandrojsrvc/nutrihogar-api` and confirm it is open. Do not request JSON or create temporary files.
2. Inspect Git once and preserve unrelated changes.
3. Run `git fetch origin main`, then create one branch for the whole request directly from `origin/main`. Do not switch to or pull local `main`.
4. Read affected code and tests. Read architecture, sprint, or PDR only when needed to resolve ambiguity.
5. Present at most five plan points and implement only the requested scope.
6. Create or update meaningful unit and integration tests for acceptance criteria, observable behavior, errors, and invariants. Never add trivial tests or weaken existing coverage.
7. After all changes, run lint and targeted tests once. Run integration or e2e only when they terminate in process and require no external service.
8. Create one conventional commit for the whole request, then push once.
9. Open one PR against `main` with a section per issue, actual local validation, pending GitHub checks, and `Closes #N` for every fully completed issue.
10. Return the PR URL without waiting for CI. Never merge or close issues manually.

Do not invent commands. Only use scripts confirmed in `package.json`. Never run build, servers, Docker, migrations, seeds, deployments, shared databases, destructive Git commands, or force push.
