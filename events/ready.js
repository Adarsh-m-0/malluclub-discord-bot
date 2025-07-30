const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const XPManager = require('../utils/XPManager');
const DailyRoleScheduler = require('../utils/DailyRoleScheduler');
const AIScheduler = require('../utils/AIScheduler');
const inviteTracker = require('../utils/InviteTracker');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
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
        
        // Initialize voice tracking for users already in voice channels
        try {
            let voiceUsersCount = 0;
            for (const guild of client.guilds.cache.values()) {
                for (const channel of guild.channels.cache.values()) {
                    if (channel.type === 2) { // Voice channel
                        for (const member of channel.members.values()) {
                            if (!member.user.bot) {
                                // Get the voice state for proper initialization
                                const voiceState = member.voice;
                                
                                // Track all users (including muted ones)
                                await XPManager.startVoiceTracking(member.id, guild.id, channel, voiceState);
                                voiceUsersCount++;
                            }
                        }
                    }
                }
            }
            logger.info(`Initialized XP tracking for ${voiceUsersCount} users in voice channels`, {
                category: 'startup',
                voiceUsers: voiceUsersCount
            });
        } catch (error) {
            logger.logError(error, {
                category: 'startup',
                context: 'Failed to initialize voice XP tracking'
            });
        }
        
        // Initialize daily role scheduler
        try {
            const dailyRoleScheduler = new DailyRoleScheduler(client);
            dailyRoleScheduler.start();
            
            // Store scheduler instance for cleanup
            client.dailyRoleScheduler = dailyRoleScheduler;
            
            logger.info('Daily VC active role scheduler initialized', {
                category: 'startup'
            });

            // Run initial role update for all guilds on startup
            logger.info('Running initial VC active role update on startup...', {
                category: 'startup'
            });
            
            // Wait a bit for the bot to be fully ready
            setTimeout(async () => {
                await dailyRoleScheduler.runDailyUpdate();
                logger.info('Initial VC active role update completed', {
                    category: 'startup'
                });
            }, 5000); // 5 second delay
            
        } catch (error) {
            logger.logError(error, {
                category: 'startup',
                context: 'Failed to initialize daily role scheduler'
            });
        }
        
        // Initialize AI scheduler for conversation cleanup
        try {
            AIScheduler.start();
            logger.info('AI maintenance scheduler initialized', {
                category: 'startup'
            });
        } catch (error) {
            logger.logError(error, {
                category: 'startup',
                context: 'Failed to initialize AI scheduler'
            });
        }

        // Initialize invite tracking for all guilds
        try {
            for (const guild of client.guilds.cache.values()) {
                await inviteTracker.initializeGuild(guild);
            }
            logger.info('Invite tracking initialized for all guilds', {
                category: 'startup',
                guilds: client.guilds.cache.size
            });
        } catch (error) {
            logger.logError(error, {
                category: 'startup',
                context: 'Failed to initialize invite tracking'
            });
        }
        
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
