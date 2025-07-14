const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const VoiceActivity = require('../../models/VoiceActivity');
const { EmbedTemplates, Colors } = require('../../utils/EmbedTemplates');
const { EmbedUtils } = require('../../utils/EmbedUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voiceleaderboard')
        .setDescription('View voice activity leaderboards and statistics')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of leaderboard to view')
                .setRequired(false)
                .addChoices(
                    { name: 'Voice XP', value: 'xp' },
                    { name: 'Total Time', value: 'time' },
                    { name: 'Daily Streak', value: 'streak' },
                    { name: 'Level', value: 'level' }
                ))
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of users to show (1-20)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(20)),

    async execute(interaction) {
        const type = interaction.options.getString('type') || 'xp';
        const limit = interaction.options.getInteger('limit') || 10;

        // Show loading state
        const loadingEmbed = EmbedUtils.createLoading(
            'Loading Leaderboard',
            '📊 Fetching voice activity data...'
        );
        await interaction.reply({ embeds: [loadingEmbed] });

        try {
            let sortField;
            let title;
            let description;
            let emoji;
            let color;

            switch (type) {
                case 'xp':
                    sortField = { voiceXP: -1 };
                    title = 'Voice XP Leaderboard';
                    description = 'Top members by voice experience points';
                    emoji = '💎';
                    color = Colors.VOICE_XP;
                    break;
                case 'time':
                    sortField = { totalVoiceTime: -1 };
                    title = 'Voice Time Leaderboard';
                    description = 'Top members by total voice time';
                    emoji = '⏱️';
                    color = Colors.INFO;
                    break;
                case 'streak':
                    sortField = { 'dailyStats.streak': -1 };
                    title = 'Voice Streak Leaderboard';
                    description = 'Top members by daily voice activity streak';
                    emoji = '🔥';
                    color = Colors.ERROR;
                    break;
                case 'level':
                    sortField = { level: -1, voiceXP: -1 };
                    title = 'Voice Level Leaderboard';
                    description = 'Top members by voice level';
                    emoji = '🌟';
                    color = Colors.YELLOW;
                    break;
            }

            const topUsers = await VoiceActivity.find({ guildId: interaction.guild.id })
                .sort(sortField)
                .limit(limit);

            if (topUsers.length === 0) {
                const noDataEmbed = EmbedTemplates.info(
                    'No Voice Activity',
                    '📊 No voice activity data found yet. Join a voice channel to start earning XP!',
                    interaction.guild
                );
                return interaction.editReply({ embeds: [noDataEmbed], components: [] });
            }

            // Get user's own stats
            const userStats = await VoiceActivity.findOne({
                userId: interaction.user.id,
                guildId: interaction.guild.id
            });

            // Create enhanced leaderboard embed
            const embed = EmbedTemplates.leaderboard(type, interaction.guild)
                .setTitle(`${emoji} ${title}`)
                .setColor(color);

            // Enhanced leaderboard formatting
            let leaderboardText = '';
            const medals = ['🥇', '🥈', '🥉'];
            const gems = ['💎', '🔷', '🔹', '◾', '🔸'];

            for (let i = 0; i < topUsers.length; i++) {
                const user = topUsers[i];
                const rank = i + 1;
                
                // Enhanced emoji selection
                let rankEmoji;
                if (rank <= 3) {
                    rankEmoji = medals[rank - 1];
                } else if (rank <= 10) {
                    rankEmoji = gems[Math.min(rank - 4, gems.length - 1)];
                } else {
                    rankEmoji = '▫️';
                }
                
                let value;
                let extraInfo = '';
                
                switch (type) {
                    case 'xp':
                        value = `**${EmbedUtils.formatNumber(user.voiceXP)} XP**`;
                        extraInfo = `🌟 Level ${user.level}`;
                        break;
                    case 'time':
                        value = `**${EmbedUtils.formatDuration(user.totalVoiceTime)}**`;
                        extraInfo = `💎 ${EmbedUtils.formatNumber(user.voiceXP)} XP`;
                        break;
                    case 'streak':
                        value = `**${user.dailyStats.streak} days**`;
                        extraInfo = `💎 ${EmbedUtils.formatNumber(user.voiceXP)} XP`;
                        break;
                    case 'level':
                        value = `**Level ${user.level}**`;
                        extraInfo = `💎 ${EmbedUtils.formatNumber(user.voiceXP)} XP`;
                        break;
                }

                leaderboardText += `${rankEmoji} **#${rank}** ${user.username}\n`;
                leaderboardText += `   ${value} • ${extraInfo}\n\n`;
            }

            embed.setDescription(leaderboardText);

            // Add enhanced statistics
            const totalUsers = await VoiceActivity.countDocuments({ guildId: interaction.guild.id });
            const totalVoiceTime = await VoiceActivity.aggregate([
                { $match: { guildId: interaction.guild.id } },
                { $group: { _id: null, total: { $sum: "$totalVoiceTime" } } }
            ]);

            embed.addFields(
                EmbedUtils.createField('📊 Total Tracked Users', totalUsers.toLocaleString(), true),
                EmbedUtils.createField('⏱️ Combined Voice Time', 
                    totalVoiceTime[0] ? EmbedUtils.formatDuration(totalVoiceTime[0].total) : '0s', true),
                EmbedUtils.createField('📄 Showing Top', `${Math.min(limit, topUsers.length)}`, true)
            );

            // Add user's personal stats if they have any
            if (userStats) {
                const userRank = await VoiceActivity.countDocuments({
                    guildId: interaction.guild.id,
                    voiceXP: { $gt: userStats.voiceXP }
                }) + 1;

                // Enhanced personal stats section
                embed.addFields(
                    EmbedUtils.createField('\u200B', '\u200B', false), // Spacer
                    EmbedUtils.createField('📈 Your Stats', [
                        `**Rank:** #${userRank.toLocaleString()}`,
                        `**Level:** ${userStats.level}`,
                        `**XP:** ${EmbedUtils.formatNumber(userStats.voiceXP)}`,
                        `**Voice Time:** ${EmbedUtils.formatDuration(userStats.totalVoiceTime)}`,
                        `**Streak:** ${userStats.dailyStats.streak} days`,
                        `**Sessions:** ${userStats.sessions.length}`
                    ].join('\n'), true)
                );

                // Enhanced XP progress with visual progress bar
                if (userStats.level > 0) {
                    const nextLevelXP = VoiceActivity.getXPForNextLevel ? 
                        VoiceActivity.getXPForNextLevel(userStats.level) : 
                        (userStats.level + 1) * 1000; // Fallback calculation
                    
                    const currentLevelXP = userStats.level > 1 ? 
                        (VoiceActivity.getXPForNextLevel ? 
                            VoiceActivity.getXPForNextLevel(userStats.level - 1) : 
                            userStats.level * 1000) : 0;
                    
                    const progress = Math.max(0, userStats.voiceXP - currentLevelXP);
                    const needed = nextLevelXP - currentLevelXP;
                    const percentage = Math.min(100, Math.round((progress / needed) * 100));
                    
                    const progressBar = EmbedUtils.createProgressBar(progress, needed, 12);
                    
                    embed.addFields(
                        EmbedUtils.createField('🎯 Level Progress', [
                            `**Next Level:** ${userStats.level + 1}`,
                            `**Progress:** ${progressBar}`,
                            `**XP Needed:** ${EmbedUtils.formatNumber(Math.max(0, nextLevelXP - userStats.voiceXP))}`,
                            `**Completion:** ${percentage}%`
                        ].join('\n'), true)
                    );
                }
            }

            // Create enhanced select menu with better descriptions
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('leaderboard_type')
                .setPlaceholder('🎯 Choose leaderboard type')
                .addOptions([
                    {
                        label: 'Voice XP',
                        description: 'Ranked by total voice experience gained',
                        value: 'xp',
                        emoji: '💎',
                        default: type === 'xp'
                    },
                    {
                        label: 'Voice Time',
                        description: 'Ranked by total time spent in voice channels',
                        value: 'time',
                        emoji: '⏱️',
                        default: type === 'time'
                    },
                    {
                        label: 'Daily Streak',
                        description: 'Ranked by consecutive days of voice activity',
                        value: 'streak',
                        emoji: '🔥',
                        default: type === 'streak'
                    },
                    {
                        label: 'Voice Level',
                        description: 'Ranked by voice level progression',
                        value: 'level',
                        emoji: '🌟',
                        default: type === 'level'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Enhanced footer with more information
            embed.setFooter({
                text: `${interaction.guild.name} • Requested by ${interaction.user.tag} • Updated ${EmbedUtils.timestamp(new Date(), 'R')}`,
                iconURL: interaction.guild.iconURL()
            });

            await interaction.editReply({ embeds: [embed], components: [row] });

            // Handle select menu interactions with enhanced feedback
            const filter = i => i.customId === 'leaderboard_type' && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 });

            collector.on('collect', async i => {
                const selectedType = i.values[0];
                
                // Show updating state
                const updatingEmbed = EmbedUtils.createLoading(
                    'Updating Leaderboard',
                    `🔄 Loading ${selectedType} rankings...`
                );
                
                await i.update({ embeds: [updatingEmbed], components: [] });
                
                try {
                    // Generate new leaderboard data with enhanced styling
                    const newLeaderboardData = await generateEnhancedLeaderboard(
                        selectedType, 
                        limit, 
                        i.guild, 
                        i.user
                    );
                    
                    // Update the select menu to show the selected option
                    const updatedSelectMenu = new StringSelectMenuBuilder()
                        .setCustomId('leaderboard_type')
                        .setPlaceholder('🎯 Choose leaderboard type')
                        .addOptions([
                            {
                                label: 'Voice XP',
                                description: 'Ranked by total voice experience gained',
                                value: 'xp',
                                emoji: '💎',
                                default: selectedType === 'xp'
                            },
                            {
                                label: 'Voice Time',
                                description: 'Ranked by total time spent in voice channels',
                                value: 'time',
                                emoji: '⏱️',
                                default: selectedType === 'time'
                            },
                            {
                                label: 'Daily Streak',
                                description: 'Ranked by consecutive days of voice activity',
                                value: 'streak',
                                emoji: '🔥',
                                default: selectedType === 'streak'
                            },
                            {
                                label: 'Voice Level',
                                description: 'Ranked by voice level progression',
                                value: 'level',
                                emoji: '🌟',
                                default: selectedType === 'level'
                            }
                        ]);

                    const updatedRow = new ActionRowBuilder().addComponents(updatedSelectMenu);
                    
                    setTimeout(async () => {
                        await i.editReply({ 
                            embeds: [newLeaderboardData.embed], 
                            components: [updatedRow] 
                        });
                    }, 1000); // Small delay for better UX
                    
                } catch (error) {
                    console.error('Leaderboard update error:', error);
                    const errorEmbed = EmbedTemplates.error(
                        'Update Failed',
                        'Failed to update leaderboard. Please try again.',
                        i.user
                    );
                    await i.editReply({ 
                        embeds: [errorEmbed], 
                        components: [] 
                    });
                }
            });

            collector.on('end', async () => {
                try {
                    selectMenu.setDisabled(true);
                    const disabledRow = new ActionRowBuilder().addComponents(selectMenu);
                    await interaction.editReply({ components: [disabledRow] });
                } catch (error) {
                    // Ignore errors when disabling components (message might be deleted)
                }
            });

        } catch (error) {
            console.error('Voice leaderboard error:', error);
            const errorEmbed = EmbedTemplates.error(
                'Leaderboard Error',
                'Unable to load voice leaderboard. Please try again later.',
                interaction.user
            );
            
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed], components: [] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};

// Enhanced helper function for generating leaderboards
async function generateEnhancedLeaderboard(type, limit, guild, user) {
    let sortField;
    let title;
    let description;
    let emoji;
    let color;

    switch (type) {
        case 'xp':
            sortField = { voiceXP: -1 };
            title = 'Voice XP Leaderboard';
            description = 'Top members by voice experience points';
            emoji = '💎';
            color = Colors.VOICE_XP;
            break;
        case 'time':
            sortField = { totalVoiceTime: -1 };
            title = 'Voice Time Leaderboard';
            description = 'Top members by total voice time';
            emoji = '⏱️';
            color = Colors.INFO;
            break;
        case 'streak':
            sortField = { 'dailyStats.streak': -1 };
            title = 'Voice Streak Leaderboard';
            description = 'Top members by daily voice activity streak';
            emoji = '🔥';
            color = Colors.ERROR;
            break;
        case 'level':
            sortField = { level: -1, voiceXP: -1 };
            title = 'Voice Level Leaderboard';
            description = 'Top members by voice level';
            emoji = '🌟';
            color = Colors.YELLOW;
            break;
    }

    const topUsers = await VoiceActivity.find({ guildId: guild.id })
        .sort(sortField)
        .limit(limit);

    // Get user's own stats
    const userStats = await VoiceActivity.findOne({
        userId: user.id,
        guildId: guild.id
    });

    // Create enhanced embed
    const embed = EmbedTemplates.leaderboard(type, guild)
        .setTitle(`${emoji} ${title}`)
        .setColor(color);

    // Enhanced formatting
    let leaderboardText = '';
    const medals = ['🥇', '🥈', '🥉'];
    const gems = ['💎', '🔷', '🔹', '◾', '🔸'];

    for (let i = 0; i < topUsers.length; i++) {
        const userData = topUsers[i];
        const rank = i + 1;
        
        let rankEmoji;
        if (rank <= 3) {
            rankEmoji = medals[rank - 1];
        } else if (rank <= 10) {
            rankEmoji = gems[Math.min(rank - 4, gems.length - 1)];
        } else {
            rankEmoji = '▫️';
        }
        
        let value;
        let extraInfo = '';
        
        switch (type) {
            case 'xp':
                value = `**${EmbedUtils.formatNumber(userData.voiceXP)} XP**`;
                extraInfo = `🌟 Level ${userData.level}`;
                break;
            case 'time':
                value = `**${EmbedUtils.formatDuration(userData.totalVoiceTime)}**`;
                extraInfo = `💎 ${EmbedUtils.formatNumber(userData.voiceXP)} XP`;
                break;
            case 'streak':
                value = `**${userData.dailyStats.streak} days**`;
                extraInfo = `💎 ${EmbedUtils.formatNumber(userData.voiceXP)} XP`;
                break;
            case 'level':
                value = `**Level ${userData.level}**`;
                extraInfo = `💎 ${EmbedUtils.formatNumber(userData.voiceXP)} XP`;
                break;
        }

        leaderboardText += `${rankEmoji} **#${rank}** ${userData.username}\n`;
        leaderboardText += `   ${value} • ${extraInfo}\n\n`;
    }

    embed.setDescription(leaderboardText);

    // Add statistics
    const totalUsers = await VoiceActivity.countDocuments({ guildId: guild.id });
    embed.addFields(
        EmbedUtils.createField('� Total Users', totalUsers.toLocaleString(), true),
        EmbedUtils.createField('📄 Showing Top', `${Math.min(limit, topUsers.length)}`, true),
        EmbedUtils.createField('🔄 Sort By', type.charAt(0).toUpperCase() + type.slice(1), true)
    );

    // Add user's personal stats
    if (userStats) {
        const userRank = await VoiceActivity.countDocuments({
            guildId: guild.id,
            voiceXP: { $gt: userStats.voiceXP }
        }) + 1;

        embed.addFields(
            EmbedUtils.createField('\u200B', '\u200B', false),
            EmbedUtils.createField('📈 Your Stats', [
                `**Rank:** #${userRank.toLocaleString()}`,
                `**Level:** ${userStats.level}`,
                `**XP:** ${EmbedUtils.formatNumber(userStats.voiceXP)}`,
                `**Voice Time:** ${EmbedUtils.formatDuration(userStats.totalVoiceTime)}`,
                `**Streak:** ${userStats.dailyStats.streak} days`
            ].join('\n'), true)
        );
    }

    embed.setFooter({
        text: `${guild.name} • Requested by ${user.tag} • ${EmbedUtils.timestamp(new Date(), 'R')}`,
        iconURL: guild.iconURL()
    });

    return { embed };
}
