// Note: node-cron package is required for automatic scheduling
// Install it with: npm install node-cron
// For now, manual updates are available through the /vcactive update command

let cron;
try {
    cron = require('node-cron');
} catch (error) {
    console.warn('node-cron package not found. Automatic scheduling disabled. Install with: npm install node-cron');
    cron = null;
}

const VcActiveManager = require('../utils/VcActiveManager');

class DailyRoleScheduler {
    constructor(client) {
        this.client = client;
        this.vcActiveManager = new VcActiveManager();
        this.isRunning = false;
        this.cronEnabled = !!cron;
        this.scheduledJobs = []; // Track scheduled jobs for cleanup
    }

    /**
     * Start the daily role update scheduler
     */
    start() {
        if (!this.cronEnabled) {
            console.log('⚠️  Daily role scheduler disabled - node-cron package not found');
            console.log('   Install with: npm install node-cron');
            console.log('   Use /vcactive update command for manual updates');
            return;
        }

        // Run every day at midnight (00:00)
        const midnightJob = cron.schedule('0 0 * * *', async () => {
            console.log('Starting daily VC active role update...');
            await this.runDailyUpdate();
        }, {
            scheduled: true,
            timezone: "UTC"
        });

        // Also run at 6 AM, 12 PM, 6 PM for more frequent updates
        const regularJob = cron.schedule('0 6,12,18 * * *', async () => {
            console.log('Starting scheduled VC active role update...');
            await this.runDailyUpdate();
        }, {
            scheduled: true,
            timezone: "UTC"
        });

        // Store jobs for cleanup
        this.scheduledJobs.push(midnightJob, regularJob);

        console.log('Daily VC active role scheduler started');
    }

    /**
     * Stop the scheduler and cleanup
     */
    stop() {
        if (this.scheduledJobs.length > 0) {
            this.scheduledJobs.forEach(job => {
                if (job && job.stop) {
                    job.stop();
                }
            });
            this.scheduledJobs = [];
            console.log('Daily VC active role scheduler stopped');
        }
    }

    /**
     * Run the daily update for all guilds
     */
    async runDailyUpdate() {
        if (this.isRunning) {
            console.log('Daily update already running, skipping...');
            return;
        }

        this.isRunning = true;
        
        try {
            console.log('Running daily VC active role update...');
            
            // Get all guilds the bot is in
            const guilds = this.client.guilds.cache;
            let totalUpdated = 0;
            let totalAdded = 0;
            let totalRemoved = 0;

            for (const [guildId, guild] of guilds) {
                try {
                    console.log(`Updating roles for guild: ${guild.name} (${guildId})`);
                    
                    // Update streaks first
                    await this.vcActiveManager.updateStreaks(guildId);
                    
                    // Update roles
                    const result = await this.vcActiveManager.updateDailyRoles(this.client, guildId);
                    
                    totalUpdated++;
                    totalAdded += result.added;
                    totalRemoved += result.removed;
                    
                    console.log(`Guild ${guild.name}: Added ${result.added}, Removed ${result.removed} roles`);
                    
                    // Send update to log channel if configured
                    await this.sendUpdateLog(guild, result);
                    
                } catch (error) {
                    console.error(`Error updating roles for guild ${guildId}:`, error);
                }
            }

            console.log(`Daily update completed: ${totalUpdated} guilds, ${totalAdded} roles added, ${totalRemoved} roles removed`);
            
        } catch (error) {
            console.error('Error in daily update:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Send update log to guild's log channel
     */
    async sendUpdateLog(guild, updateResult) {
        try {
            // Look for a log channel (you can customize this)
            const logChannel = guild.channels.cache.find(channel => 
                channel.name.includes('log') || 
                channel.name.includes('bot') ||
                channel.name.includes('admin')
            );

            if (!logChannel) return;

            if (updateResult.added === 0 && updateResult.removed === 0) return;

            const { EmbedBuilder, Colors } = require('discord.js');
            
            const embed = new EmbedBuilder()
                .setTitle('🎤 VC Active Role Update')
                .setColor(Colors.Green)
                .setTimestamp();

            const leaderboard = await this.vcActiveManager.getLeaderboard(guild.id, null, 5);
            
            // Fetch actual Discord usernames for users that show "Unknown User"
            const enhancedLeaderboard = [];
            for (const user of leaderboard) {
                let displayName = user.username;
                
                // If username is missing or "Unknown User", fetch from Discord
                if (!user.username || user.username === 'Unknown User') {
                    try {
                        const discordUser = await this.client.users.fetch(user.userId);
                        displayName = discordUser.username;
                    } catch (error) {
                        console.log(`Could not fetch username for user ${user.userId}`);
                        displayName = 'Unknown User';
                    }
                }
                
                enhancedLeaderboard.push({
                    ...user,
                    username: displayName
                });
            }
            
            let description = '';
            if (updateResult.added > 0) {
                description += `✅ **${updateResult.added}** user(s) received the VC Active role\n`;
            }
            if (updateResult.removed > 0) {
                description += `❌ **${updateResult.removed}** user(s) lost the VC Active role\n`;
            }

            if (enhancedLeaderboard.length > 0) {
                description += '\n**Today\'s Top Voice Users:**\n';
                enhancedLeaderboard.slice(0, 3).forEach(user => {
                    const medal = user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉';
                    const roleIndicator = user.hadVcActiveRole ? ' 👑' : '';
                    description += `${medal} ${user.username}${roleIndicator} - ${user.formattedTime}\n`;
                });
            }

            embed.setDescription(description);
            embed.setFooter({ text: '👑 = Has VC Active role' });

            await logChannel.send({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error sending update log:', error);
        }
    }

    /**
     * Manual trigger for testing
     */
    async manualUpdate(guildId = null) {
        if (guildId) {
            await this.vcActiveManager.updateStreaks(guildId);
            return await this.vcActiveManager.updateDailyRoles(this.client, guildId);
        } else {
            await this.runDailyUpdate();
        }
    }
}

module.exports = DailyRoleScheduler;
