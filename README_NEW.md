# 🤖 MalluClub Bot v2.0

A comprehensive and feature-rich Discord bot designed for the MalluClub server, offering advanced moderation, entertainment features, and community management tools.

## ✨ Features

### 🛡️ **Advanced Moderation**
- **Kick/Ban System** - Role hierarchy respected, comprehensive logging
- **Mute/Unmute** - Temporary and permanent muting capabilities  
- **Warning System** - Track and manage user warnings
- **Message Management** - Bulk message deletion with filtering
- **Moderation Logs** - Complete audit trail of all mod actions

### 🎮 **Entertainment & Fun**
- **Meme Generator** - Reddit integration with fallback images
- **Joke Command** - Programming and general jokes
- **Avatar Display** - High-quality user avatar showcase
- **Interactive Help** - Modern dropdown menu system

### 📊 **Information & Utilities**
- **Server Info** - Comprehensive server statistics
- **User Profiles** - Detailed user information and history
- **Bot Performance** - Real-time latency and uptime monitoring
- **Permission Checking** - Smart permission validation

### 🏠 **Community Features**
- **Welcome/Goodbye** - Automated member greetings
- **Auto-Role Assignment** - Streamlined member onboarding
- **Activity Logging** - Message edit/delete tracking
- **Dynamic Status** - Rotating bot activities

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- MongoDB Atlas account (or local MongoDB)
- Discord Application with Bot Token

### Installation

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd MalluClub
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your values in `.env`:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_bot_client_id_here
   GUILD_ID=your_guild_id_here
   MONGODB_URI=your_mongodb_connection_string_here
   WELCOME_CHANNEL_ID=your_welcome_channel_id_here
   LOG_CHANNEL_ID=your_log_channel_id_here
   AUTO_ROLE_ID=your_auto_role_id_here
   ```

3. **Deploy Commands**
   ```bash
   npm run deploy
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

5. **Start Bot**
   ```bash
   npm start
   ```

## 🛠️ Available Scripts

- `npm start` - Start the bot in production mode
- `npm run dev` - Start with auto-restart (development)
- `npm run deploy` - Deploy slash commands to Discord
- `npm test` - Run comprehensive bot tests
- `npm run quick-start` - Automated setup script (Windows)

## 📋 Commands

### 🛡️ Moderation Commands
- `/ban <user> [reason] [delete-days]` - Ban a user from the server
- `/kick <user> [reason]` - Kick a user from the server
- `/mute <user> [duration] [reason]` - Mute a user
- `/unmute <user>` - Unmute a user
- `/warn <user> <reason>` - Issue a warning
- `/clear <amount> [user]` - Delete messages
- `/modlogs [user]` - View moderation history

### 📊 Information Commands
- `/ping` - Check bot latency and performance
- `/userinfo [user]` - Get detailed user information
- `/serverinfo` - Display server statistics
- `/help [command]` - Interactive help system

### 🎮 Fun Commands
- `/meme [subreddit]` - Get random memes from Reddit
- `/joke` - Get a random programming joke
- `/avatar [user]` - Display user's avatar

## 🔧 Configuration

### Required Permissions
The bot needs these Discord permissions:
- View Channels
- Send Messages  
- Embed Links
- Read Message History
- Use Slash Commands
- Kick Members
- Ban Members
- Manage Messages
- Moderate Members
- Manage Roles (limited)

### Channel Setup
Configure these channels in your `.env`:
- **Welcome Channel** - New member greetings
- **Log Channel** - Moderation action logging
- **Auto Role** - Automatic role assignment

## 🏗️ Architecture

```
MalluClub/
├── commands/           # Slash commands organized by category
│   ├── fun/           # Entertainment commands
│   ├── info/          # Information utilities  
│   ├── moderation/    # Moderation tools
│   └── general/       # General purpose commands
├── events/            # Discord event handlers
├── models/            # MongoDB data models
├── config/            # Configuration files
├── utils/             # Utility functions
└── tests/             # Test suites
```

## 🔒 Security Features

- **Role Hierarchy** - Prevents privilege escalation
- **Permission Validation** - Automatic permission checking
- **Rate Limiting** - Built-in cooldown system
- **Input Sanitization** - Safe command parameter handling
- **Audit Logging** - Complete action tracking
- **Graceful Shutdown** - Safe bot termination

## 🚨 Error Handling

- **Comprehensive Logging** - All errors tracked and logged
- **Fallback Systems** - Graceful degradation for external APIs
- **User-Friendly Messages** - Clear error communication
- **Auto-Recovery** - Automatic reconnection capabilities

## 📊 Monitoring & Health

- **Performance Metrics** - Real-time bot statistics
- **Database Health** - Connection monitoring
- **Command Analytics** - Usage tracking
- **Uptime Monitoring** - Availability reporting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Report bugs via GitHub Issues
- **Discord**: Join our support server
- **Documentation**: Full docs available in `/docs`

---

**MalluClub Bot v2.0** - Built with ❤️ for the MalluClub community
