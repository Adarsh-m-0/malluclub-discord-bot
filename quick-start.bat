@echo off
title Mallu Club Bot - Quick Start
echo ====================================
echo    QUICK START SCRIPT
echo ====================================
echo.

:: Check Node.js installation
echo Checking Node.js...
node --version
if errorlevel 1 (
    echo.
    echo ❌ Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo Then run this script again.
    pause
    exit /b 1
)

echo ✅ Node.js is installed!
echo.

:: Install dependencies
echo Installing dependencies...
npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed!
echo.

:: Deploy commands
echo Deploying slash commands...
npm run deploy
if errorlevel 1 (
    echo ❌ Failed to deploy commands
    echo Make sure your bot token is valid in .env file
    pause
    exit /b 1
)
echo ✅ Commands deployed!
echo.

:: Start the bot
echo Starting Discord bot...
echo ====================================
echo    BOT IS STARTING...
echo ====================================
npm start
