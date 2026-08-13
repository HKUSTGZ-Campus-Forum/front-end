# Atomic frontend releases

The development and production deployment workflows upload each Nuxt build to a unique
`.incoming/<git-sha>-<run-id>-<attempt>` directory. `atomic-release.sh` verifies
the complete file manifest, serializes cutovers with a no-follow, close-on-exec
lock holder, moves the staged directory into `releases/`, and atomically
switches the `current` symlink.

PM2 always starts `current/.output/server/index.mjs`. Development uses one fork
process on port 3001; production preserves its historical `max` cluster on port
3000, public bind address, and `/var/unikorn/prod_log` paths. A deployment
succeeds only when every PM2 process reports the immutable Git SHA and repeated
`/health` probes identify that same SHA. Production also requires the public
HTTPS health endpoint to report that SHA and its root and planner routes to be
reachable before the rollback window closes. If reload or validation fails,
the controller restores the previous symlink and
restarts from that previous release's own validated PM2 config. The first
cutover preserves the historical top-level `.output` via
`releases/legacy-in-place` and freezes its validated PM2 config alongside the
release metadata, so migrating to this layout does not delete or reinterpret
the existing deployment.

The controller is parameterized by application root, release ID, expected SHA,
PM2 application name, port, retention count, and a validated PM2 config path.

The workflow uses the GitHub runner's built-in OpenSSH client for both transfer
and activation, so deployment does not depend on downloading helper binaries at
runtime. `ssh_known_hosts` pins the server's Ed25519 host key; `HostKeyAlias`
keeps that verification stable when the connection address is stored in a
GitHub secret. Rotate the checked-in key only after verifying a planned host-key
change through an independent trusted channel.
