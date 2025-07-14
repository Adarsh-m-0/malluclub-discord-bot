const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const VoiceActivity = require('../../models/VoiceActivity');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voiceadmin')
        .setDescription('Admin commands for voice XP system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset voice stats for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to reset stats for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add XP to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to add XP to')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount of XP to add')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove XP from a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to remove XP from')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount of XP to remove')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View server-wide voice statistics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('export')
                .setDescription('Export voice statistics to JSON')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'reset':
                    await handleReset(interaction);
                    break;
                case 'add':
                    await handleAddXP(interaction);
                    break;
                case 'remove':
                    await handleRemoveXP(interaction);
                    break;
                case 'stats':
                    await handleServerStats(interaction);
                    break;
                case 'export':
                    await handleExport(interaction);
                    break;
            }
        } catch (error) {
            console.error('Voice admin error:', error);
            await interaction.reply({
                content: '❌ An error occurred while executing the admin command.',
                ephemeral: true
            });
        }
    },
};

async function handleReset(interaction) {
    const targetUser = interaction.options.getUser('user');
    
    const userStats = await VoiceActivity.findOne({
        userId: targetUser.id,
        guildId: interaction.guild.id
    });

    if (!userStats) {
        return interaction.reply({
            content: `❌ ${targetUser.username} has no voice activity data to reset.`,
            ephemeral: true
        });
    }

    // Reset all stats
    await VoiceActivity.findOneAndUpdate(
        { userId: targetUser.id, guildId: interaction.guild.id },
        {
            $set: {
                totalVoiceTime: 0,
                voiceXP: 0,
                level: 1,
                sessions: [],
                achievements: [],
                dailyStats: {
                    todayVoiceTime: 0,
                    streak: 0
                },
                currentSession: {
                    isActive: false
                }
            }
        }
    );

    const embed = new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('🔄 Voice Stats Reset')
        .setDescription(`Successfully reset all voice statistics for ${targetUser.username}`)
        .addFields({
            name: 'Reset Data',
            value: [
                '• Total Voice Time: 0',
                '• Voice XP: 0',
                '• Level: 1',
                '• Sessions: Cleared',
                '• Achievements: Cleared',
                '• Daily Stats: Reset'
            ].join('\n')
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleAddXP(interaction) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    let userStats = await VoiceActivity.findOne({
        userId: targetUser.id,
        guildId: interaction.guild.id
    });

    if (!userStats) {
        userStats = new VoiceActivity({
            userId: targetUser.id,
            guildId: interaction.guild.id,
            username: targetUser.username
        });
    }

    const oldLevel = userStats.level;
    userStats.voiceXP += amount;
    userStats.level = VoiceActivity.calculateLevel(userStats.voiceXP);
    await userStats.save();

    const embed = new EmbedBuilder()
        .setColor(0x4ECDC4)
        .setTitle('➕ XP Added')
        .setDescription(`Added ${amount} XP to ${targetUser.username}`)
        .addFields(
            {
                name: 'New Stats',
                value: [
                    `**XP:** ${userStats.voiceXP.toLocaleString()}`,
                    `**Level:** ${userStats.level}`,
                    `**Level Change:** ${oldLevel} → ${userStats.level}`
                ].join('\n'),
                inline: true
            }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleRemoveXP(interaction) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    const userStats = await VoiceActivity.findOne({
        userId: targetUser.id,
        guildId: interaction.guild.id
    });

    if (!userStats) {
        return interaction.reply({
            content: `❌ ${targetUser.username} has no voice activity data.`,
            ephemeral: true
        });
    }

    const oldLevel = userStats.level;
    userStats.voiceXP = Math.max(0, userStats.voiceXP - amount);
    userStats.level = VoiceActivity.calculateLevel(userStats.voiceXP);
    await userStats.save();

    const embed = new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('➖ XP Removed')
        .setDescription(`Removed ${amount} XP from ${targetUser.username}`)
        .addFields(
            {
                name: 'New Stats',
                value: [
                    `**XP:** ${userStats.voiceXP.toLocaleString()}`,
                    `**Level:** ${userStats.level}`,
                    `**Level Change:** ${oldLevel} → ${userStats.level}`
                ].join('\n'),
                inline: true
            }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleServerStats(interaction) {
    const allUsers = await VoiceActivity.find({ guildId: interaction.guild.id });

    if (allUsers.length === 0) {
        return interaction.reply({
            content: '📊 No voice activity data found for this server.',
            ephemeral: true
        });
    }

    // Calculate server statistics
    const totalUsers = allUsers.length;
    const totalVoiceTime = allUsers.reduce((sum, user) => sum + user.totalVoiceTime, 0);
    const totalXP = allUsers.reduce((sum, user) => sum + user.voiceXP, 0);
    const totalSessions = allUsers.reduce((sum, user) => sum + user.sessions.length, 0);
    const averageLevel = allUsers.reduce((sum, user) => sum + user.level, 0) / totalUsers;
    
    // Find most active user
    const mostActiveUser = allUsers.reduce((max, user) => 
        user.voiceXP > max.voiceXP ? user : max
    );

    // Users currently in voice
    const activeUsers = allUsers.filter(user => user.currentSession.isActive).length;

    // Recent activity (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentlyActive = allUsers.filter(user => 
        user.lastXPUpdate && new Date(user.lastXPUpdate) > weekAgo
    ).length;

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📊 Server Voice Statistics')
        .setThumbnail(interaction.guild.iconURL())
        .addFields(
            {
                name: '👥 User Stats',
                value: [
                    `**Total Users:** ${totalUsers}`,
                    `**Currently Active:** ${activeUsers}`,
                    `**Active This Week:** ${recentlyActive}`,
                    `**Average Level:** ${averageLevel.toFixed(1)}`
                ].join('\n'),
                inline: true
            },
            {
                name: '⏱️ Activity Stats',
                value: [
                    `**Total Voice Time:** ${formatTime(totalVoiceTime)}`,
                    `**Total Sessions:** ${totalSessions.toLocaleString()}`,
                    `**Total XP Earned:** ${totalXP.toLocaleString()}`,
                    `**Avg Session Time:** ${formatTime(totalVoiceTime / totalSessions)}`
                ].join('\n'),
                inline: true
            },
            {
                name: '🏆 Top Performer',
                value: [
                    `**User:** ${mostActiveUser.username}`,
                    `**Level:** ${mostActiveUser.level}`,
                    `**XP:** ${mostActiveUser.voiceXP.toLocaleString()}`,
                    `**Time:** ${formatTime(mostActiveUser.totalVoiceTime)}`
                ].join('\n'),
                inline: true
            }
        )
        .setFooter({
            text: `${interaction.guild.name} Voice XP System`,
            iconURL: interaction.guild.iconURL()
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleExport(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const allUsers = await VoiceActivity.find({ guildId: interaction.guild.id });

    if (allUsers.length === 0) {
        return interaction.editReply({
            content: '📊 No voice activity data found to export.'
        });
    }

    // Create export data
    const exportData = {
        server: {
            name: interaction.guild.name,
            id: interaction.guild.id,
            exportedAt: new Date().toISOString(),
            userCount: allUsers.length
        },
        users: allUsers.map(user => ({
            userId: user.userId,
            username: user.username,
            level: user.level,
            voiceXP: user.voiceXP,
            totalVoiceTime: user.totalVoiceTime,
            totalVoiceTimeFormatted: formatTime(user.totalVoiceTime),
            sessionsCount: user.sessions.length,
            achievements: user.achievements.length,
            currentStreak: user.dailyStats.streak,
            lastActive: user.lastXPUpdate,
            memberSince: user.createdAt
        }))
    };

    // Create file content
    const jsonContent = JSON.stringify(exportData, null, 2);
    const buffer = Buffer.from(jsonContent, 'utf8');

    const { AttachmentBuilder } = require('discord.js');
    const attachment = new AttachmentBuilder(buffer, { 
        name: `voice-stats-${interaction.guild.name}-${new Date().toISOString().split('T')[0]}.json` 
    });

    await interaction.editReply({
        content: `📁 Exported voice statistics for ${allUsers.length} users.`,
        files: [attachment]
    });
}

function formatTime(milliseconds) {
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
