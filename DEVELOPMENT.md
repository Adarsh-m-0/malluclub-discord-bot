# MalluClub Discord Bot - Development Guide

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Adarsh-m-0/malluclub-discord-bot.git
cd malluclub-discord-bot

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Discord token and MongoDB URI

# Deploy commands to Discord
npm run deploy

# Start the bot
npm start
```

## 📁 Project Structure

```
malluclub-discord-bot/
├── commands/           # Slash commands organized by category
│   ├── fun/           # Entertainment commands
│   ├── info/          # Information commands
│   ├── moderation/    # Moderation commands
│   └── general/       # General utility commands
├── events/            # Discord.js event handlers
├── models/            # MongoDB schemas
├── utils/             # Utility functions and classes
├── tests/             # Jest test files
├── logs/              # Application logs (auto-generated)
└── deployment/        # Production deployment files
```

## 🛠️ Development Workflow

### 1. Environment Setup

```bash
# Development mode with auto-restart
npm run dev

# Install new dependencies
npm install <package-name>

# Update dependencies
npm update
```

### 2. Code Quality

```bash
# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

### 3. Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests for CI/CD
npm run test:ci
```

### 4. Pre-commit Checklist

```bash
# Run all quality checks
npm run pre-commit
```

This will:
- Fix linting issues
- Format code
- Run all tests
- Ensure code quality

## 📝 Adding New Commands

### Step 1: Create Command File

Create a new file in the appropriate category folder:

```javascript
// commands/info/example.js
const { SlashCommandBuilder } = require('discord.js');
const CleanEmbedBuilder = require('../../utils/CleanEmbedBuilder');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('example')
        .setDescription('An example command')
        .addStringOption(option =>
            option
                .setName('input')
                .setDescription('Example input')
                .setRequired(true)
        ),
    
    category: 'info',
    cooldown: 3,
    
    async execute(interaction) {
        try {
            const input = interaction.options.getString('input');
            
            const embed = new CleanEmbedBuilder()
                .setTitle('Example Command')
                .setDescription(`You provided: ${input}`)
                .setColor('#00ff00');
            
            await interaction.reply({ 
                embeds: [embed],
                ephemeral: true 
            });
            
        } catch (error) {
            logger.logError(error, {
                context: 'Example command execution',
                command: 'example',
                user: interaction.user.id
            });
            
            await interaction.reply({
                content: '❌ An error occurred while executing this command!',
                ephemeral: true
            });
        }
    }
};
```

### Step 2: Create Tests

```javascript
// tests/commands/example.test.js
describe('Example Command Tests', () => {
    let command;
    let interaction;
    
    beforeEach(() => {
        command = require('../../commands/info/example');
        interaction = {
            ...global.mockInteraction,
            options: {
                getString: jest.fn().mockReturnValue('test input')
            }
        };
    });
    
    test('should execute successfully', async () => {
        await command.execute(interaction);
        expect(interaction.reply).toHaveBeenCalledTimes(1);
    });
});
```

### Step 3: Deploy Commands

```bash
npm run deploy
```

## 🎨 Using the Embed System

### CleanEmbedBuilder

```javascript
const CleanEmbedBuilder = require('../utils/CleanEmbedBuilder');

const embed = new CleanEmbedBuilder()
    .setTitle('Clean Title')
    .setDescription('Professional description')
    .setColor('#5865F2') // Discord Blurple
    .addFields(
        { name: 'Field 1', value: 'Value 1', inline: true },
        { name: 'Field 2', value: 'Value 2', inline: true }
    )
    .setFooter({ text: 'Footer text' })
    .setTimestamp();
```

### EmbedTemplates

```javascript
const EmbedTemplates = require('../utils/EmbedTemplates');

// Success embed
const successEmbed = EmbedTemplates.success('Operation completed!');

// Error embed
const errorEmbed = EmbedTemplates.error('Something went wrong!');

// Info embed
const infoEmbed = EmbedTemplates.info('Information', 'Details here');

// Warning embed
const warningEmbed = EmbedTemplates.warning('Warning message');
```

## 📊 Logging

### Basic Logging

```javascript
const logger = require('../utils/logger');

// Different log levels
logger.info('Information message');
logger.warn('Warning message');
logger.error('Error message');
logger.debug('Debug message');
```

### Category-specific Logging

```javascript
// Discord events
logger.discord('Bot connected', { guilds: 5 });

// Command execution
logger.command('ping', user, guild, { duration: 150 });

// Voice activities
logger.voice('User joined channel', { userId: '123', channelId: '456' });

// Moderation actions
logger.moderation('ban', target, moderator, 'Spam');

// Database operations
logger.database('User created', { userId: '123' });

