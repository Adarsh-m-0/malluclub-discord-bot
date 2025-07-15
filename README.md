# Mallu Club Discord Bot

A comprehensive Discord bot designed for the Mallu Club server with moderation, engagement, and fun features.

## Features

- **Slash Commands Integration**: Modern Discord slash commands
- **Comprehensive Moderation**: Kick, ban, mute, unmute, warn, and clear messages
- **Welcome System**: Custom welcome messages for new members
- **User Engagement**: Fun commands like meme, joke, and avatar
- **Information Commands**: User info, server info, and ping
- **Logging System**: Comprehensive logging for all server events
- **Auto-Role System**: Automatically assign roles to new members

## Setup

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

4. Deploy slash commands:
   ```bash
   npm run deploy
   ```

5. Start the bot:
   ```bash
   npm start
   ```

## Configuration

Update the `.env` file with your bot's credentials:
- `DISCORD_TOKEN`: Your bot token from Discord Developer Portal
- `CLIENT_ID`: Your bot's client ID
- `GUILD_ID`: Your server's ID (optional for global commands)
- `MONGODB_URI`: MongoDB connection string
- `WELCOME_CHANNEL_ID`: Channel ID for welcome messages
- `LOG_CHANNEL_ID`: Channel ID for logging
- `AUTO_ROLE_ID`: Role ID to auto-assign to new members

## Commands

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
