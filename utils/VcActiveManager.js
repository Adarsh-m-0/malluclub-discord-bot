const { EmbedBuilder, Colors } = require('discord.js');
const DailyVoiceActivity = require('../models/DailyVoiceActivity');

class VcActiveManager {
    constructor() {
        this.MINIMUM_MINUTES = 30; // Minimum minutes to be considered for VC active role
        this.ROLE_NAME = 'vc active';
        this.VC_ACTIVE_ROLE_ID = '1394785780387414178'; // Replace with your actual role ID
        this.TOP_USERS_COUNT = 3;
        this.STREAK_THRESHOLD = 3; // Days to maintain streak
    }

    /**
     * Update daily voice activity for a user
     */
    async updateUserActivity(userId, guildId, username, voiceMinutes, xpEarned) {
        try {
            return await DailyVoiceActivity.updateDailyActivity(
                userId, 
                guildId, 
                username, 
                voiceMinutes, 
                xpEarned
            );
        } catch (error) {
            console.error('Error updating user activity:', error);
            throw error;
        }
    }

    /**
     * Get today's top voice users
     */
    async getTodayTopUsers(guildId, limit = this.TOP_USERS_COUNT) {
        try {
            const today = DailyVoiceActivity.getTodayDate();
            return await DailyVoiceActivity.getTopUsers(guildId, today, limit);
        } catch (error) {
            console.error('Error getting top users:', error);
            throw error;
        }
    }

    /**
     * Get or create the VC active role
     */
    async getOrCreateVcActiveRole(guild) {
        try {
            // First try to get role by ID (faster and more reliable)
            if (this.VC_ACTIVE_ROLE_ID && this.VC_ACTIVE_ROLE_ID !== 'YOUR_ROLE_ID_HERE') {
                const role = guild.roles.cache.get(this.VC_ACTIVE_ROLE_ID);
                if (role) return role;
            }

            // Fallback to search by name
            let role = guild.roles.cache.find(r => r.name.toLowerCase() === this.ROLE_NAME);
            
            if (!role) {
                role = await guild.roles.create({
                    name: this.ROLE_NAME,
                    color: Colors.Green,
                    reason: 'VC Active role for top voice users',
                    permissions: []
                });
                console.log(`Created VC Active role in guild ${guild.id}`);
                console.log(`⚠️  Please update VC_ACTIVE_ROLE_ID to: ${role.id}`);
            }
            
            return role;
        } catch (error) {
            console.error('Error getting/creating VC active role:', error);
            throw error;
        }
    }

    /**
     * Update daily VC active roles
     */
    async updateDailyRoles(client, guildId) {
        try {
            const guild = await client.guilds.fetch(guildId);
            if (!guild) return;

            const vcActiveRole = await this.getOrCreateVcActiveRole(guild);
            const topUsers = await this.getTodayTopUsers(guildId);

            // Get current role holders
            const currentRoleHolders = vcActiveRole.members.map(member => member.id);
            
            // Get new role holders (top users with minimum activity)
            const newRoleHolders = topUsers
                .filter(user => user.voiceMinutes >= this.MINIMUM_MINUTES)
                .map(user => user.userId);

            // Remove role from users who no longer qualify
            const toRemove = currentRoleHolders.filter(userId => !newRoleHolders.includes(userId));
            for (const userId of toRemove) {
                try {
                    const member = await guild.members.fetch(userId);
                    if (member) {
                        await member.roles.remove(vcActiveRole);
                        console.log(`Removed VC Active role from ${member.user.tag}`);
                    }
                } catch (error) {
                    console.error(`Error removing role from user ${userId}:`, error);
                }
            }

            // Add role to new top users
            const toAdd = newRoleHolders.filter(userId => !currentRoleHolders.includes(userId));
            for (const userId of toAdd) {
                try {
                    const member = await guild.members.fetch(userId);
                    if (member) {
                        await member.roles.add(vcActiveRole);
                        console.log(`Added VC Active role to ${member.user.tag}`);
                    }
                } catch (error) {
                    console.error(`Error adding role to user ${userId}:`, error);
                }
            }

            // Update database records
            await this.updateRoleStatus(guildId, newRoleHolders);

            return {
                topUsers,
                added: toAdd.length,
                removed: toRemove.length,
                roleHolders: newRoleHolders
            };
        } catch (error) {
            console.error('Error updating daily roles:', error);
            throw error;
        }
    }

