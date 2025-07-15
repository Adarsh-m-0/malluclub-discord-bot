#!/bin/bash

# 🔍 MalluClub Discord Bot - Monitoring Script
# Use this to monitor your bot's health on Contabo

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

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

clear

print_header "🤖 MalluClub Discord Bot - Health Monitor"

# Check if bot is running
if pm2 list | grep -q "malluclub-bot"; then
    print_status "Bot is registered with PM2"
else
    print_error "Bot is not registered with PM2"
    exit 1
fi

# Get bot status
bot_status=$(pm2 jlist | jq -r '.[] | select(.name=="malluclub-bot") | .pm2_env.status')
bot_restarts=$(pm2 jlist | jq -r '.[] | select(.name=="malluclub-bot") | .pm2_env.restart_time')
bot_uptime=$(pm2 jlist | jq -r '.[] | select(.name=="malluclub-bot") | .pm2_env.pm_uptime')
bot_memory=$(pm2 jlist | jq -r '.[] | select(.name=="malluclub-bot") | .monit.memory')
bot_cpu=$(pm2 jlist | jq -r '.[] | select(.name=="malluclub-bot") | .monit.cpu')

echo ""
print_header "📊 Bot Status"
echo "Status: $bot_status"
echo "Restarts: $bot_restarts"
echo "Memory Usage: $(($bot_memory / 1024 / 1024)) MB"
echo "CPU Usage: $bot_cpu%"

# Calculate uptime
if [ "$bot_uptime" != "null" ]; then
    uptime_seconds=$(( $(date +%s) - $bot_uptime / 1000 ))
    uptime_human=$(date -d@$uptime_seconds -u +%H:%M:%S)
    echo "Uptime: $uptime_human"
fi

echo ""
print_header "🖥️ Server Resources"

# Memory usage
mem_info=$(free -h | grep "^Mem")
echo "Memory: $mem_info"

# Disk usage
disk_usage=$(df -h / | tail -1)
echo "Disk: $disk_usage"

# CPU load
cpu_load=$(uptime | awk -F'load average:' '{print $2}')
echo "Load Average:$cpu_load"

echo ""
print_header "📋 Recent Logs (Last 10 lines)"
echo ""

if [ -f "/opt/malluclub-bot/logs/combined.log" ]; then
    tail -10 /opt/malluclub-bot/logs/combined.log
else
    print_warning "No log files found"
fi

echo ""
print_header "🔧 Quick Actions"
echo "1. View live logs: pm2 logs malluclub-bot"
echo "2. Restart bot: pm2 restart malluclub-bot"
echo "3. Stop bot: pm2 stop malluclub-bot"
echo "4. View detailed status: pm2 show malluclub-bot"
echo "5. Update bot: cd /opt/malluclub-bot && ./update-bot.sh"

echo ""
if [ "$bot_status" = "online" ]; then
    print_status "🟢 Bot is running healthy!"
else
    print_error "🔴 Bot needs attention!"
fi
