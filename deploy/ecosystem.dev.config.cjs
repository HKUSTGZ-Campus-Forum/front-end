const path = require("node:path");

const appRoot = process.env.CAMPUS_FRONTEND_ROOT || "/data/dev_unikorn/front-end";
const appName = process.env.CAMPUS_FRONTEND_PM2_APP || "unikorn-dev";
const port = Number(process.env.CAMPUS_FRONTEND_PORT || "3001");

if (!path.isAbsolute(appRoot) || appRoot === "/") {
  throw new Error("CAMPUS_FRONTEND_ROOT must be an absolute, non-root path");
}
if (!/^[A-Za-z0-9_-]+$/.test(appName)) {
  throw new Error("CAMPUS_FRONTEND_PM2_APP contains unsupported characters");
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("CAMPUS_FRONTEND_PORT is invalid");
}

module.exports = {
  apps: [
    {
      name: appName,
      script: ".output/server/index.mjs",
      cwd: path.join(appRoot, "current"),
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        NITRO_HOST: "127.0.0.1",
        NITRO_PORT: String(port),
        NUXT_HOST: "127.0.0.1",
        PORT: String(port),
      },
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "1G",
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
