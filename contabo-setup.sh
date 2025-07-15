#!/bin/bash

# 🚀 MalluClub Discord Bot - Contabo Deployment Script
# Run this script on your Contabo server as root

set -e

echo "🚀 Starting MalluClub Discord Bot deployment on Contabo..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

print_status "Updating system packages..."
apt update && apt upgrade -y
apt install curl wget git nano htop unzip -y

print_status "Installing Node.js 20.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
npm_version=$(npm --version)
print_status "Node.js installed: $node_version"
print_status "NPM installed: $npm_version"

print_status "Installing PM2 process manager..."
npm install -g pm2

print_status "Creating application directory..."
mkdir -p /opt/malluclub-bot
cd /opt/malluclub-bot

print_status "Setting up firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

print_status "Creating bot user for security..."
useradd -m -s /bin/bash botuser
usermod -aG sudo botuser

print_status "Setting up directory permissions..."
chown -R botuser:botuser /opt/malluclub-bot

echo ""
print_status "✅ Server setup complete!"
echo ""
print_warning "Next steps:"
echo "1. Clone your bot repository to /opt/malluclub-bot"
echo "2. Set up your .env file with Discord token and MongoDB URI"
echo "3. Install dependencies with 'npm install --production'"
echo "4. Deploy commands with 'node deploy-commands.js'"
echo "5. Start the bot with PM2"
echo ""
print_status "Run the following commands as botuser:"
echo "sudo -u botuser git clone https://github.com/Adarsh-m-0/malluclub-discord-bot.git ."
echo "sudo -u botuser cp .env.example .env"
echo "sudo -u botuser nano .env"
echo ""
