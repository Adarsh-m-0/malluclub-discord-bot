#!/bin/bash

# 🔄 Auto-update script for MalluClub Discord Bot
# This script should be placed on your Contabo server

BOT_DIR="/opt/malluclub-bot"
LOG_FILE="$BOT_DIR/logs/auto-update.log"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Change to bot directory
cd "$BOT_DIR" || exit 1

log_message "🔄 Starting auto-update process..."

# Check if there are any changes
git fetch origin main
CHANGES=$(git rev-list HEAD...origin/main --count)

if [ "$CHANGES" -eq 0 ]; then
    log_message "ℹ️  No updates available"
    exit 0
fi

log_message "📥 Found $CHANGES new changes, updating..."

# Stop the bot
log_message "⏹️  Stopping bot..."
pm2 stop malluclub-bot

# Pull latest changes
log_message "📦 Pulling latest changes..."
git pull origin main

# Install dependencies
log_message "📋 Installing dependencies..."
npm install --production

# Deploy commands
log_message "🚀 Deploying commands..."
node deploy-commands.js

# Start the bot
log_message "▶️  Starting bot..."
pm2 start malluclub-bot

# Check status
sleep 5
if pm2 list | grep -q "malluclub-bot.*online"; then
    log_message "✅ Bot updated and started successfully!"
else
    log_message "❌ Bot failed to start after update!"
    pm2 logs malluclub-bot --lines 10
fi

# Cleanup old logs (keep last 50 lines)
if [ -f "$LOG_FILE" ]; then
    tail -50 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi
