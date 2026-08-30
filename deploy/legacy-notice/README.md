# Legacy axfff migration notice / 旧域名迁移提示页

`index.html` is the standalone page served by `https://unikorn.axfff.com/`.
It preserves the school HTTPS link and the 10-second redirect, without the
obsolete Chinese or English campus-network / VPN restriction.

这是旧域名的独立提示页，不是学校正式产品的 Nuxt 发布入口。
本次仅删除中英文校园网限制说明及专用样式，保留跳转功能。

The old host runs a dedicated notice server behind the existing Nginx proxy.
The server reads HTML at startup, so both `prod-unikorn-frontend` PM2 workers
must reload after changing the release. No Nginx, database, school server,
dev frontend, or CoursePlan changes are required.

`deploy.py` is a one-time, hash-pinned updater for this change. It verifies
the previous release and worker configuration, creates a separate release,
atomically switches `current`, reloads only the notice workers, verifies
the complete response body, and restores the previous notice on failure.
It does not change the PM2 configuration or permissions.

- Previous release / 回滚版本: `/data/prod_unikorn/front-end/releases/legacy-notice-20260823T162500Z`
- Updated release / 更新版本: `/data/prod_unikorn/front-end/releases/legacy-notice-20260830T182300Z`

The previous release remains intact. To roll back, atomically restore the
`/data/prod_unikorn/front-end/current` symlink to the previous release and
run `pm2 reload prod-unikorn-frontend` as the existing deployment user.
Do not run the old full production workflow or restart CoursePlan.

Validation: browser inspection at 1440px, 390px, and 320px; no horizontal
overflow; both restriction notices absent; actual 10-second navigation to
the school site verified. The temporary localhost:3000 server was stopped.

Published on 2026-08-31 (Asia/Shanghai), with public response bytes matching
the checked-in HTML and desktop/mobile redirect checks passing:
[deployment record](https://github.com/HKUSTGZ-Campus-Forum/front-end/actions/runs/33327910918).
After this publication, the one-time workflow was changed to manual-only
so later branch pushes cannot publish another update automatically.
