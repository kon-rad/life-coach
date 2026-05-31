// PM2 process config for the Soularc proxy API.
// Deployed to /var/www/soularc-proxy on the DigitalOcean box and fronted by
// nginx (api.soularc.xyz -> 127.0.0.1:3003). See ../CLAUDE.md for the runbook.
module.exports = {
  apps: [
    {
      name: 'soularc-proxy',
      script: 'dist/index.js',
      cwd: '/var/www/soularc-proxy',
      // fork (not cluster) so the node-cron scheduler runs as a single instance.
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
