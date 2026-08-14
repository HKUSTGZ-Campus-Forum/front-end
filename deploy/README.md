# Atomic frontend releases

The development and production deployment workflows upload each Nuxt build to a unique
`.incoming/<git-sha>-<run-id>-<attempt>` directory. `atomic-release.sh` verifies
the complete file manifest, serializes cutovers with a no-follow, close-on-exec
lock holder, moves the staged directory into `releases/`, and atomically
switches the `current` symlink.

PM2 always starts `current/.output/server/index.mjs`. Development uses one fork
process on port 3001; production preserves its historical `max` cluster on port
3000 and public bind address, and writes through the deployment-owned
`/var/unikorn/prod_pm2_log` paths managed by the PM2 logrotate policy. A deployment
succeeds only when every PM2 process reports the immutable Git SHA and repeated
`/health` probes identify that same SHA. Production also requires the public
HTTPS health endpoint to report that SHA. Before the rollback window closes,
`verify-public-assets.sh` extracts every Nuxt JavaScript and CSS reference from
the public root and localized planner pages and compares each response byte for
byte with the candidate release. HTML success with missing, stale, or
mismatched assets therefore triggers rollback. If reload or validation fails,
the controller restores the previous symlink and
restarts from that previous release's own validated PM2 config. The first
cutover preserves the historical top-level `.output` via
`releases/legacy-in-place` and freezes its validated PM2 config alongside the
release metadata, so migrating to this layout does not delete or reinterpret
the existing deployment.

The host Nginx static locations must follow the atomic `current` symlink, never
the preserved top-level legacy `.output`. The reviewed contract is stored at
`deploy/nginx/prod-unikorn-static-locations.conf`; production preflight rejects
a legacy root before uploading a release. Installing or changing the root-owned
host vhost remains an explicit operator action: back it up, verify that the
Nginx worker can traverse the target, run privileged `nginx -t`, gracefully
reload, and verify public asset bytes. Do not replace the legacy `.output`
directory because it is the first-cutover rollback anchor.

The controller is parameterized by application root, release ID, expected SHA,
PM2 application name, port, retention count, and a validated PM2 config path.

The workflow uses the GitHub runner's built-in OpenSSH client for both transfer
and activation, so deployment does not depend on downloading helper binaries at
runtime. `ssh_known_hosts` pins the server's Ed25519 host key; `HostKeyAlias`
keeps that verification stable when the connection address is stored in a
GitHub secret. Rotate the checked-in key only after verifying a planned host-key
change through an independent trusted channel.
