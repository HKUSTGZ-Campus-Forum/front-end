module.exports = {
  apps: [
    {
      name: 'prod-unikorn-frontend',
      script: '.output/server/index.mjs',
      cwd: '/data/prod_unikorn/front-end',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        PORT: 3000,
        NODE_ENV: 'production',
        NUXT_HOST: '0.0.0.0',
      },
      error_file: '/var/unikorn/prod_log/pm2-error.log',
      out_file: '/var/unikorn/prod_log/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      // Health check
      health_check: {
        interval: 30000,
        path: '/health',
        port: 3000,
      },
    },
  ],
};
