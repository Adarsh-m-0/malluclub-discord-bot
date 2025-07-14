const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`✅ ${client.user.tag} is online and ready!`);
        console.log(`🏠 Serving ${client.guilds.cache.size} guild(s)`);
        console.log(`👥 Watching ${client.users.cache.size} user(s)`);
        
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
