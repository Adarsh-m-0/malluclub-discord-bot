module.exports = {
  apps: [{
    name: 'malluclub-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Restart delay in milliseconds
    restart_delay: 1000,
    // Maximum number of unstable restarts
    max_restarts: 10,
    // Minimum uptime before considering unstable
    min_uptime: '10s',
    // Kill timeout in milliseconds  
    kill_timeout: 5000
  }]
};
