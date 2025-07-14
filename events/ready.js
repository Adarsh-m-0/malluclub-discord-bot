const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        logger.discord(`${client.user.tag} is online and ready!`, {
            userId: client.user.id,
            guilds: client.guilds.cache.size,
            users: client.users.cache.size
        });
        
        logger.info(`Serving ${client.guilds.cache.size} guild(s)`, { 
            category: 'startup',
            guilds: client.guilds.cache.size 
        });
        
        logger.info(`Watching ${client.users.cache.size} user(s)`, { 
            category: 'startup',
            users: client.users.cache.size 
        });
        
        // Set bot status
        client.user.setActivity('Mallu Club | /help', { 
            type: ActivityType.Watching 
        });
        
        // Update activity every 5 minutes
        setInterval(() => {
            const activities = [
                'Mallu Club | /help',
                'Managing communities 🤖',
                'Keeping servers safe 🛡️',
                'Having fun with members 🎉'
            ];
            
            const randomActivity = activities[Math.floor(Math.random() * activities.length)];
            client.user.setActivity(randomActivity, { 
                type: ActivityType.Watching 
            });
        }, 300000); // 5 minutes
    },
};
