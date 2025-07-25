const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const XPManager = require('../../utils/XPManager');
const { EmbedTemplates, Colors } = require('../../utils/EmbedTemplates');

const PAGE_SIZE = 10;
const BADGES = ['🥇', '🥈', '🥉'];
const MILESTONE_LEVELS = [50, 100];

// Fixed width constants for perfect alignment
const POSITION_WIDTH = 4;   // " 1. "
const NAME_WIDTH = 18;      // Username display width
const XP_WIDTH = 12;        // XP value width
const LEVEL_WIDTH = 8;      // "Lv 100" width

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Display the XP leaderboard')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Leaderboard type')
                .addChoices(
                    { name: 'Combined XP', value: 'xp' },
                    { name: 'Chat XP', value: 'chatXP' },
                    { name: 'VC XP', value: 'vcXP' }
                )
                .setRequired(false))
        .addStringOption(option =>
            option.setName('period')
                .setDescription('Time period')
                .addChoices(
                    { name: 'All-time', value: 'all' },
                    { name: 'Weekly', value: 'weekly' },
                    { name: 'Monthly', value: 'monthly' }
                )
                .setRequired(false))
        .addStringOption(option =>
            option.setName('sort')
                .setDescription('Sort by')
                .addChoices(
                    { name: 'XP', value: 'xp' },
                    { name: 'Level', value: 'level' },
                    { name: 'Activity', value: 'voiceTime' }
                )
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number')
                .setMinValue(1)
                .setRequired(false)),
    
    async execute(interaction) {
        await showLeaderboard(interaction);
    },
};

