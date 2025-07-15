const { Client, GatewayIntentBits, Collection, ActivityType, Partials } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const XPManager = require('./utils/XPManager');
const DailyRoleScheduler = require('./utils/DailyRoleScheduler');
require('dotenv').config();

// Initialize Discord client with necessary intents and partials
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember
    ],
    // Increase message cache to reduce "Unknown User" in deletion logs
    makeCache: (manager) => {
        if (manager.name === 'MessageManager') {
            return new Collection(); // Keep more messages in cache
        }
        return new Collection();
    },
    // Set message cache sweep interval
    sweepers: {
        messages: {
            interval: 300, // 5 minutes
            lifetime: 1800, // 30 minutes
        },
    }
});

// Collections for commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// Load command files
const commandsPath = join(__dirname, 'commands');
const commandFolders = readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    try {
        const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const filePath = join(folderPath, file);
            try {
                const command = require(filePath);
                
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    logger.info(`Loaded command: ${command.data.name}`, { 
                        category: 'startup', 
                        command: command.data.name,
                        folder: folder 
                    });
                } else {
                    logger.warn(`Command at ${filePath} is missing required "data" or "execute" property`, {
                        category: 'startup',
                        file: filePath
                    });
                }
            } catch (error) {
                logger.logError(error, {
                    category: 'startup',
                    context: `Failed to load command ${file}`,
                    file: filePath
                });
            }
        }
    } catch (error) {
        logger.logError(error, {
            category: 'startup',
            context: `Failed to read command folder ${folder}`,
            folder: folder
        });
    }
}

// Load event files
const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    logger.info(`Loaded event: ${event.name}`, {
        category: 'startup',
        event: event.name,
        once: event.once || false
    });
}

// Connect to MongoDB
logger.info('Connecting to MongoDB...', { category: 'database' });
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/malluclub')
.then(() => {
    logger.database('Connected to MongoDB successfully');
}).catch(err => {
    logger.logError(err, {
        category: 'database',
        context: 'MongoDB connection failed'
    });
});

// Global error handling
process.on('unhandledRejection', error => {
    logger.logError(error, {
        category: 'system',
        context: 'Unhandled promise rejection'
    });
});

process.on('uncaughtException', error => {
    logger.logError(error, {
        category: 'system',
        context: 'Uncaught exception - shutting down'
    });
    // Graceful shutdown
    client.destroy();
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    logger.shutdown();
    logger.info('Received SIGINT - graceful shutdown initiated', { category: 'system' });
    XPManager.clearAllTracking();
    
    // Stop daily role scheduler
    if (client.dailyRoleScheduler) {
        client.dailyRoleScheduler.stop();
    }
    
    client.destroy();
    mongoose.connection.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.shutdown();
    logger.info('Received SIGTERM - graceful shutdown initiated', { category: 'system' });
    XPManager.clearAllTracking();
    
    // Stop daily role scheduler
    if (client.dailyRoleScheduler) {
        client.dailyRoleScheduler.stop();
    }
    
    client.destroy();
    mongoose.connection.close();
    process.exit(0);
});

// Login to Discord
logger.startup();
logger.info('Attempting to login to Discord...', { category: 'startup' });
client.login(process.env.DISCORD_TOKEN).catch(error => {
    logger.logError(error, {
        category: 'startup',
        context: 'Failed to login to Discord'
    });
    process.exit(1);
});