// Security events
logger.security('Failed login attempt', { userId: '123' });
```

### Error Logging

```javascript
try {
    // Some operation
} catch (error) {
    logger.logError(error, {
        context: 'Operation description',
        user: interaction.user.id,
        command: 'command-name'
    });
}
```

## 🗄️ Database Models

### User Model

```javascript
const User = require('../models/User');

// Create user
const user = new User({
    userId: '123456789',
    username: 'TestUser',
    discriminator: '1234'
});
await user.save();

// Find user
const user = await User.findOne({ userId: '123456789' });
```

### Voice Activity Model

```javascript
const VoiceActivity = require('../models/VoiceActivity');

// Log voice activity
const activity = new VoiceActivity({
    userId: '123456789',
    guildId: '987654321',
    channelId: '111222333',
    joinTime: new Date(),
    leaveTime: new Date(),
    duration: 300000, // 5 minutes in ms
    xpEarned: 50
});
await activity.save();
```

## 🔧 Configuration

### Environment Variables

```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/malluclub

# Logging Configuration
LOG_LEVEL=info
NODE_ENV=development

# Voice XP Configuration
VOICE_XP_RATE=10
VOICE_XP_INTERVAL=60000
```

## 🚨 Error Handling

### Command Error Handling

```javascript
async execute(interaction) {
    try {
        // Command logic here
    } catch (error) {
        logger.logError(error, {
            context: 'Command execution',
            command: interaction.commandName,
            user: interaction.user.id
        });
        
        const errorMessage = {
            content: '❌ An error occurred while executing this command!',
            ephemeral: true
        };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}
```

### Global Error Handling

The bot includes global error handlers for:
- Unhandled promise rejections
- Uncaught exceptions
- Graceful shutdown signals (SIGINT, SIGTERM)

## 📈 Performance Monitoring

### Performance Logging

```javascript
const startTime = Date.now();
// Some operation
const duration = Date.now() - startTime;

if (duration > 1000) {
    logger.performance('Slow operation', duration, {
        operation: 'database-query',
        user: interaction.user.id
    });
}
```

### Memory Usage Monitoring

```javascript
const memUsage = process.memoryUsage();
logger.info('Memory usage', {
    category: 'performance',
    rss: memUsage.rss,
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal
});
```

## 🧪 Testing Guidelines

### Command Testing

```javascript
describe('Command Tests', () => {
    let command;
    let interaction;
    
    beforeEach(() => {
        command = require('../../commands/category/command');
        interaction = {
            ...global.mockInteraction,
            options: {
                getString: jest.fn(),
                getUser: jest.fn(),
                getInteger: jest.fn()
            }
        };
    });
    
    test('should handle valid input', async () => {
        interaction.options.getString.mockReturnValue('valid input');
        
        await command.execute(interaction);
        
        expect(interaction.reply).toHaveBeenCalledWith(
            expect.objectContaining({
                embeds: expect.arrayContaining([
                    expect.objectContaining({
                        title: expect.stringContaining('Expected Title')
                    })
                ])
            })
        );
    });
});
```

### Utility Testing

```javascript
describe('Utility Tests', () => {
    test('should format duration correctly', () => {
        const result = formatDuration(3661000); // 1h 1m 1s
        expect(result).toBe('1h 1m 1s');
    });
});
```

## 🚀 Deployment

### Development Deployment

```bash
# Start with PM2
npm install -g pm2
pm2 start ecosystem.config.js --env development

# Monitor logs
pm2 logs malluclub-bot

# Restart
pm2 restart malluclub-bot
```

### Production Deployment

```bash
# Build and deploy with Docker
docker build -t malluclub-bot .
docker run -d --name malluclub-bot --env-file .env malluclub-bot

# Or use PM2
pm2 start ecosystem.config.js --env production
```

## 📚 Best Practices

### 1. Code Style
- Use ESLint and Prettier configurations
- Follow consistent naming conventions
- Add JSDoc comments for complex functions
- Keep functions small and focused

### 2. Error Handling
- Always wrap command execution in try-catch
- Use structured logging for errors
- Provide user-friendly error messages
- Log enough context for debugging

### 3. Performance
- Use database indexes appropriately
- Implement command cooldowns
- Monitor memory usage
- Cache frequently accessed data

### 4. Security
- Validate all user inputs
- Use parameterized database queries
- Implement rate limiting
- Log security events

### 5. Testing
- Write tests for all commands
- Test error conditions
- Mock external dependencies
- Maintain good test coverage

## 🔗 Useful Resources

- [Discord.js Documentation](https://discord.js.org/#/docs/discord.js/stable/general/welcome)
- [Discord Developer Portal](https://discord.com/developers/docs)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [ESLint Configuration](https://eslint.org/docs/user-guide/configuring/)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
- [Winston Logging](https://github.com/winstonjs/winston)
- [Mongoose ODM](https://mongoosejs.com/docs/guide.html)
