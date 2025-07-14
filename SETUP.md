# Mallu Club Bot - Complete Setup Guide

## 🌟 Overview

Welcome to the **Mallu Club Bot** - a comprehensive Discord bot designed for Discord communities. This bot combines powerful moderation features with fun and engaging commands.

### ✨ Features

- **🛡️ Comprehensive Moderation**: Kick, ban, mute, unmute, warn, and message clearing
- **📊 Information Commands**: User info, server info, and bot statistics
- **🎉 Fun Commands**: Memes, jokes, and avatar display
- **🎯 Welcome System**: Custom welcome messages for new members
- **📝 Logging System**: Complete audit trail for all server activities
- **🔄 Auto-Role System**: Automatically assign roles to new members
- **💾 Database Integration**: MongoDB for persistent data storage

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18.0.0 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **Discord Bot Token**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to "Bot" section and create a bot
   - Copy the token (keep it secret!)

3. **MongoDB Database**
   - Use MongoDB Atlas (free tier available)
   - Or install MongoDB locally
   - Get connection string

### Installation Steps

1. **Run the Setup Script**
   ```batch
   setup.bat
   ```

2. **Configure Environment Variables**
   - Edit the `.env` file with your credentials
   - See [Environment Variables](#environment-variables) section

3. **Invite Bot to Server**
   - Use the Discord Developer Portal
   - Select appropriate permissions
   - See [Bot Permissions](#bot-permissions) section

4. **Start the Bot**
   ```batch
   start.bat
   ```
   or
   ```bash
   npm start
   ```

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in these values:

```env
# Required
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
MONGODB_URI=mongodb://localhost:27017/malluclub

# Optional but Recommended
GUILD_ID=your_guild_id_here
WELCOME_CHANNEL_ID=your_welcome_channel_id_here
LOG_CHANNEL_ID=your_log_channel_id_here
AUTO_ROLE_ID=your_auto_role_id_here
```

### How to Get IDs

1. **Enable Developer Mode** in Discord Settings > Advanced
2. **Right-click** on channels/servers/roles and select "Copy ID"

## 🤖 Bot Permissions

The bot requires these permissions:

### Essential Permissions
- ✅ View Channels
- ✅ Send Messages
- ✅ Use Slash Commands
- ✅ Embed Links
- ✅ Attach Files
- ✅ Read Message History
- ✅ Add Reactions

### Moderation Permissions
- ✅ Kick Members
- ✅ Ban Members
- ✅ Timeout Members
- ✅ Manage Messages
- ✅ Manage Roles

### Optional Permissions
- ✅ Manage Channels (for advanced features)
- ✅ View Audit Log (for logging)
- ✅ Manage Nicknames

## 📋 Commands Reference

### Moderation Commands
- `/kick <user> [reason]` - Kick a member
- `/ban <user> [reason] [delete-days]` - Ban a member
- `/mute <user> <duration> [reason]` - Mute a member
- `/unmute <user> [reason]` - Unmute a member
- `/warn <user> <reason>` - Warn a member
- `/clear <amount> [target]` - Clear messages
- `/modlogs [user] [action]` - View moderation logs

### Information Commands
- `/ping` - Check bot latency
- `/userinfo [user]` - Get user information
- `/serverinfo` - Get server information

### Fun Commands
- `/meme [subreddit]` - Get random memes
- `/joke [type]` - Get random jokes
- `/avatar [user]` - Display user avatar

### General Commands
- `/help [command]` - Get help information

## 🗂️ File Structure

```
MalluClub/
├── commands/
│   ├── fun/           # Fun and entertainment commands
│   ├── general/       # General utility commands
│   ├── info/          # Information commands
│   └── moderation/    # Moderation commands
├── config/
│   └── config.js      # Bot configuration
├── events/
│   ├── ready.js       # Bot ready event
│   ├── interactionCreate.js  # Slash command handling
│   ├── guildMemberAdd.js     # Welcome system
│   ├── guildMemberRemove.js  # Member leave logging
│   ├── messageDelete.js      # Message deletion logging
│   └── messageUpdate.js      # Message edit logging
├── models/
│   ├── User.js              # User database model
│   └── ModerationLog.js     # Moderation logging model
├── utils/
│   └── utils.js       # Utility functions
├── index.js           # Main bot file
├── deploy-commands.js # Command deployment
├── package.json       # Dependencies
├── .env.example       # Environment template
├── setup.bat          # Setup script
├── start.bat          # Start script
└── README.md          # This file
```

## 🔧 Development

### Running in Development Mode
```bash
npm run dev
```

### Adding New Commands

1. Create a new file in the appropriate `commands/` folder
2. Follow the command template:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commandname')
        .setDescription('Command description'),
    
    async execute(interaction) {
        // Command logic here
        await interaction.reply('Hello World!');
    },
};
```

3. Restart the bot and deploy commands

### Database Models

The bot uses MongoDB with Mongoose. Models are in the `models/` folder:

- **User.js**: Stores user data, warnings, and mute status
- **ModerationLog.js**: Logs all moderation actions

## 📊 Monitoring and Logging

### Built-in Logging
- All moderation actions are logged to database
- Server events are logged to designated channel
- Console logging with timestamps

### Error Handling
- Comprehensive error handling throughout
- Graceful degradation for missing permissions
- User-friendly error messages

## 🔐 Security Features

- Environment variable protection
- Input validation and sanitization
- Permission checks before actions
- Rate limiting with cooldowns
- Secure token handling

## 🚨 Troubleshooting

### Common Issues

1. **Bot Not Responding**
   - Check if bot is online
   - Verify token in `.env`
   - Check bot permissions

2. **Commands Not Working**
   - Run `npm run deploy` to update commands
   - Check for syntax errors in command files
   - Verify slash command permissions

3. **Database Connection Issues**
   - Verify MongoDB URI in `.env`
   - Check if MongoDB service is running
   - Verify network connectivity

4. **Permission Errors**
   - Check bot role hierarchy
   - Verify required permissions
   - Check channel-specific permissions

### Getting Help

1. Check the console for error messages
2. Review the logs in your designated log channel
3. Join our support server: [Discord Link]
4. Create an issue on GitHub

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Credits

- Made with ❤️ for the Discord community
- Built with Discord.js v14
- Designed for community engagement and management

---

**Mallu Club Bot** - Bringing community warmth to Discord servers worldwide! 🤖

For support, join our Discord server or create an issue on GitHub.
