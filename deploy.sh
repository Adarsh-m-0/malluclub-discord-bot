#!/bin/bash

# 🚀 Local deployment script - Run this after making changes

echo "🔄 Starting deployment process..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository!"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes. Please commit them first."
    echo ""
    echo "Quick commit options:"
    echo "1. git add . && git commit -m 'feat: Update bot features'"
    echo "2. git add . && git commit -m 'fix: Bug fixes'"
    echo "3. git add . && git commit -m 'docs: Update documentation'"
    exit 1
fi

# Get current branch
BRANCH=$(git branch --show-current)
echo "📋 Current branch: $BRANCH"

# Push to GitHub
echo "📤 Pushing changes to GitHub..."
git push origin $BRANCH

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "🤖 If you have auto-deployment set up:"
    echo "   - GitHub Actions will deploy automatically"
    echo "   - Check the Actions tab in your repository"
    echo "   - Your bot should update within 1-2 minutes"
    echo ""
    echo "🔧 Manual deployment on server:"
    echo "   ssh botuser@your-server-ip"
    echo "   cd /opt/malluclub-bot && ./auto-update.sh"
else
    echo "❌ Failed to push to GitHub!"
    exit 1
fi
