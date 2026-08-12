const path = require("node:path");

const appRoot = process.env.CAMPUS_FRONTEND_ROOT || "/data/prod_unikorn/front-end";
const appName = process.env.CAMPUS_FRONTEND_PM2_APP || "prod-unikorn-frontend";
const port = Number(process.env.CAMPUS_FRONTEND_PORT || "3000");
const releaseSha = process.env.CAMPUS_FRONTEND_RELEASE_SHA || "legacy";

if (!path.isAbsolute(appRoot) || appRoot === "/") {
  throw new Error("CAMPUS_FRONTEND_ROOT must be an absolute, non-root path");
}
if (!/^[A-Za-z0-9_-]+$/.test(appName)) {
  throw new Error("CAMPUS_FRONTEND_PM2_APP contains unsupported characters");
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("CAMPUS_FRONTEND_PORT is invalid");
}
if (releaseSha !== "legacy" && !/^[0-9a-f]{40}$/.test(releaseSha)) {
  throw new Error("CAMPUS_FRONTEND_RELEASE_SHA is invalid");
}

module.exports = {
  apps: [
    {
      name: appName,
      script: path.join(appRoot, "current", ".output/server/index.mjs"),
      cwd: path.join(appRoot, "current"),
      instances: "max",
      exec_mode: "cluster",
      env: {
        PORT: String(port),
        NITRO_PORT: String(port),
        NODE_ENV: "production",
        CAMPUS_FRONTEND_RELEASE_SHA: releaseSha,
        HOST: "0.0.0.0",
        NITRO_HOST: "0.0.0.0",
        NUXT_HOST: "0.0.0.0",
      },
      error_file: "/var/unikorn/prod_log/pm2-error.log",
      out_file: "/var/unikorn/prod_log/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "1G",
      kill_timeout: 5000,
      listen_timeout: 3000,
      health_check: {
        interval: 30000,
        path: "/health",
        port,
      },
    },
  ],
};
