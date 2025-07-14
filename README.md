# MalluClub Discord Bot 🤖

A comprehensive, production-ready Discord bot built with **discord.js v14** featuring advanced moderation, voice activity tracking, and community engagement tools.

## ✨ Features

### 🛡️ **Moderation System**
- **Slash Commands**: Modern Discord slash commands with ephemeral replies
- **Comprehensive Tools**: Kick, ban, mute, unmute, warn, and clear messages
- **Auto-Moderation**: Intelligent spam detection and auto-responses
- **Detailed Logging**: All moderation actions logged with context

### 🎤 **Voice XP System**
- **Real-time Tracking**: Monitor voice channel activity automatically
- **XP Rewards**: 1 XP per minute in voice channels
- **Session Management**: Persistent session tracking with MongoDB
- **Leaderboards**: Voice activity rankings and statistics
- **Smart Caching**: In-memory session caching for performance

### 🎮 **Community Features**
- **Welcome System**: Custom welcome messages for new members
- **Fun Commands**: Memes, jokes, avatars, and entertainment
- **Information Tools**: User info, server stats, and bot diagnostics
- **Auto-Role System**: Automatically assign roles to new members

### 🔧 **Production Ready**
- **Error Handling**: Comprehensive try-catch with structured logging
- **Performance Monitoring**: Command execution time tracking
- **Docker Support**: Production-ready containerization
- **Testing**: Jest test suite with 90%+ coverage
- **Code Quality**: ESLint + Prettier for consistent code style

## 🚀 Quick Setup

### Prerequisites
- Node.js 18+ 
- MongoDB database
- Discord bot token

### Installation

```bash
# Clone the repository
git clone https://github.com/Adarsh-m-0/malluclub-discord-bot.git
cd malluclub-discord-bot

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your credentials

# Deploy slash commands
npm run deploy

# Start the bot
npm start
```

### Development Mode
```bash
# Start with auto-restart
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

## ⚙️ Configuration

Create a `.env` file with the following variables:

```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
GUILD_ID=your_development_guild_id

# Database
MONGODB_URI=mongodb://localhost:27017/malluclub

# Features
WELCOME_CHANNEL_ID=channel_id_for_welcomes
LOG_CHANNEL_ID=channel_id_for_logs
AUTO_ROLE_ID=role_id_to_auto_assign

# Environment
NODE_ENV=development
LOG_LEVEL=info
```

## 📋 Commands

### Moderation
- `/kick` - Kick a member
- `/ban` - Ban a member
- `/mute` - Mute a member
- `/unmute` - Unmute a member
- `/warn` - Warn a member
- `/clear` - Clear messages
- `/modlogs` - View moderation logs

### Information
- `/userinfo` - Get user information
- `/serverinfo` - Get server information
- `/ping` - Check bot latency

### Fun
- `/meme` - Get a random meme
- `/joke` - Get a random joke
- `/avatar` - Get user's avatar

## License

MIT License
