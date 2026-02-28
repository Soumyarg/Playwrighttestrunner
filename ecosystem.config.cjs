module.exports = {
  apps: [
    {
      name: 'playwright-runner-ui',
      script: 'npx',
      args: 'serve build -l 3000 -s',
      cwd: '/home/user/webapp',
      env: { NODE_ENV: 'production' },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'playwright-service',
      script: 'server.js',
      cwd: '/home/user/webapp/playwright-service',
      env: { NODE_ENV: 'production', PORT: 8080 },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};
