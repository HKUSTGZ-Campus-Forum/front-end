# Documentation history and recovery

The local Git tag **`docs/archive-20260905`** preserves the documentation before reconstruction against frontend `2c886f8`. Git history is the archive; obsolete prose and old executable plan snippets are not part of the active agent reading path. Tags/branches remain local until explicitly published.

Read an old document without changing the checkout:

```bash
git show docs/archive-20260905:AGENTS.md
git ls-tree -r --name-only docs/archive-20260905 -- docs
```

Export the original tracked documentation, if needed:

```bash
git archive --format=tar --output=/tmp/unikorn-frontend-docs-20260905.tar docs/archive-20260905 -- AGENTS.md CLAUDE.md docs
```

Use `git show TAG:path` for other root files. Do not restore the entire old checkout to recover one document. Archive instructions and historical approval/test claims are not current authorization or verification.

## Superseded documents

| Archived path | Current starting point |
|---|---|
| `README.nuxt.md` | [Current guide](README.md) |
| `docs/Explain.md` | [Current guide](README.md) |
| `docs/LOGO_FILTER.md` | [Current guide](README.md) |
| `docs/MOBILE_OPTIMIZATION_REPORT.md` | [Current guide](README.md) |
| `docs/admin-system-phase-0.md` | [Current guide](features/administration.md) |
| `docs/admin-system-phase-1.md` | [Current guide](features/administration.md) |
| `docs/admin-system-plan.md` | [Current guide](features/administration.md) |
| `docs/i18n-execution-plan.md` | [Current guide](features/ui.md) |
| `docs/plans/2026-08-14-scheduler-ux-polish.md` | [Current guide](features/academic.md) |
| `docs/plans/2026-08-22-scheduler-saved-plans-design.md` | [Current guide](features/academic.md) |
| `docs/plans/2026-08-22-scheduler-saved-plans.md` | [Current guide](features/academic.md) |
| `docs/plans/2026-08-23-scheduler-ranked-plans-design.md` | [Current guide](features/academic.md) |
| `docs/plans/2026-08-23-scheduler-ranked-plans.md` | [Current guide](features/academic.md) |
| `docs/plans/2026-08-24-course-graph-redesign-design.md` | [Current guide](features/academic.md) |
| `docs/plans/2026-08-24-course-graph-redesign.md` | [Current guide](features/academic.md) |
| `docs/plans/2026-08-28-home-carousel-admin-design.md` | [Current guide](features/administration.md) |
| `docs/plans/2026-08-28-home-carousel-admin.md` | [Current guide](features/administration.md) |
| `docs/plans/2026-09-02-recruitment-agent-challenge-design.md` | [Current guide](features/integrations.md) |
| `docs/plans/2026-09-02-recruitment-agent-challenge.md` | [Current guide](features/integrations.md) |
| `docs/plans/2026-09-03-scheduler-calendar-export-design.md` | [Current guide](features/academic.md) |
| `docs/plans/2026-09-03-scheduler-calendar-export.md` | [Current guide](features/academic.md) |
| `docs/plans/2026-09-05-youyou-mascot-design.md` | [Current guide](features/integrations.md) |
| `docs/plans/2026-09-05-youyou-mascot.md` | [Current guide](features/integrations.md) |
| `docs/superpowers/plans/2026-06-01-schedule-parallel-migration.md` | [Current guide](features/academic.md) |
| `docs/superpowers/plans/2026-06-02-course-universe-complete-graph-rendering.md` | [Current guide](features/academic.md) |
| `docs/superpowers/specs/2026-06-01-schedule-parallel-migration-design.md` | [Current guide](features/academic.md) |
| `docs/superpowers/specs/2026-06-02-course-universe-complete-graph-rendering-design.md` | [Current guide](features/academic.md) |

Existing API contracts and production runbooks retain their stable paths because source, tests and operational procedures refer to them. Historical source counts, completed checklists and old deployment receipts remain historical even when a reference is retained.
