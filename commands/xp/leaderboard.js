const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const XPManager = require('../../utils/XPManager');
const { EmbedTemplates, Colors } = require('../../utils/EmbedTemplates');

const PAGE_SIZE = 10;
const BADGES = ['🥇', '🥈', '🥉'];
const MILESTONE_LEVELS = [50, 100];

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

    // Fetch leaderboard data (now supports time/type filters)
    let leaderboard = await XPManager.getTimeFilteredLeaderboard(guildId, type, period, 1000);
    // Defensive: ensure XP and level are always present and correct
    leaderboard = leaderboard.map(e => {
        // Always calculate level from XP
        const xp = typeof e.xp === 'number' && !isNaN(e.xp) ? e.xp : 0;
        return {
            ...e,
            xp,
            level: XPManager.calculateLevel ? XPManager.calculateLevel(xp) : (e.level || 0)
        };
    });
    // Sort/filter logic
    leaderboard = leaderboard.sort((a, b) => (b[sort] || 0) - (a[sort] || 0));

    const totalUsers = leaderboard.length;
    const totalPages = Math.ceil(totalUsers / PAGE_SIZE);
    // Always show at least one page
    const totalPagesSafe = Math.max(1, totalPages);
    // Clamp page number
    if (page < 1) page = 1;
    if (page > totalPagesSafe) page = totalPagesSafe;
    const startIdx = (page - 1) * PAGE_SIZE;
    const endIdx = startIdx + PAGE_SIZE;
    const pageEntries = leaderboard.slice(startIdx, endIdx);

    // Find command user's rank
    const userEntry = leaderboard.find(e => e.userId === userId);
    const userRank = userEntry ? leaderboard.indexOf(userEntry) + 1 : null;

    // Build leaderboard text (optimized for mobile/desktop, no Chat/VC columns)
    // Two-line format: first line is position, name, XP; second line is level (under XP)
    let leaderboardText = `#  Name                XP\n`;
    leaderboardText += `-------------------------------\n`;
    if (pageEntries.length === 0) {
        leaderboardText += `No users found.\n`;
    } else {
        for (let i = 0; i < pageEntries.length; i++) {
            const entry = pageEntries[i];
            let username;
            try {
                username = (await interaction.guild.members.fetch(entry.userId).catch(() => null))?.displayName || 'Unknown';
            } catch { username = 'Unknown'; }
            // Truncate and pad username to 16 chars (for perfect alignment)
            if (username.length > 16) username = username.slice(0, 15) + '…';
            username = username.padEnd(16, ' ');
            const position = (startIdx + i + 1).toString().padStart(3, ' ');
            let badge = '';
            if (entry.level >= 100) badge = '💎';
            else if (entry.level >= 50) badge = '✨';
            const highlight = entry.userId === userId ? '➡️ ' : '   ';
            // XP column width
            const xpStr = entry.xp.toLocaleString().padStart(9, ' ');
            leaderboardText += `${highlight}${badge}${position}. ${username}${xpStr}\n`;
            // Level under XP (align to XP column)
            leaderboardText += `${' '.repeat(24)}Lv ${entry.level}\n`;
        }
    }
    // If user not on page, show their entry at the bottom
    if (userEntry && (userRank < startIdx + 1 || userRank > endIdx)) {
        if (userRank > 3) {
            let username;
            try {
                username = (await interaction.guild.members.fetch(userEntry.userId).catch(() => null))?.displayName || 'Unknown';
            } catch { username = 'Unknown'; }
            if (username.length > 16) username = username.slice(0, 15) + '…';
            username = username.padEnd(16, ' ');
            let badge = '';
            if (userEntry.level >= 100) badge = '💎';
            else if (userEntry.level >= 50) badge = '✨';
            const xpStr = userEntry.xp.toLocaleString().padStart(9, ' ');
            leaderboardText += `\n➡️ ${badge}${userRank.toString().padStart(3, ' ')}. ${username}${xpStr}   (You)\n`;
            leaderboardText += `${' '.repeat(24)}Lv ${userEntry.level}\n`;
        }
    }

    // Truncate if too long for Discord embed (4096 chars max)
    let truncated = false;
    let leaderboardDesc = leaderboardText;
    if ((`\n${leaderboardText}\``).length > 4000) {
        leaderboardDesc = leaderboardText.slice(0, 3900) + '\n... (truncated)';
        truncated = true;
    }

    // Progress bar for user
    let progressBar = '';
    if (userEntry) {
        const currentLevelXP = XPManager.calculateXPForLevel(userEntry.level);
        const nextLevelXP = XPManager.calculateXPForLevel(userEntry.level + 1);
        const progressXP = userEntry.xp - currentLevelXP;
        const neededXP = nextLevelXP - currentLevelXP;
        const progressPercentage = neededXP > 0 ? Math.round((progressXP / neededXP) * 100) : 100;
        progressBar = `Progress: [${'▰'.repeat(Math.round(progressPercentage / 5))}${'▱'.repeat(20 - Math.round(progressPercentage / 5))}] ${progressXP}/${neededXP} XP`;
    }

    const leaderboardEmbed = EmbedTemplates.createEmbed({
        title: `XP Leaderboard (${type.toUpperCase()}${period !== 'all' ? ' • ' + period.charAt(0).toUpperCase() + period.slice(1) : ''})`,
        description: '```\n' + leaderboardDesc + '```' + (progressBar ? `\n${progressBar}` : '') + (truncated ? '\n*Leaderboard truncated for display*' : ''),
        color: getLeaderboardColor(pageEntries.length),
        footer: {
            text: `Page ${page}/${totalPagesSafe} • ${userEntry ? `You: #${userRank} of ${totalUsers}` : ''}`,
            iconURL: interaction.guild.iconURL({ dynamic: true })
        },
        timestamp: new Date()
    });

    // Filter select menu
    let defaultSet = false;
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
    filterOptions.forEach(opt => { opt.default = false; });
    if (!defaultSet && filterOptions.find(opt => opt.value === type)) {
        filterOptions.find(opt => opt.value === type).default = true;
        defaultSet = true;
    } else if (!defaultSet && filterOptions.find(opt => opt.value === period)) {
        filterOptions.find(opt => opt.value === period).default = true;
        defaultSet = true;
    } else if (!defaultSet) {
        if (sort === 'xp' && filterOptions.find(opt => opt.value === 'sort_xp')) filterOptions.find(opt => opt.value === 'sort_xp').default = true;
        if (sort === 'level' && filterOptions.find(opt => opt.value === 'sort_level')) filterOptions.find(opt => opt.value === 'sort_level').default = true;
        if (sort === 'voiceTime' && filterOptions.find(opt => opt.value === 'sort_voiceTime')) filterOptions.find(opt => opt.value === 'sort_voiceTime').default = true;
    }

    const filterRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('leaderboard_filter')
            .setPlaceholder('Filter/Sort')
            .addOptions(filterOptions)
    );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('leaderboard_prev').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 1),
        new ButtonBuilder().setCustomId('leaderboard_next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page === totalPagesSafe),
        new ButtonBuilder().setCustomId('leaderboard_page').setLabel(`Page ${page}/${totalPagesSafe}`).setStyle(ButtonStyle.Primary).setDisabled(true)
    );

    // If this is a button/select interaction, use .update instead of .reply/editReply
    if (interaction.isButton?.() || interaction.isStringSelectMenu?.()) {
        await interaction.update({ embeds: [leaderboardEmbed], components: [row, filterRow] });
    } else if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [leaderboardEmbed], components: [row, filterRow] });
    } else {
        await interaction.reply({ embeds: [leaderboardEmbed], components: [row, filterRow] });
    }

    // Set up collector for button interactions
    const collector = interaction.channel.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
        filter: i => i.user.id === userId
    });
    collector.on('collect', async i => {
        if (i.customId === 'leaderboard_prev') {
            await showLeaderboard(i, page - 1, type, period, sort);
        } else if (i.customId === 'leaderboard_next') {
            await showLeaderboard(i, page + 1, type, period, sort);
        }
        await i.deferUpdate();
    });
    collector.on('end', () => {
        // Optionally disable buttons after timeout
    });
    // Set up collector for select menu
    const selectCollector = interaction.channel.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60000,
        filter: i => i.user.id === userId
    });
    selectCollector.on('collect', async i => {
        const selected = i.values[0];
        let newType = type, newPeriod = period, newSort = sort;
        if (['xp', 'chatXP', 'vcXP'].includes(selected)) newType = selected;
        if (['all', 'weekly', 'monthly'].includes(selected)) newPeriod = selected;
        if (selected === 'sort_xp') newSort = 'xp';
        if (selected === 'sort_level') newSort = 'level';
        if (selected === 'sort_voiceTime') newSort = 'voiceTime';
        await showLeaderboard(i, 1, newType, newPeriod, newSort);
        await i.deferUpdate();
    });
    selectCollector.on('end', () => {
        // Optionally disable select after timeout
    });
}

function getLeaderboardColor(userCount) {
    if (userCount >= 15) return '#FFD700'; // Gold for active servers
    if (userCount >= 10) return '#32CD32'; // Green for medium activity
    if (userCount >= 5) return '#1E90FF';  // Blue for some activity
    return '#9370DB';                      // Purple for low activity
}