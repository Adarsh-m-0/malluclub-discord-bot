@echo off
title Mallu Club Bot Setup
color 0A
echo.
echo  ███╗   ███╗ █████╗ ██╗     ██╗     ██╗   ██╗     ██████╗██╗     ██╗   ██╗██████╗ 
echo  ████╗ ████║██╔══██╗██║     ██║     ██║   ██║    ██╔════╝██║     ██║   ██║██╔══██╗
echo  ██╔████╔██║███████║██║     ██║     ██║   ██║    ██║     ██║     ██║   ██║██████╔╝
echo  ██║╚██╔╝██║██╔══██║██║     ██║     ██║   ██║    ██║     ██║     ██║   ██║██╔══██╗
echo  ██║ ╚═╝ ██║██║  ██║███████╗███████╗╚██████╔╝    ╚██████╗███████╗╚██████╔╝██████╔╝
echo  ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝      ╚═════╝╚══════╝ ╚═════╝ ╚═════╝ 
echo.
echo                         Discord Bot Setup - God's Own Country
echo.
echo ================================================================================
echo.

:: Check if Node.js is installed
echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo Recommended version: 18.x or higher
    pause
    exit /b 1
) else (
    echo [OK] Node.js is installed
    node --version
)

:: Check if npm is available
echo.
echo [2/5] Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not available
    pause
    exit /b 1
) else (
    echo [OK] npm is available
    npm --version
)

:: Install dependencies
echo.
echo [3/5] Installing dependencies...
if exist "node_modules" (
    echo [INFO] node_modules folder exists, updating dependencies...
    npm update
) else (
    echo [INFO] Installing fresh dependencies...
    npm install
)

if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
) else (
    echo [OK] Dependencies installed successfully
)

:: Check for .env file
echo.
echo [4/5] Checking configuration...
if not exist ".env" (
    echo [WARNING] .env file not found
    echo [INFO] Creating .env file from template...
    copy ".env.example" ".env"
    echo.
    echo [IMPORTANT] Please edit the .env file with your bot credentials:
    echo - DISCORD_TOKEN: Your bot token from Discord Developer Portal
    echo - CLIENT_ID: Your bot's client ID
    echo - GUILD_ID: Your server's ID (optional, for guild-specific commands)
    echo - MONGODB_URI: Your MongoDB connection string
    echo - WELCOME_CHANNEL_ID: Channel ID for welcome messages
    echo - LOG_CHANNEL_ID: Channel ID for logging
    echo - AUTO_ROLE_ID: Role ID to auto-assign to new members
    echo.
    echo [ACTION REQUIRED] Please edit the .env file now and then run this script again
    pause
    exit /b 1
) else (
    echo [OK] .env file exists
)

:: Deploy commands
echo.
echo [5/5] Deploying slash commands...
npm run deploy
if errorlevel 1 (
    echo [ERROR] Failed to deploy commands
    echo [INFO] This might be due to missing or invalid credentials in .env
    pause
    exit /b 1
) else (
    echo [OK] Commands deployed successfully
)

:: Setup complete
echo.
echo ================================================================================
echo.
echo                             🎉 SETUP COMPLETE! 🎉
echo.
echo The Mallu Club Bot is now ready to run!
echo.
echo To start the bot:
echo   - Run: npm start
echo   - Or use: start.bat
echo.
echo For development with auto-restart:
echo   - Run: npm run dev
echo.
echo Need help? Check the README.md file or visit our support server.
echo.
echo                        Made with ❤️ for Kerala
echo.
echo ================================================================================
echo.
pause
