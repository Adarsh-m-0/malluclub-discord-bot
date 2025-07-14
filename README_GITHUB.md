# 🎤 MalluClub Discord Bot

A comprehensive Discord bot built with Discord.js v14, featuring advanced voice activity tracking, role management, moderation tools, and professional embed styling.

## ✨ Features

### 🎯 Core Functionality
- **22 Commands** across 4 categories (Fun, Info, Moderation, General)
- **Voice XP System** with automatic level progression and role rewards
- **Comprehensive Role Management** with persistence for rejoining members
- **Advanced Moderation Tools** with logging and temporary actions
- **Interactive Components** with pagination, confirmations, and collectors

### 🎨 Enhanced UI/UX
- **Professional Embed Styling** using Discord's official color palette
- **Mobile-Optimized Layouts** for perfect display on all devices
- **Interactive Leaderboards** with progress bars, medals, and statistics
- **Visual Progress Indicators** for XP and level advancement
- **Consistent Design Language** across all bot interactions

### 🛡️ Moderation & Security
- **Role Persistence** - Automatically restore roles when members rejoin
- **Comprehensive Logging** - Track all moderation actions
- **Temporary Punishments** - Timed mutes and bans
- **Anti-Spam Measures** - Built-in rate limiting and validation
- **Permission Checks** - Proper authorization for all commands

## 🚀 Quick Start

### Prerequisites
- Node.js v18 or higher
- MongoDB Atlas account (or local MongoDB)
- Discord Application with Bot Token

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/malluclub-discord-bot.git
   cd malluclub-discord-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your tokens and configuration
   ```

4. **Deploy slash commands**
   ```bash
   node deploy-commands.js
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

## ⚙️ Configuration

### Environment Variables
```env
# Discord Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
GUILD_ID=your_server_id_here

# Database Configuration
MONGODB_URI=your_mongodb_connection_string

# Bot Configuration
PREFIX=!
NODE_ENV=production
```

### Required Bot Permissions
- View Channels
- Send Messages
- Embed Links
- Attach Files
- Use Slash Commands
- Manage Roles
- Manage Messages
- Kick Members
- Ban Members
- Connect (Voice)
- Speak (Voice)

## 📋 Commands

### 🎉 Fun Commands
- `/avatar` - Display user avatar
- `/joke` - Get a random joke
- `/meme` - Fetch a random meme

### ℹ️ Information Commands
- `/ping` - Check bot latency
- `/serverinfo` - Display server information
- `/userinfo` - Show user details
- `/voicestats` - View voice activity statistics
- `/voiceleaderboard` - Voice XP leaderboards

### 🔨 Moderation Commands
- `/ban` - Ban a member
- `/kick` - Kick a member
- `/mute` - Temporarily mute a member
- `/unmute` - Remove mute from a member
- `/warn` - Issue a warning
- `/clear` - Delete messages in bulk
- `/role` - Manage user roles
- `/setup` - Configure bot settings
- `/autorole` - Set automatic roles
- `/restoreroles` - Restore saved roles
- `/voiceadmin` - Voice channel management
- `/modlogs` - View moderation logs

### 🔧 General Commands
- `/help` - Command help and documentation

## 🎨 Enhanced Embed System

The bot features a sophisticated embed styling system with three main components:

### Professional Templates
```javascript
// Success message
const successEmbed = EmbedTemplates.success(
    'Action Complete',
    'Your voice XP has been updated!',
    user
);

// Enhanced leaderboard
const leaderboard = EmbedTemplates.leaderboard('xp', guild)
    .setDescription(formattedRankings);
```

### Utility Functions
```javascript
// Format large numbers
EmbedUtils.formatNumber(1500000); // "1.5M"

// Create progress bars
EmbedUtils.createProgressBar(750, 1000, 12); // "████████░░░░ 75%"

// Format time durations
EmbedUtils.formatDuration(3665000); // "1h 1m 5s"
```

### Interactive Components
- **Pagination** for large datasets
- **Confirmation dialogs** for destructive actions
- **Tabbed interfaces** for complex information
- **Loading states** for better user feedback

## 🎯 Voice XP System

### How It Works
- **Earn XP** by being active in voice channels
- **Level up** automatically with XP thresholds
- **Unlock roles** based on level progression
- **Daily streaks** for consistent activity
- **Leaderboards** to compete with other members

### XP Calculation
- Base XP per minute in voice channel
- Bonus XP for being in channels with other members
- Daily streak multipliers
- Special event bonuses

## 🗄️ Database Schema

### Voice Activity
```javascript
{
  userId: String,
  guildId: String,
  username: String,
  voiceXP: Number,
  level: Number,
  totalVoiceTime: Number,
  sessions: Array,
  dailyStats: {
    streak: Number,
    lastActiveDate: Date
  }
}
```

### User Roles
```javascript
{
  userId: String,
  guildId: String,
  roles: Array,
  lastUpdated: Date
}
```

## 🔧 Development

### Project Structure
```
├── commands/           # Slash commands organized by category
│   ├── fun/           # Entertainment commands
│   ├── info/          # Information commands
│   ├── moderation/    # Moderation tools
│   └── general/       # General utilities
├── events/            # Discord.js event handlers
├── models/            # MongoDB schemas
├── utils/             # Utility functions and embed templates
├── config/            # Configuration files
└── examples/          # Usage examples and documentation
```

### Adding New Commands

1. Create command file in appropriate category folder
2. Use the enhanced embed templates for consistent styling
3. Include proper error handling and permissions
4. Add comprehensive JSDoc comments
5. Test with different user permissions and scenarios

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📊 Monitoring & Logging

### Built-in Logging
- Command usage tracking
- Error monitoring and reporting
- Database operation logging
- Voice activity session tracking
- Moderation action auditing

### Performance Metrics
- Response time monitoring
- Database query optimization
- Memory usage tracking
- Voice channel activity analytics

## 🛡️ Security Features

### Data Protection
- Environment variable validation
- Input sanitization and validation
- Rate limiting on commands
- Permission-based access control
- Secure database connections

### Privacy Compliance
- Minimal data collection
- User data deletion on request
- Transparent data usage
- Secure storage practices

## 📖 Documentation

- **[Embed Styling Guide](EMBED_GUIDE.md)** - Complete guide to using the enhanced embed system
- **[Setup Guide](SETUP.md)** - Detailed setup instructions
- **[Examples](examples/)** - Implementation examples and best practices

## 🤝 Support

- **GitHub Issues** - Bug reports and feature requests
- **Discord Server** - Community support and discussions
- **Documentation** - Comprehensive guides and examples

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎉 Acknowledgments

- **Discord.js** - Powerful Discord API wrapper
- **MongoDB** - Reliable database solution
- **Discord Community** - Inspiration and feedback
- **Contributors** - Everyone who helped improve this bot

---

### 🌟 Star this repository if you found it helpful!

**Made with ❤️ for the Discord community**
