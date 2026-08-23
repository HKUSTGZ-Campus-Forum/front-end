# UniKorn environment and production boundary

This document is the frontend-facing environment reference. The executable
school-host runbook lives in the backend repository at
[`deploy/school/README.md`](https://github.com/HKUSTGZ-Campus-Forum/back-end/blob/main/deploy/school/README.md).

## Environment map

| Environment | URL | Purpose | Release path |
|---|---|---|---|
| Local frontend | `http://localhost:3000` | UI development | `npm run dev`; API defaults to local `http://localhost:8000` |
| Shared development | `https://dev.unikorn.axfff.com` | Integrated testing | frontend and backend `main` GitHub Actions |
| Active production | `https://unikorn.hkust-gz.edu.cn` | User-facing UniKorn | backend `school-production` paired-SHA manifest |
| Independent CoursePlan | `https://scheduler.unikorn.hkust-gz.edu.cn` | School scheduler | separate service on the same host |
| Former axfff production | `https://unikorn.axfff.com` | Preserved migration-era stack | not the current production target |

The frontend repository still contains a manually dispatched legacy workflow
for the former axfff host. A push to its `production` branch no longer deploys.
Do not run or describe that workflow as a release to active school production.

## Frontend production contract

- Production builds use same-origin browser API paths (`/api/...`).
- Server-side rendering uses the private Nginx bridge at
  `http://127.0.0.1:8081`.
- `NUXT_PUBLIC_API_BASE_URL` is empty in the school production build; do not
  hardcode an environment hostname in product code.
- `NUXT_PUBLIC_APP_BUILD_VERSION` must be the full frontend commit SHA and the
  `/health` response must expose that exact value.
- The frontend listens on `127.0.0.1:3000` under
  `unikorn-frontend.service`; it must not bind publicly.

## Authentication contract

- HKUST(GZ) OIDC SSO is the only end-user login method.
- Password login, self-registration, recovery and password-change UI must not
  be restored.
- The production status endpoint is
  `https://unikorn.hkust-gz.edu.cn/api/auth/oidc/status` and must report
  `enabled: true`, `flow: authorization_code_pkce` and `provider: HKUST(GZ)`.
- Only SSO-created users require first-login profile confirmation. Existing
  accounts and verified accounts linked for the first time remain complete.

## Release and verification

After local and shared-development verification, merge the reviewed frontend
and backend changes to each repository's `main`. Record both exact full SHAs,
then update the only mutable file on the backend repository's
`school-production` control branch:

```bash
python tools/update_school_production_release.py \
  --backend-sha FULL_BACKEND_SHA \
  --frontend-sha FULL_FRONTEND_SHA
git add deploy/school/school-production-release.json
git commit -m "release: deploy paired school production SHAs"
git push origin school-production
```

The GitHub validation workflow checks that both commits come from their `main`
branches and reruns backend/frontend tests and the production frontend build.
The school-host timer deploys only the successful paired manifest, builds one
immutable joint release, takes a verified database backup, applies Alembic,
atomically switches `/srv/unikorn/current`, preserves `previous`, restarts both
applications and checks the exact frontend SHA plus public health. Version
downgrades and unapproved `migrations/` or `app/data/` changes are blocked. Run
`activate-nginx.sh` only when reviewed Nginx templates changed or an explicit
migration gate must be removed.

At minimum verify:

```bash
curl -fsS https://unikorn.hkust-gz.edu.cn/health
curl -fsS https://unikorn.hkust-gz.edu.cn/api/healthz
curl -fsS https://unikorn.hkust-gz.edu.cn/api/auth/oidc/status
```

Also exercise any new write route through the public hostname. An unauthenticated
protected route should reach Flask and return JSON `401`; an Nginx HTML `503`
usually means a write gate or proxy rule still blocks the route. Confirm the
independent `courseplan.service` remains healthy after every release.

Do not record a mutable "current production SHA" in this file. Inspect
`/srv/unikorn/current/release.json`, `/health`, and both repositories' current
`origin/main` whenever exact deployed versions matter.

Last reconciled: 2026-08-23.
