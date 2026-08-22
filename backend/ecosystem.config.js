require('dotenv').config();

const appName = process.env.PM2_APP_NAME || 'whatsapp-worker-times';

module.exports = {
  apps: [
    {
      name: 'Times-ERP-backend',
      script: 'index.js',
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: appName,
      script: 'workers/whatsappWorker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: `logs/${appName}-error.log`,
      out_file: `logs/${appName}-out.log`,
      log_date_format: "YYYY-MM-DD HH:mm Z",
      merge_logs: true,
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
