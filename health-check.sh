#!/bin/bash

# Contabo Server Health Check and Bot Status Script
# Run this script to check if everything is working properly

echo "🔍 MalluClub Bot Deployment Health Check"
echo "========================================"

# Check system resources
echo ""
echo "💾 System Resources:"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')"
echo "Memory Usage: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')"
echo "Disk Usage: $(df -h / | awk 'NR==2{print $5}')"

# Check Node.js
echo ""
echo "🟢 Node.js:"
node --version || echo "❌ Node.js not found"

# Check PM2
echo ""
echo "🔄 PM2:"
pm2 --version || echo "❌ PM2 not found"

# Check bot directory
echo ""
echo "📁 Bot Directory:"
if [ -d "/opt/malluclub-bot" ]; then
    echo "✅ Bot directory exists"
    cd /opt/malluclub-bot
    
    # Check .env file
    if [ -f ".env" ]; then
        echo "✅ .env file exists"
    else
        echo "❌ .env file missing"
    fi
    
    # Check main files
    if [ -f "index.js" ]; then
        echo "✅ index.js exists"
    else
        echo "❌ index.js missing"
    fi
    
    if [ -f "package.json" ]; then
        echo "✅ package.json exists"
    else
        echo "❌ package.json missing"
    fi
    
else
    echo "❌ Bot directory not found at /opt/malluclub-bot"
fi

# Check PM2 process
echo ""
echo "🤖 Bot Status:"
pm2 describe malluclub-bot > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Bot process exists in PM2"
    pm2 status malluclub-bot
    echo ""
    echo "📊 Recent Logs:"
    pm2 logs malluclub-bot --lines 5 --nostream
else
    echo "❌ Bot process not found in PM2"
fi

# Check MongoDB connection
echo ""
echo "🗄️ Database Connection:"
cd /opt/malluclub-bot
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI)
  .then(() => { console.log('✅ MongoDB connection successful'); process.exit(0); })
  .catch(err => { console.log('❌ MongoDB connection failed:', err.message); process.exit(1); });
" 2>/dev/null || echo "❌ Cannot test MongoDB connection"

# Check Discord API connection
echo ""
echo "🤖 Discord Connection:"
if pm2 describe malluclub-bot > /dev/null 2>&1; then
    # Check if bot has been online recently
    LAST_RESTART=$(pm2 jlist | jq -r '.[] | select(.name=="malluclub-bot") | .pm2_env.restart_time')
    if [ "$LAST_RESTART" != "null" ] && [ "$LAST_RESTART" != "" ]; then
        echo "✅ Bot is managed by PM2"
        
        # Check logs for connection status
        if pm2 logs malluclub-bot --lines 20 --nostream | grep -q "ready\|online"; then
            echo "✅ Bot appears to be connected to Discord"
        else
            echo "⚠️ Bot may not be connected to Discord (check logs)"
        fi
    else
        echo "⚠️ Bot restart time unknown"
    fi
else
    echo "❌ Bot not running in PM2"
fi

echo ""
echo "========================================"
echo "Health check completed!"
echo ""
echo "💡 To fix issues:"
echo "   • Check logs: pm2 logs malluclub-bot"
echo "   • Restart bot: pm2 restart malluclub-bot"
echo "   • View detailed status: pm2 describe malluclub-bot"
echo "   • Check .env file: cat /opt/malluclub-bot/.env"