async function showLeaderboard(interaction, customPage, customType, customPeriod, customSort) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const type = customType || interaction.options.getString('type') || 'xp';
    const period = customPeriod || interaction.options.getString('period') || 'all';
    const sort = customSort || interaction.options.getString('sort') || type;
    let page = customPage || interaction.options.getInteger('page') || 1;

    // Fetch leaderboard data
    let leaderboard = await XPManager.getTimeFilteredLeaderboard(guildId, type, period, 1000);
    // Ensure data consistency
    leaderboard = leaderboard.map(e => {
        const xp = typeof e.xp === 'number' && !isNaN(e.xp) ? e.xp : 0;
        return {
            ...e,
            xp,
            level: XPManager.calculateLevel ? XPManager.calculateLevel(xp) : (e.level || 0)
        };
    });
    
    leaderboard = leaderboard.sort((a, b) => (b[sort] || 0) - (a[sort] || 0));

    const totalUsers = leaderboard.length;
    const totalPages = Math.ceil(totalUsers / PAGE_SIZE);
    const totalPagesSafe = Math.max(1, totalPages);
    page = Math.max(1, Math.min(page, totalPagesSafe));
    const startIdx = (page - 1) * PAGE_SIZE;
    const endIdx = Math.min(startIdx + PAGE_SIZE, totalUsers);
    const pageEntries = leaderboard.slice(startIdx, endIdx);

    // Find user's rank
    const userEntry = leaderboard.find(e => e.userId === userId);
    const userRank = userEntry ? leaderboard.indexOf(userEntry) + 1 : null;

    // Build leaderboard text with perfect alignment
    let leaderboardText = `#${' '.repeat(POSITION_WIDTH - 2)}${'Name'.padEnd(NAME_WIDTH)}${'XP'.padStart(XP_WIDTH)}\n`;
    leaderboardText += '─'.repeat(POSITION_WIDTH + NAME_WIDTH + XP_WIDTH + LEVEL_WIDTH) + '\n';
    
    if (pageEntries.length === 0) {
        leaderboardText += `No users found\n`;
    } else {
        for (let i = 0; i < pageEntries.length; i++) {
            const entry = pageEntries[i];
            const rank = startIdx + i + 1;
            let username;
            
            try {
                username = (await interaction.guild.members.fetch(entry.userId).catch(() => null))?.displayName || 'Unknown';
            } catch { username = 'Unknown'; }
            
            // Truncate username to fit column
            if (username.length > NAME_WIDTH) {
                username = username.substring(0, NAME_WIDTH - 1) + '…';
            }
            
            // Determine badges
            let badge = '';
            if (rank <= 3) {
                badge = BADGES[rank - 1] + ' ';
            } else if (entry.level >= 100) {
                badge = '💎 ';
            } else if (entry.level >= 50) {
                badge = '✨ ';
            }
            
            // Highlight current user
            const highlight = entry.userId === userId ? '> ' : '  ';
            const position = `${rank}.`.padStart(POSITION_WIDTH);
            const xpStr = entry.xp.toLocaleString().padStart(XP_WIDTH);
            
            // First line: Position, Badge, Username, XP
            leaderboardText += `${highlight}${badge}${position} ${username.padEnd(NAME_WIDTH)}${xpStr}\n`;
            
            // Second line: Level indicator
            const levelStr = `Lv ${entry.level}`.padEnd(LEVEL_WIDTH);
            leaderboardText += `${' '.repeat(POSITION_WIDTH + 1)}${levelStr}\n`;
        }
    }
    
    // Add user's position if not on current page
    if (userEntry && (userRank < startIdx + 1 || userRank > endIdx)) {
        let username;
        try {
            username = (await interaction.guild.members.fetch(userEntry.userId).catch(() => null))?.displayName || 'Unknown';
        } catch { username = 'Unknown'; }
        
        if (username.length > NAME_WIDTH) {
            username = username.substring(0, NAME_WIDTH - 1) + '…';
        }
        
        let badge = '';
        if (userRank <= 3) {
            badge = BADGES[userRank - 1] + ' ';
        } else if (userEntry.level >= 100) {
            badge = '💎 ';
        } else if (userEntry.level >= 50) {
            badge = '✨ ';
        }
        
        const position = `${userRank}.`.padStart(POSITION_WIDTH);
        const xpStr = userEntry.xp.toLocaleString().padStart(XP_WIDTH);
        const levelStr = `Lv ${userEntry.level}`.padEnd(LEVEL_WIDTH);
        
        leaderboardText += '\n' + '─'.repeat(POSITION_WIDTH + NAME_WIDTH + XP_WIDTH + LEVEL_WIDTH) + '\n';
        leaderboardText += `> ${badge}${position} ${username.padEnd(NAME_WIDTH)}${xpStr}\n`;
        leaderboardText += `${' '.repeat(POSITION_WIDTH + 1)}${levelStr}   (Your position)\n`;
    }

    // Truncate if too long for Discord embed
    let truncated = false;
    if (leaderboardText.length > 3500) {
        leaderboardText = leaderboardText.substring(0, 3500) + '\n... (truncated)';
        truncated = true;
    }

    // Progress bar for user
    let progressBar = '';
    if (userEntry) {
        const currentLevelXP = XPManager.calculateXPForLevel(userEntry.level);
        const nextLevelXP = XPManager.calculateXPForLevel(userEntry.level + 1);
        const progressXP = userEntry.xp - currentLevelXP;
        const neededXP = nextLevelXP - currentLevelXP;
        
        if (neededXP > 0) {
            const progressPercentage = Math.min(100, Math.round((progressXP / neededXP) * 100));
            const filled = Math.round(progressPercentage / 5);
            progressBar = `Progress: [${'▰'.repeat(filled)}${'▱'.repeat(20 - filled)}] ${progressXP.toLocaleString()}/${neededXP.toLocaleString()} XP`;
        }
    }

    const titleSuffix = period !== 'all' ? ` • ${period.charAt(0).toUpperCase() + period.slice(1)}` : '';
    const leaderboardEmbed = EmbedTemplates.createEmbed({
        title: `${type === 'xp' ? 'Combined' : type === 'chatXP' ? 'Chat' : 'VC'} XP Leaderboard${titleSuffix}`,
        description: `\`\`\`\n${leaderboardText}\`\`\`${progressBar ? `\n${progressBar}` : ''}${truncated ? '\n*Leaderboard truncated for display*' : ''}`,
        color: getLeaderboardColor(pageEntries.length),
        footer: {
            text: `Page ${page}/${totalPagesSafe}${userEntry ? ` • Your rank: #${userRank}` : ''}`,
            iconURL: interaction.guild.iconURL({ dynamic: true })
        },
        timestamp: new Date()
    });

    // Filter select menu
    const filterOptions = [
        { label: 'Combined XP', value: 'xp' },
        { label: 'Chat XP', value: 'chatXP' },
        { label: 'VC XP', value: 'vcXP' },
        { label: 'All-time', value: 'all' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Sort by XP', value: 'sort_xp' },
        { label: 'Sort by Level', value: 'sort_level' },
        { label: 'Sort by Activity', value: 'sort_voiceTime' },
    ];
    
    // Set default selections
    filterOptions.forEach(opt => {
        opt.default = (
            opt.value === type || 
            opt.value === period || 
            (sort === 'xp' && opt.value === 'sort_xp') ||
            (sort === 'level' && opt.value === 'sort_level') ||
            (sort === 'voiceTime' && opt.value === 'sort_voiceTime')
        );
    });

    const filterRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('leaderboard_filter')
            .setPlaceholder('Filter/Sort')
            .addOptions(filterOptions)
    );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('leaderboard_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page === 1),
        new ButtonBuilder().setCustomId('leaderboard_page').setLabel(`${page} / ${totalPagesSafe}`).setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('leaderboard_next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page === totalPagesSafe)
    );

    // Response handling
    const responseOptions = { embeds: [leaderboardEmbed], components: [row, filterRow] };
    if (interaction.isButton?.() || interaction.isStringSelectMenu?.()) {
        await interaction.update(responseOptions);
    } else if (interaction.replied || interaction.deferred) {
        await interaction.editReply(responseOptions);
    } else {
        await interaction.reply(responseOptions);
    }

    // Set up collectors
    const collector = interaction.channel.createMessageComponentCollector({
        componentType: [ComponentType.Button, ComponentType.StringSelect],
        time: 60000,
        filter: i => i.user.id === userId
    });

    collector.on('collect', async i => {
        if (i.isButton()) {
            if (i.customId === 'leaderboard_prev') {
                await showLeaderboard(i, page - 1, type, period, sort);
            } else if (i.customId === 'leaderboard_next') {
                await showLeaderboard(i, page + 1, type, period, sort);
            }
        } else if (i.isStringSelectMenu()) {
            const selected = i.values[0];
            let newType = type, newPeriod = period, newSort = sort;
            
            if (['xp', 'chatXP', 'vcXP'].includes(selected)) newType = selected;
            if (['all', 'weekly', 'monthly'].includes(selected)) newPeriod = selected;
            if (selected === 'sort_xp') newSort = 'xp';
            if (selected === 'sort_level') newSort = 'level';
            if (selected === 'sort_voiceTime') newSort = 'voiceTime';
            
            await showLeaderboard(i, 1, newType, newPeriod, newSort);
        }
        await i.deferUpdate();
    });

    collector.on('end', () => {
        // Optionally disable components after timeout
    });
}

function getLeaderboardColor(userCount) {
    if (userCount >= 15) return '#FFD700'; // Gold
    if (userCount >= 10) return '#32CD32'; // Green
    if (userCount >= 5) return '#1E90FF';  // Blue
    return '#9370DB';                     // Purple
}