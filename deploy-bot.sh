#!/bin/bash

# 🚀 MalluClub Discord Bot - Application Deployment Script
# Run this script as botuser after server setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as botuser
if [ "$USER" != "botuser" ]; then
    print_error "Please run this script as botuser"
    exit 1
fi

cd /opt/malluclub-bot

print_status "Cloning MalluClub Discord Bot repository..."
git clone https://github.com/Adarsh-m-0/malluclub-discord-bot.git .

print_status "Installing production dependencies..."
npm install --production

print_status "Creating environment file..."
cp .env.example .env

print_status "Creating logs directory..."
mkdir -p logs

print_status "Creating PM2 ecosystem configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'malluclub-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm Z'
  }]
}
EOF

print_status "Creating startup script..."
cat > start-bot.sh << 'EOF'
#!/bin/bash
cd /opt/malluclub-bot

# Deploy slash commands
echo "Deploying slash commands..."
node deploy-commands.js

# Start bot with PM2
echo "Starting bot with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

echo "Bot started successfully!"
echo "Use 'pm2 logs malluclub-bot' to view logs"
echo "Use 'pm2 status' to check bot status"
EOF

chmod +x start-bot.sh

print_status "Creating update script..."
cat > update-bot.sh << 'EOF'
#!/bin/bash
cd /opt/malluclub-bot

echo "Stopping bot..."
pm2 stop malluclub-bot

echo "Pulling latest changes..."
git pull origin main

echo "Installing dependencies..."
npm install --production

echo "Deploying commands..."
node deploy-commands.js

echo "Starting bot..."
pm2 start malluclub-bot

echo "Bot updated and restarted!"
EOF

chmod +x update-bot.sh

echo ""
print_status "✅ Application setup complete!"
echo ""
print_warning "IMPORTANT: Configure your .env file before starting the bot:"
echo "nano .env"
echo ""
print_status "Required environment variables:"
echo "- DISCORD_TOKEN (your Discord bot token)"
echo "- CLIENT_ID (your Discord application ID)"
echo "- MONGODB_URI (your MongoDB connection string)"
echo ""
print_status "Optional environment variables:"
echo "- GUILD_ID (for guild-specific commands)"
echo "- LOG_LEVEL (info, debug, error)"
echo ""
print_status "After configuring .env, start the bot with:"
echo "./start-bot.sh"
echo ""
print_status "To update the bot later, use:"
echo "./update-bot.sh"
echo ""
