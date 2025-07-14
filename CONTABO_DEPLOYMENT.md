# 🚀 Contabo Server Deployment Guide

This guide will walk you through deploying your MalluClub Discord Bot on a Contabo VPS server.

## 📋 Prerequisites

### Contabo VPS Requirements
- **Minimum Specs:** 2 vCPU, 4GB RAM, 50GB SSD
- **Recommended:** 4 vCPU, 8GB RAM, 100GB SSD
- **OS:** Ubuntu 20.04/22.04 LTS (recommended)

### What You'll Need
- Contabo VPS server
- Domain name (optional, for monitoring dashboard)
- Discord Bot Token
- MongoDB Atlas connection string

## 🖥️ Step 1: Server Setup

### Connect to Your Contabo Server
```bash
ssh root@your-server-ip
```

### Update System
```bash
apt update && apt upgrade -y
apt install curl wget git nano htop -y
```

### Install Node.js (Latest LTS)
```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### Install Nginx (for reverse proxy)
```bash
apt install nginx -y
systemctl enable nginx
systemctl start nginx
```

## 📦 Step 2: Deploy Bot Code

### Clone Your Repository
```bash
cd /opt
git clone https://github.com/Adarsh-m-0/malluclub-discord-bot.git
cd malluclub-discord-bot
```

### Install Dependencies
```bash
npm install --production
```

### Create Environment File
```bash
cp .env.example .env
nano .env
```

Configure your environment variables:
```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_application_id_here
GUILD_ID=your_server_id_here

# Database Configuration
MONGODB_URI=your_mongodb_atlas_connection_string

# Production Configuration
NODE_ENV=production
PORT=3000

# Logging
LOG_LEVEL=info
```

## 🔧 Step 3: Production Configuration

### Create PM2 Ecosystem File
```bash
nano ecosystem.config.js
```

Add the following configuration:
```javascript
module.exports = {
  apps: [{
    name: 'malluclub-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

### Create Logs Directory
```bash
mkdir logs
```

### Deploy Slash Commands
```bash
node deploy-commands.js
```

## 🚀 Step 4: Start the Bot

### Start with PM2
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Check Bot Status
```bash
pm2 status
pm2 logs malluclub-bot
```

## 🔒 Step 5: Security & Firewall

### Configure UFW Firewall
```bash
ufw enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw status
```

### Create Bot User (Security Best Practice)
```bash
adduser botuser
usermod -aG sudo botuser
chown -R botuser:botuser /opt/malluclub-discord-bot
```

### Run Bot as Non-Root User
```bash
su - botuser
cd /opt/malluclub-discord-bot
pm2 start ecosystem.config.js --env production
```

## 📊 Step 6: Monitoring Setup

### Install System Monitoring
```bash
pm2 install pm2-server-monit
```

### Create Health Check Endpoint
```bash
nano health-check.js
```

Add health check script:
```javascript
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV
    });
});

app.listen(port, () => {
    console.log(`Health check server running on port ${port}`);
});
```

### Configure Nginx Reverse Proxy
```bash
nano /etc/nginx/sites-available/malluclub-bot
```

Add Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    location /health {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/malluclub-bot /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 🔄 Step 7: Automated Deployment

### Create Update Script
```bash
nano update-bot.sh
```

Add update script:
```bash
#!/bin/bash
echo "🔄 Updating MalluClub Discord Bot..."

# Navigate to bot directory
cd /opt/malluclub-discord-bot

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install --production

# Restart the bot
pm2 restart malluclub-bot

# Deploy any new slash commands
node deploy-commands.js

echo "✅ Bot updated successfully!"
pm2 status
```

Make it executable:
```bash
chmod +x update-bot.sh
```

## 📋 Step 8: Backup Strategy

### Create Backup Script
```bash
nano backup-bot.sh
```

Add backup script:
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BOT_DIR="/opt/malluclub-discord-bot"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
tar -czf $BACKUP_DIR/malluclub-bot-$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='.git' \
    $BOT_DIR

# Keep only last 7 backups
find $BACKUP_DIR -name "malluclub-bot-*.tar.gz" -mtime +7 -delete

echo "✅ Backup created: malluclub-bot-$DATE.tar.gz"
```

### Schedule Daily Backups
```bash
crontab -e
```

Add cron job:
```bash
# Daily backup at 2 AM
0 2 * * * /opt/malluclub-discord-bot/backup-bot.sh
```

## 🔍 Step 9: Monitoring & Logs

### View Real-time Logs
```bash
pm2 logs malluclub-bot --lines 100
```

### Monitor System Resources
```bash
htop
pm2 monit
```

### Log Rotation Setup
```bash
nano /etc/logrotate.d/malluclub-bot
```

Add log rotation config:
```
/opt/malluclub-discord-bot/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 644 botuser botuser
    postrotate
        pm2 reloadLogs
    endscript
}
```

## 🚨 Step 10: Troubleshooting

### Common Issues & Solutions

#### Bot Won't Start
```bash
# Check logs
pm2 logs malluclub-bot

# Check environment variables
pm2 env 0

# Restart bot
pm2 restart malluclub-bot
```

#### Memory Issues
```bash
# Check memory usage
free -h
pm2 show malluclub-bot

# Restart if memory leak
pm2 restart malluclub-bot
```

#### Database Connection Issues
```bash
# Test MongoDB connection
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ DB Connected'))
.catch(err => console.error('❌ DB Error:', err));
"
```

## 📱 Step 11: SSL Certificate (Optional)

### Install Certbot
```bash
apt install certbot python3-certbot-nginx -y
```

### Get SSL Certificate
```bash
certbot --nginx -d your-domain.com
```

## 🔔 Step 12: Alerts & Notifications

### Discord Webhook for Server Alerts
Create a webhook monitoring script:
```bash
nano monitor-bot.sh
```

Add monitoring script:
```bash
#!/bin/bash
WEBHOOK_URL="your-discord-webhook-url"
BOT_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="malluclub-bot") | .pm2_env.status')

if [ "$BOT_STATUS" != "online" ]; then
    curl -H "Content-Type: application/json" \
         -d "{\"content\":\"🚨 **Alert**: MalluClub Bot is $BOT_STATUS on server!\"}" \
         $WEBHOOK_URL
fi
```

Schedule monitoring:
```bash
# Check every 5 minutes
*/5 * * * * /opt/malluclub-discord-bot/monitor-bot.sh
```

## ✅ Deployment Checklist

- [ ] Server provisioned and configured
- [ ] Node.js and dependencies installed
- [ ] Bot code deployed and configured
- [ ] Environment variables set
- [ ] Slash commands deployed
- [ ] PM2 process manager configured
- [ ] Security and firewall configured
- [ ] Monitoring and logging set up
- [ ] Backup strategy implemented
- [ ] SSL certificate installed (if applicable)
- [ ] Bot tested and running

## 📞 Support Commands

### Useful Management Commands
```bash
# Bot status
pm2 status

# View logs
pm2 logs malluclub-bot

# Restart bot
pm2 restart malluclub-bot

# Update bot
./update-bot.sh

# System resources
htop

# Disk usage
df -h

# Network status
netstat -tulpn
```

Your MalluClub Discord Bot is now ready for production hosting on Contabo! 🎉
