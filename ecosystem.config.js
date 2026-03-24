module.exports = {
  apps: [
    {
      name: 'cortex-backend',
      cwd: '/Users/atlasbuilds/clawd/cortex-capital',
      script: 'npx',
      args: 'tsx server.ts',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        ENABLE_SCHEDULER: 'true',
        ENABLE_DISCUSSIONS: 'true',
        DATABASE_URL: 'postgresql://cortex_capital_user:0IuRjWY7G7JwMmqak0x1m3VC5xqssYe1@dpg-d6vcdsqa214c7387nuu0-a.oregon-postgres.render.com/cortex_capital'
      },
      autorestart: true,
      max_memory_restart: '500M'
    },
    {
      name: 'cortex-fishtank',
      cwd: '/Users/atlasbuilds/clawd/cortex-fishtank',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        NEXT_PUBLIC_CORTEX_API: 'http://localhost:3001',
        NEXT_PUBLIC_REFRESH_INTERVAL: 5000
      },
      autorestart: true,
      max_memory_restart: '500M'
    }
  ]
};
