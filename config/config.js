/**
 * Configuration utility for the Mallu Club Bot
 * Handles environment variables and default settings
 */

require('dotenv').config();

const config = {
    // Bot Configuration
    bot: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.CLIENT_ID,
        guildId: process.env.GUILD_ID,
        prefix: '!', // Fallback prefix for non-slash commands
        owners: process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : [],
        supportServer: 'https://discord.gg/malluclub',
        inviteLink: 'https://discord.com/api/oauth2/authorize?client_id=1394413129860911217&permissions=8&scope=bot%20applications.commands'
    },
    
    // Database Configuration
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/malluclub',
        options: {
            // Modern connection options (deprecated options removed)
        }
    },
    
    // Channel Configuration
    channels: {
        welcome: process.env.WELCOME_CHANNEL_ID,
        logs: process.env.LOG_CHANNEL_ID,
        modLogs: process.env.MOD_LOG_CHANNEL_ID || process.env.LOG_CHANNEL_ID,
        general: process.env.GENERAL_CHANNEL_ID,
        rules: process.env.RULES_CHANNEL_ID
    },
    
    // Role Configuration
    roles: {
        auto: process.env.AUTO_ROLE_ID,
        moderator: process.env.MODERATOR_ROLE_ID,
        admin: process.env.ADMIN_ROLE_ID,
        muted: process.env.MUTED_ROLE_ID,
        member: process.env.MEMBER_ROLE_ID,
        malayali: process.env.MALAYALI_ROLE_ID
    },
    
    // Moderation Configuration
    moderation: {
        maxWarnings: parseInt(process.env.MAX_WARNINGS) || 3,
        defaultMuteDuration: process.env.DEFAULT_MUTE_DURATION || '1h',
        autoModeration: process.env.AUTO_MODERATION === 'true',
        antiSpam: process.env.ANTI_SPAM === 'true'
    },
    
    // Feature Flags
    features: {
        welcomeSystem: process.env.WELCOME_SYSTEM !== 'false',
        loggingSystem: process.env.LOGGING_SYSTEM !== 'false',
        autoRole: process.env.AUTO_ROLE_SYSTEM !== 'false',
        funCommands: process.env.FUN_COMMANDS !== 'false',
        moderationCommands: process.env.MODERATION_COMMANDS !== 'false'
    },
    
    // API Configuration
    apis: {
        weather: process.env.WEATHER_API_KEY,
        news: process.env.NEWS_API_KEY,
        translate: process.env.TRANSLATE_API_KEY
    },
    
    // Embeds Configuration
    embeds: {
        colors: {
            primary: '#0099ff',
            success: '#00ff00',
            warning: '#ffff00',
            error: '#ff0000',
            info: '#0099ff',
            moderation: '#ff6600'
        },
        footer: {
            text: 'Mallu Club',
            iconURL: 'https://cdn.discordapp.com/attachments/your-attachment-url'
        }
    },
    
    // Cooldowns (in seconds)
    cooldowns: {
        default: 3,
        moderation: 5,
        fun: 3,
        info: 2
    },
    
    // Validation
    validate() {
        const required = ['bot.token', 'bot.clientId'];
        const missing = [];
        
        for (const path of required) {
            const value = path.split('.').reduce((obj, key) => obj?.[key], this);
            if (!value) {
                missing.push(path);
            }
        }
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }
        
        return true;
    }
};

module.exports = config;
