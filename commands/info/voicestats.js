const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const VoiceActivity = require('../../models/VoiceActivity');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voicestats')
        .setDescription('View detailed voice activity statistics')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check stats for (default: yourself)')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        // Show loading state
        await interaction.reply({ 
            content: `📊 Fetching voice activity data for ${targetUser.username}...`,
            ephemeral: true
        });
        
        try {
            const userStats = await VoiceActivity.findOne({
                userId: targetUser.id,
                guildId: interaction.guild.id
            });

            if (!userStats) {
                const noDataEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('📊 No Voice Activity')
                    .setDescription(
                        targetUser.id === interaction.user.id 
                            ? 'You haven\'t joined any voice channels yet! Join one to start earning XP.'
                            : `${targetUser.username} hasn't joined any voice channels yet.`
                    )
                    .setTimestamp();
                    
                return interaction.editReply({ content: null, embeds: [noDataEmbed] });
            }

            // Get user's rank
            const rank = await VoiceActivity.countDocuments({
                guildId: interaction.guild.id,
                voiceXP: { $gt: userStats.voiceXP }
            }) + 1;

            // Calculate next level info
            const nextLevelXP = VoiceActivity.getXPForNextLevel(userStats.level);
            const currentLevelXP = userStats.level > 1 ? VoiceActivity.getXPForNextLevel(userStats.level - 1) : 0;
            const progress = Math.max(0, userStats.voiceXP - currentLevelXP);
            const needed = Math.max(1, nextLevelXP - currentLevelXP);
            const percentage = Math.min(100, Math.max(0, Math.round((progress / needed) * 100)));

            // Calculate average session time
            const avgSessionTime = userStats.sessions && userStats.sessions.length > 0 
                ? userStats.totalVoiceTime / userStats.sessions.length 
                : 0;

            // Get most active channel
            const channelCounts = {};
            if (userStats.sessions && userStats.sessions.length > 0) {
                userStats.sessions.forEach(session => {
                    if (session.channelName) {
                        channelCounts[session.channelName] = (channelCounts[session.channelName] || 0) + 1;
                    }
                });
            }
            const mostActiveChannel = Object.keys(channelCounts).length > 0 
                ? Object.keys(channelCounts).reduce((a, b) => 
                    channelCounts[a] > channelCounts[b] ? a : b) 
                : 'None';

            // Recent activity (last 7 days)
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const recentSessions = userStats.sessions && userStats.sessions.length > 0
                ? userStats.sessions.filter(session => 
                    session.joinTime && new Date(session.joinTime) > weekAgo)
                : [];
            const recentTime = recentSessions.reduce((total, session) => 
                total + (session.duration || 0), 0);

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setAuthor({
                    name: `${targetUser.username}'s Voice Stats`,
                    iconURL: targetUser.displayAvatarURL()
                })
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    {
                        name: '🏆 Ranking',
                        value: [
                            `**Server Rank:** #${rank}`,
                            `**Level:** ${userStats.level || 1}`,
                            `**Total XP:** ${(userStats.voiceXP || 0).toLocaleString()}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '⏱️ Time Stats',
                        value: [
                            `**Total Time:** ${formatTime(userStats.totalVoiceTime || 0)}`,
                            `**Sessions:** ${(userStats.sessions && userStats.sessions.length) || 0}`,
                            `**Avg Session:** ${formatTime(avgSessionTime)}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🔥 Activity',
                        value: [
                            `**Current Streak:** ${(userStats.dailyStats && userStats.dailyStats.streak) || 0} days`,
                            `**Today's Time:** ${formatTime((userStats.dailyStats && userStats.dailyStats.todayVoiceTime) || 0)}`,
                            `**This Week:** ${formatTime(recentTime)}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🎯 Level Progress',
                        value: [
                            `**Next Level:** ${(userStats.level || 1) + 1}`,
                            `**Progress:** ${progress}/${needed} XP (${percentage}%)`,
                            `**XP Needed:** ${Math.max(0, nextLevelXP - (userStats.voiceXP || 0))}`,
                            createProgressBar(percentage)
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '📊 Preferences',
                        value: [
                            `**Favorite Channel:** ${mostActiveChannel}`,
                            `**Last Active:** ${userStats.lastXPUpdate ? `<t:${Math.floor(userStats.lastXPUpdate.getTime() / 1000)}:R>` : 'Never'}`,
                            `**Member Since:** <t:${Math.floor(userStats.createdAt.getTime() / 1000)}:D>`
                        ].join('\n'),
                        inline: false
                    }
                );

            // Add achievements if any
            if (userStats.achievements.length > 0) {
                const achievementsList = userStats.achievements
                    .slice(-5) // Show last 5 achievements
                    .map(achievement => `🏆 **${achievement.name}** - ${achievement.description}`)
                    .join('\n');

                embed.addFields({
                    name: `🎖️ Recent Achievements (${userStats.achievements.length} total)`,
                    value: achievementsList,
                    inline: false
                });
            }

            // Add current session info if user is in voice
            if (userStats.currentSession && userStats.currentSession.isActive && userStats.currentSession.joinTime) {
                const sessionDuration = Date.now() - userStats.currentSession.joinTime.getTime();
                const channel = interaction.guild.channels.cache.get(userStats.currentSession.channelId);
                
                embed.addFields({
                    name: '🎤 Current Session',
                    value: [
                        `**Channel:** ${channel ? channel.name : 'Unknown'}`,
                        `**Duration:** ${formatTime(sessionDuration)}`,
                        `**XP Earning:** ${VoiceActivity.calculateXP(sessionDuration)} XP`
                    ].join('\n'),
                    inline: true
                });
            }

            embed.setFooter({
                text: `Requested by ${interaction.user.tag} • Voice XP System`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

            await interaction.editReply({ content: null, embeds: [embed] });

        } catch (error) {
            logger.logError(error, {
                context: 'Voice stats command',
                userId: interaction.user.id,
                targetUserId: targetUser.id,
                guildId: interaction.guild.id
            });
            
            console.error('Voice stats error:', error);
            
            await interaction.editReply({
                content: '❌ Error fetching voice statistics. Please try again later.',
                embeds: []
            });
        }
    },
};

function formatTime(milliseconds) {
    // Handle null, undefined, or negative values
    if (!milliseconds || milliseconds < 0) {
        return '0m';
    }
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

function createProgressBar(percentage, length = 10) {
    // Ensure percentage is within valid range
    const validPercentage = Math.max(0, Math.min(100, percentage || 0));
    const filled = Math.round((validPercentage / 100) * length);
    const empty = Math.max(0, length - filled);
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${validPercentage}%`;
}
