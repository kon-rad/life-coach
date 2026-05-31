module.exports = {
  apps: [{
    name: 'soularc-landing',
    script: 'node_modules/.bin/next',
    args: 'start -p 3002',
    cwd: '/var/www/soularc-landing',
    env: {
      NODE_ENV: 'production',
      DB_DIR: '/var/www/soularc-landing/data',
    },
    restart_delay: 3000,
    max_restarts: 10,
  }],
};
