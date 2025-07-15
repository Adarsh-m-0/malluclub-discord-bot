#!/bin/bash

# 🔄 Auto-restart script for MalluClub Discord Bot
# This script checks if the bot is running and restarts it if needed

LOG_FILE="/opt/malluclub-bot/logs/auto-restart.log"
BOT_DIR="/opt/malluclub-bot"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

cd "$BOT_DIR" || exit 1

# Check if bot is running
if pm2 list | grep -q "malluclub-bot.*online"; then
    log_message "Bot is running normally"
else
    log_message "Bot is not running, attempting restart..."
    
    # Try to restart the bot
    pm2 restart malluclub-bot
    
    # Wait a few seconds and check again
    sleep 10
    
    if pm2 list | grep -q "malluclub-bot.*online"; then
        log_message "Bot restarted successfully"
    else
        log_message "Failed to restart bot, manual intervention required"
        
        # Send notification (you can configure this with your notification service)
        # curl -X POST "your-webhook-url" -d "Bot restart failed on $(hostname)"
    fi
fi

# Cleanup old logs (keep last 100 lines)
if [ -f "$LOG_FILE" ]; then
    tail -100 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi
