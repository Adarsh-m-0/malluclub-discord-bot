@echo off
REM 🚀 Windows deployment script - Run this after making changes

echo 🔄 Starting deployment process...

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo ❌ Not in a git repository!
    exit /b 1
)

REM Check for uncommitted changes
git diff-index --quiet HEAD --
if errorlevel 1 (
    echo ⚠️  You have uncommitted changes. Please commit them first.
    echo.
    echo Quick commit options:
    echo 1. git add . ^&^& git commit -m "feat: Update bot features"
    echo 2. git add . ^&^& git commit -m "fix: Bug fixes"
    echo 3. git add . ^&^& git commit -m "docs: Update documentation"
    exit /b 1
)

REM Get current branch
for /f %%i in ('git branch --show-current') do set BRANCH=%%i
echo 📋 Current branch: %BRANCH%

REM Push to GitHub
echo 📤 Pushing changes to GitHub...
git push origin %BRANCH%

if errorlevel 0 (
    echo ✅ Successfully pushed to GitHub!
    echo.
    echo 🤖 If you have auto-deployment set up:
    echo    - GitHub Actions will deploy automatically
    echo    - Check the Actions tab in your repository
    echo    - Your bot should update within 1-2 minutes
    echo.
    echo 🔧 Manual deployment on server:
    echo    ssh botuser@your-server-ip
    echo    cd /opt/malluclub-bot ^&^& ./auto-update.sh
) else (
    echo ❌ Failed to push to GitHub!
    exit /b 1
)

pause
