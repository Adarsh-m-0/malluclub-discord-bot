#!/bin/bash

# 🌐 GitHub Webhook Listener for Auto-Deployment
# This creates a simple webhook endpoint on your Contabo server

PORT=3001
BOT_DIR="/opt/malluclub-bot"

echo "🚀 Starting GitHub webhook listener on port $PORT..."

# Install webhook listener if not exists
if ! command -v webhook &> /dev/null; then
    echo "📦 Installing webhook..."
    wget https://github.com/adnanh/webhook/releases/download/2.8.0/webhook-linux-amd64.tar.gz
    tar -xzf webhook-linux-amd64.tar.gz
    sudo mv webhook-linux-amd64/webhook /usr/local/bin/
    rm -rf webhook-linux-amd64*
fi

# Create webhook configuration
cat > webhook-config.json << EOF
[
  {
    "id": "malluclub-deploy",
    "execute-command": "$BOT_DIR/auto-update.sh",
    "command-working-directory": "$BOT_DIR",
    "response-message": "Bot update triggered!",
    "trigger-rule": {
      "match": {
        "type": "payload-hash-sha256",
        "secret": "$WEBHOOK_SECRET",
        "parameter": {
          "source": "header",
          "name": "X-Hub-Signature-256"
        }
      }
    },
    "response-headers": {
      "Access-Control-Allow-Origin": "*"
    }
  }
]
EOF

# Start webhook listener
webhook -hooks webhook-config.json -port $PORT -verbose