    /**
     * Update role status in database
     */
    async updateRoleStatus(guildId, roleHolders) {
        try {
            const today = DailyVoiceActivity.getTodayDate();
            
            // Mark all users as not having role
            await DailyVoiceActivity.updateMany(
                { guildId, date: today },
                { $set: { hadVcActiveRole: false } }
            );

            // Mark role holders as having role
            if (roleHolders.length > 0) {
                await DailyVoiceActivity.updateMany(
                    { 
                        guildId, 
                        date: today, 
                        userId: { $in: roleHolders } 
                    },
                    { $set: { hadVcActiveRole: true } }
                );
            }
        } catch (error) {
            console.error('Error updating role status:', error);
            throw error;
        }
    }

    /**
     * Get leaderboard for a specific date
     */
    async getLeaderboard(guildId, date = null, limit = 10) {
        try {
            const targetDate = date || DailyVoiceActivity.getTodayDate();
            const users = await DailyVoiceActivity.getTopUsers(guildId, targetDate, limit);
            
            return users.map((user, index) => ({
                rank: index + 1,
                userId: user.userId,
                username: user.username,
                voiceMinutes: user.voiceMinutes,
                xpEarned: user.xpEarned,
                streak: user.streak,
                hadVcActiveRole: user.hadVcActiveRole,
                formattedTime: this.formatMinutes(user.voiceMinutes)
            }));
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            throw error;
        }
    }

    /**
     * Format minutes into readable time
     */
    formatMinutes(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    }

    /**
     * Create leaderboard embed
     */
    createLeaderboardEmbed(leaderboard, guildName, date = null) {
        const embed = new EmbedBuilder()
            .setTitle(`🎤 Voice Activity Leaderboard`)
            .setColor(Colors.Green)
            .setTimestamp();

        if (guildName) {
            embed.setAuthor({ name: guildName });
        }

        if (date) {
            embed.setDescription(`**Date:** ${date.toDateString()}`);
        }

        if (leaderboard.length === 0) {
            embed.setDescription('No voice activity recorded yet today!');
            return embed;
        }

        const description = leaderboard.map(user => {
            const medal = user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : '🏅';
            const roleIndicator = user.hadVcActiveRole ? '👑' : '';
            
            return `${medal} **${user.rank}.** ${user.username} ${roleIndicator}\n` +
                   `⏱️ **${user.formattedTime}** | 🌟 **${user.xpEarned} XP**`;
        }).join('\n\n');

        embed.setDescription(description);
        embed.setFooter({ text: `👑 = Has VC Active role | Minimum ${this.MINIMUM_MINUTES} minutes for role` });

        return embed;
    }

    /**
     * Check and update streaks for all users
     */
    async updateStreaks(guildId) {
        try {
            const today = DailyVoiceActivity.getTodayDate();
            const users = await DailyVoiceActivity.find({ guildId, date: today });

            for (const user of users) {
                const streak = await DailyVoiceActivity.calculateStreak(user.userId, guildId);
                user.streak = streak;
                await user.save();
            }

            console.log(`Updated streaks for ${users.length} users in guild ${guildId}`);
        } catch (error) {
            console.error('Error updating streaks:', error);
            throw error;
        }
    }

    /**
     * Get user's voice activity stats
     */
    async getUserStats(userId, guildId, days = 7) {
        try {
            const endDate = DailyVoiceActivity.getTodayDate();
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - days);

            const activities = await DailyVoiceActivity.find({
                userId,
                guildId,
                date: { $gte: startDate, $lte: endDate }
            }).sort({ date: -1 });

            const totalMinutes = activities.reduce((sum, activity) => sum + activity.voiceMinutes, 0);
            const totalXP = activities.reduce((sum, activity) => sum + activity.xpEarned, 0);
            const currentStreak = activities.length > 0 ? activities[0].streak : 0;
            const daysActive = activities.filter(a => a.voiceMinutes > 0).length;

            return {
                totalMinutes,
                totalXP,
                currentStreak,
                daysActive,
                averageDaily: totalMinutes / days,
                activities: activities.map(a => ({
                    date: a.date,
                    minutes: a.voiceMinutes,
                    xp: a.xpEarned,
                    hadRole: a.hadVcActiveRole
                }))
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    }
}

module.exports = VcActiveManager;
