# Frontend development

Sources: [package scripts](../package.json), [Nuxt config](../nuxt.config.ts), [CI](../.github/workflows/frontend-ci.yml), [environment example](../.env.example).

CI uses Node 22.23.2 and npm. `package.json` also declares pnpm and the repository has both npm/pnpm locks; preserve both when changing dependencies. Read the workflow for future version changes. The school runtime is separately pinned; a local runtime version does not establish production compatibility.

For a requested fresh setup:

```bash
npm ci
npm run dev
```

The dev server uses `http://localhost:3000`, HMR port 3001. Do not install dependencies if the task only edits documentation.

## Choose the API target

Local Nuxt defaults `NUXT_PUBLIC_API_BASE_URL` to `http://localhost:8000`. Browser `/api/*` requests use the development proxy; its target includes `/api`. The backend `python run.py` entry point listens on port 8000 and strips `/api` through `ApiPrefixMiddleware`, so this default works with that entry point. An arbitrary Flask/WSGI launch may not include that middleware; check its proxy arrangement. Shared dev already exposes `/api`:

```bash
NUXT_PUBLIC_API_BASE_URL=https://dev.unikorn.axfff.com npm run dev
```

Choose this only when integration with shared dev is intended; writes affect that environment. Server-side calls select `NUXT_API_INTERNAL_BASE_URL` before the public base. See [API/auth](features/auth-api.md) for URL construction. Do not put provider or OIDC secrets in `NUXT_PUBLIC_*` variables.

## Build and preview

```bash
npm run build
npm run preview
```

Nuxt emits `.output/server/index.mjs`. A build is not a deployment. Build identity is derived in `nuxt.config.ts` from `NUXT_PUBLIC_APP_BUILD_VERSION`, available commit environment variables, then the package version. The health route exposes it for release checks.

Admin pages disable SSR in route rules; browser-only viewers, charts, assistant and mascot use client boundaries. Theme initialization and persisted auth have hydration requirements: use the existing composables/plugins instead of reading browser state at server module import time.

See [testing](testing.md) for application gates, and [production boundaries](production-environment.md) before changing deployment or public/SSR API topology.
