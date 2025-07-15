#!/bin/bash

# Contabo Server Initial Setup Script for MalluClub Bot
# Run this script on your fresh Contabo server

echo "🚀 Setting up MalluClub Bot on Contabo Server"
echo "=============================================="

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y
apt install curl wget git nano htop jq -y

# Install Node.js 18.x LTS
echo "🟢 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Verify Node.js installation
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install PM2
echo "🔄 Installing PM2..."
npm install -g pm2

# Create bot directory
echo "📁 Creating bot directory..."
mkdir -p /opt/malluclub-bot
mkdir -p /opt/malluclub-bot/logs

# Clone repository
echo "📥 Cloning repository..."
cd /opt
git clone https://github.com/Adarsh-m-0/malluclub-discord-bot.git temp-clone
cp -r temp-clone/* malluclub-bot/
rm -rf temp-clone

cd /opt/malluclub-bot

# Install dependencies
echo "📦 Installing bot dependencies..."
npm install --production

# Create .env file template
echo "📝 Creating .env template..."
if [ ! -f ".env" ]; then
    cat > .env << 'EOL'
# MalluClub Discord Bot Environment Variables
# Fill in your actual values

# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_application_id_here
GUILD_ID=your_server_id_here

# MongoDB Configuration
MONGODB_URI=your_mongodb_atlas_connection_string_here

# Channel Configuration (Optional)
WELCOME_CHANNEL_ID=your_welcome_channel_id_here
LOG_CHANNEL_ID=your_log_channel_id_here
AUTO_ROLE_ID=your_auto_role_id_here

# Environment
NODE_ENV=production
EOL
    echo "⚠️ IMPORTANT: Please edit /opt/malluclub-bot/.env with your actual values!"
else
    echo "✅ .env file already exists"
fi

# Set proper permissions
echo "🔒 Setting permissions..."
chown -R root:root /opt/malluclub-bot
chmod +x /opt/malluclub-bot/health-check.sh

# Setup PM2 startup
echo "🚀 Setting up PM2 startup..."
pm2 startup
echo "💡 Run the command above if you want PM2 to start on boot"

# Create systemd service for additional reliability
echo "🔧 Creating systemd service..."
cat > /etc/systemd/system/malluclub-bot.service << 'EOL'
[Unit]
Description=MalluClub Discord Bot
After=network.target

[Service]
Type=forking
User=root
WorkingDirectory=/opt/malluclub-bot
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload all
ExecStop=/usr/bin/pm2 kill
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOL

systemctl enable malluclub-bot.service

echo ""
echo "✅ Server setup completed!"
echo ""
echo "🔧 Next steps:"
echo "1. Edit the .env file: nano /opt/malluclub-bot/.env"
echo "2. Deploy commands: cd /opt/malluclub-bot && node deploy-commands-new.js"
echo "3. Start the bot: pm2 start ecosystem.config.js"
echo "4. Check status: pm2 status"
echo "5. View logs: pm2 logs malluclub-bot"
echo "6. Run health check: ./health-check.sh"
echo ""
echo "📋 GitHub Secrets needed for auto-deployment:"
echo "   CONTABO_HOST: your-server-ip"
echo "   CONTABO_USERNAME: root"
echo "   CONTABO_SSH_KEY: your-private-ssh-key"
echo ""
