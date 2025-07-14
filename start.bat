@echo off
title Mallu Club Bot
echo Starting Mallu Club Bot...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if package.json exists
if not exist "package.json" (
    echo Error: package.json not found
    echo Please make sure you're in the correct directory
    pause
    exit /b 1
)

:: Check if .env file exists
if not exist ".env" (
    echo Warning: .env file not found
    echo Please create a .env file from .env.example and fill in your values
    pause
    exit /b 1
)

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Deploy commands
echo Deploying slash commands...
npm run deploy
if errorlevel 1 (
    echo Error: Failed to deploy commands
    pause
    exit /b 1
)

:: Start the bot
echo Starting bot...
npm start

pause
