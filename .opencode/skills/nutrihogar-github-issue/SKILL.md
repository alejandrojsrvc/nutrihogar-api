---
name: nutrihogar-github-issue
description: Use when implementing or continuing any GitHub issue in alejandrojsrvc/nutrihogar-api. Loads the repository workflow, architecture rules, validation limits, and pull request requirements from AGENTS.md.
---

# NutriHogar API Issue Workflow

Use this skill for every GitHub issue implemented in this repository.

## Required Instructions

Read `AGENTS.md` completely before running Git commands, planning, or editing files. Treat it as mandatory repository policy.

The required flow is:

1. Fetch the complete issue using `gh issue view`.
2. Inspect Git state and preserve unrelated changes.
3. Update local `main` with `git pull --ff-only origin main`.
4. Create an issue branch from updated `main`.
5. Read `doc/arquitecture.md`, affected code, tests, and relevant product documents.
6. Present a short plan mapped to acceptance criteria.
7. Implement only the issue scope and explicit dependencies.
8. Add or update tests and OpenAPI documentation as required.
9. Run only lint and tests. Never run build, application servers, Docker, migrations, seeds, deployments, or shared database operations.
10. Review the complete diff, commit only issue files, and push the branch.
11. Open a pull request against `main` with actual validation results and manual test instructions.
12. Stop after opening the PR. Never merge it or close the issue manually unless the user explicitly overrides this rule.

## Backend Architecture

Enforce the dependency rules in `doc/arquitecture.md`:

- Presentation calls application use cases.
- Domain and application remain independent from NestJS, Prisma, Supabase, HTTP, and external providers.
- Prisma is a persistence adapter, not the domain model.
- Business rules do not belong in controllers or repositories.
- HTTP DTOs, commands, results, domain models, and persistence models remain separate.
- Use explicit ports, adapters, mappers, and `UnitOfWork` only where the current issue needs them.
- Do not create speculative abstractions or implement future issues.

## Final Delivery

Return the PR URL, changed areas, lint and test results, commands the user must run for build/runtime verification, numbered manual test steps, and any residual risks. State explicitly that build and application startup were not executed.
