# Atomic frontend releases

The development deployment workflow uploads each Nuxt build to a unique
`.incoming/<git-sha>-<run-id>-<attempt>` directory. `atomic-release.sh` verifies
the complete file manifest, serializes cutovers with `flock`, moves the staged
directory into `releases/`, and atomically switches the `current` symlink.

PM2 always starts `current/.output/server/index.mjs`. A deployment succeeds only
when port 3001 `/health` identifies the exact Git SHA that triggered the run. If
reload or validation fails, the controller restores the previous symlink and
reloads it. The first cutover preserves the historical top-level `.output` via
`releases/legacy-in-place`, so migrating to this layout does not delete the
existing deployment.

The controller is parameterized by application root, release ID, expected SHA,
PM2 application name, port, and retention count. Production can adopt the same
controller with a production-specific PM2 config after its workflow is migrated.
