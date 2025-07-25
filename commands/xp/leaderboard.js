const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const XPManager = require('../../utils/XPManager');
const { EmbedTemplates, Colors } = require('../../utils/EmbedTemplates');

const PAGE_SIZE = 10;
const BADGES = ['🥇', '🥈', '🥉'];
const MILESTONE_LEVELS = [50, 100];

// Fixed width constants for perfect alignment
const POSITION_WIDTH = 3;
const NAME_WIDTH = 18;  // Slightly reduced for better mobile display
const XP_WIDTH = 8;     // Adjusted for typical XP values with commas
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
    // Immediately defer the reply to prevent timeouts
    try {
        // Initial defer to prevent timeout
        if (!interaction.deferred && !interaction.replied) {
            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                await interaction.deferUpdate().catch(() => {});
            } else {
                await interaction.deferReply().catch(() => {});
            }
        }

        // Verify guild context
        if (!interaction.guild) {
            await interaction.editReply({ content: 'This command can only be used in a server!', ephemeral: true });
            return;
        }

        // Basic parameter validation
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        
        // Validate and sanitize parameters with defaults
        const type = ['xp', 'chatXP', 'vcXP'].includes(customType) ? customType : 
                    interaction.options?.getString('type') || 'xp';
        
        const period = ['all', 'weekly', 'monthly'].includes(customPeriod) ? customPeriod :
                      interaction.options?.getString('period') || 'all';
        
        const validSorts = ['xp', 'level', 'voiceTime'];
        const sort = validSorts.includes(customSort) ? customSort :
                    validSorts.includes(interaction.options?.getString('sort')) ? interaction.options.getString('sort') :
                    type;
        
        let page = Number(customPage) || interaction.options?.getInteger('page') || 1;

    // Fetch and validate leaderboard data
    let leaderboard;
    try {
        leaderboard = await XPManager.getTimeFilteredLeaderboard(guildId, type, period, 1000);
        
        if (!Array.isArray(leaderboard)) {
            throw new Error('Invalid leaderboard data received');
        }

        // Ensure data consistency and handle missing/invalid values
        leaderboard = leaderboard.map(e => {
            // Validate XP value
            const xp = typeof e?.xp === 'number' && !isNaN(e.xp) ? Math.max(0, e.xp) : 0;
            
            // Calculate level safely
            let level = 0;
            try {
                level = XPManager.calculateLevel ? XPManager.calculateLevel(xp) : (e.level || 0);
            } catch (levelError) {
                console.error('Error calculating level:', levelError);
            }

            return {
                ...e,
                userId: e.userId || 'unknown',
                xp,
                level,
                voiceTime: typeof e.voiceTime === 'number' ? Math.max(0, e.voiceTime) : 0
            };
        }).filter(e => e.userId !== 'unknown'); // Remove invalid entries
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        const errorMsg = error.code === 50001 ? 'Bot is missing permissions to fetch member data.' :
                        error.code === 50013 ? 'Bot cannot access member data in this channel.' :
                        error.message?.includes('Invalid') ? 'Could not retrieve valid leaderboard data.' :
                        'Failed to fetch leaderboard data. Please try again later.';
        
        await interaction.reply({ 
            content: errorMsg,
            ephemeral: true 
        });
        return;
    }
    
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

    // Build leaderboard text with mentions and handle rate limits
    let leaderboardText = '';
    
    if (pageEntries.length === 0) {
        leaderboardText += 'No users found in this leaderboard';
    } else {
        // Fetch all members in batch to avoid rate limits
        const userIds = pageEntries.map(entry => entry.userId);
        const members = new Map();
        
        try {
            const fetchedMembers = await interaction.guild.members.fetch({ user: userIds });
            fetchedMembers.forEach(member => members.set(member.id, member));
        } catch (error) {
            console.error('Error fetching members:', error);
            // Continue with empty members map - we'll use fallback display
        }

        for (let i = 0; i < pageEntries.length; i++) {
            const entry = pageEntries[i];
            const rank = startIdx + i + 1;
            
            // Get member from cache
            const member = members.get(entry.userId);
            
            // Add rank-based badges with emoji fallbacks
            let badge;
            try {
                badge = rank <= 3 ? (BADGES[rank - 1] || '•') : 
                       entry.level >= 100 ? '💎' : 
                       entry.level >= 50 ? '✨' : '•';
            } catch {
                badge = '•'; // Fallback if emoji fails
            }
            
            // Format the entry line with consistent spacing
            const displayName = member ? (member.displayName || member.user.username) : 'Unknown User';
            const mention = member ? `<@${entry.userId}>` : displayName;
            const rankStr = `#${rank}`.padStart(3);
            const levelInfo = `Level ${entry.level || 0}`.padEnd(10);
            const xpStr = (entry.xp || 0).toLocaleString().padStart(8);
            
            // Add entry with proper formatting and error handling
            try {
                leaderboardText += `${badge} **${rankStr}** ${mention} • ${levelInfo} • ${xpStr} XP\n`;
            } catch {
                // Fallback formatting if anything fails
                const fallbackRank = `#${rank}`.padStart(3);
                leaderboardText += `• ${fallbackRank} Unknown User • Level 0    • ${0} XP\n`;
            }
        }
    }
    
    // Add user's position if not on current page (no level)
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
        leaderboardText += '\n' + '─'.repeat(POSITION_WIDTH + NAME_WIDTH + XP_WIDTH) + '\n';
        leaderboardText += `> ${badge}${position} ${username.padEnd(NAME_WIDTH)}${xpStr}   (Your position)\n`;
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

    // Create embed title
    const titleSuffix = period !== 'all' ? ` • ${period.charAt(0).toUpperCase() + period.slice(1)}` : '';
    const title = `${type === 'xp' ? 'Combined' : type === 'chatXP' ? 'Chat' : 'VC'} XP Leaderboard${titleSuffix}`;

    // Clear any previous timeouts
    if (interaction.client._timeouts) {
        const prevTimeout = interaction.client._timeouts.get(interaction.user.id);
        if (prevTimeout) {
            clearTimeout(prevTimeout);
            interaction.client._timeouts.delete(interaction.user.id);
        }
    }

    // Add user's progress section if they have XP
    let userProgress = '';
    if (userEntry) {
        const currentLevelXP = XPManager.calculateXPForLevel(userEntry.level);
        const nextLevelXP = XPManager.calculateXPForLevel(userEntry.level + 1);
        const progressXP = userEntry.xp - currentLevelXP;
        const neededXP = nextLevelXP - currentLevelXP;
        
        if (neededXP > 0) {
            const progressPercentage = Math.min(100, Math.round((progressXP / neededXP) * 100));
            userProgress = `\n\n**Your Progress**\n`;
            userProgress += `Level ${userEntry.level} → ${userEntry.level + 1}\n`;
            userProgress += `${progressXP.toLocaleString()} / ${neededXP.toLocaleString()} XP (${progressPercentage}%)`;
        }
    }

    const leaderboardEmbed = EmbedTemplates.createEmbed({
        title: title,
        description: `${leaderboardText}${userProgress}${truncated ? '\n\n*Some entries hidden due to length*' : ''}`,
        color: getLeaderboardColor(pageEntries.length),
        footer: {
            text: `Page ${page}/${totalPagesSafe}${userEntry ? ` • Your rank: #${userRank}` : ''}`,
            iconURL: interaction.guild.iconURL({ dynamic: true })
        },
        timestamp: new Date()
    });

    // Filter select menu with simple options
    const filterOptions = [
        { label: '📊 Combined XP', value: 'xp', description: 'Show total XP from all sources' },
        { label: '💬 Chat XP', value: 'chatXP', description: 'Show XP from chat messages' },
        { label: '🎤 VC XP', value: 'vcXP', description: 'Show XP from voice chat' },
        { label: '⌛ All-time', value: 'all', description: 'Show all-time rankings' },
        { label: '📅 Weekly', value: 'weekly', description: 'Show this week\'s rankings' },
        { label: '📆 Monthly', value: 'monthly', description: 'Show this month\'s rankings' },
        { label: '🏆 Sort by XP', value: 'sort_xp', description: 'Sort by total XP' },
        { label: '⭐ Sort by Level', value: 'sort_level', description: 'Sort by level' },
        { label: '⏱️ Sort by Activity', value: 'sort_voiceTime', description: 'Sort by voice activity' }
    ];
    
    // Set one default selection based on current view state
    // Priority: type > period > sort
    let defaultSet = false;
    filterOptions.forEach(opt => { opt.default = false; });  // Reset all defaults
    
    // First try to set type as default
    if (!defaultSet) {
        const typeOption = filterOptions.find(opt => opt.value === type);
        if (typeOption) {
            typeOption.default = true;
            defaultSet = true;
        }
    }
    
    // If no type matched, try period
    if (!defaultSet) {
        const periodOption = filterOptions.find(opt => opt.value === period);
        if (periodOption) {
            periodOption.default = true;
            defaultSet = true;
        }
    }
    
    // If still no default, try sort
    if (!defaultSet) {
        const sortOption = filterOptions.find(opt => opt.value === `sort_${sort}`);
        if (sortOption) {
            sortOption.default = true;
        }
    }

    const filterRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('leaderboard_filter')
            .setPlaceholder('Select Filter or Sort Option')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(filterOptions)
    );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('leaderboard_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page === 1),
        new ButtonBuilder().setCustomId('leaderboard_page').setLabel(`${page} / ${totalPagesSafe}`).setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('leaderboard_next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page === totalPagesSafe)
    );

    // Response handling with error catching
    const responseOptions = { 
        embeds: [leaderboardEmbed], 
        components: [row, filterRow],
        fetchReply: true
    };

    let message;
    try {
        // Simple response handling
        if (!interaction.deferred && !interaction.replied) {
            message = await interaction.reply({ ...responseOptions, fetchReply: true });
        } else {
            message = await interaction.editReply(responseOptions);
        }

        if (!message) {
            throw new Error('Failed to send leaderboard message');
        }
    } catch (error) {
        console.error('Error sending leaderboard response:', error);
        const errorMessage = {
            content: 'There was an error displaying the leaderboard. Please try the command again.',
            ephemeral: true
        };
        
        try {
            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        } catch (followUpError) {
            console.error('Error sending error message:', followUpError);
        }
        return;
    }

    // Set up collector for all component types
    const collector = message.createMessageComponentCollector({
        time: 180000, // 3 minutes
        filter: i => i.user.id === userId && (i.isButton() || i.isStringSelectMenu()),
        max: 50
    });

    // Track active interactions to prevent duplicates
    const activeInteractions = new Set();
    
    collector.on('collect', async (i) => {
        try {
            // Check if interaction is still valid
            if (!i.isValid()) {
                console.log('Received invalid interaction');
                return;
            }

            // Verify user permissions
            if (i.user.id !== userId) {
                await i.reply({ 
                    content: 'Only the user who ran the command can use these controls.', 
                    ephemeral: true 
                });
                return;
            }

            // Defer the interaction immediately
            await i.deferUpdate().catch(error => {
                console.error('Failed to defer interaction:', error);
            });

            if (i.isButton()) {
                switch (i.customId) {
                    case 'leaderboard_prev':
                        if (page > 1) {
                            await showLeaderboard(i, page - 1, type, period, sort);
                        }
                        break;
                    case 'leaderboard_next':
                        if (page < totalPagesSafe) {
                            await showLeaderboard(i, page + 1, type, period, sort);
                        }
                        break;
                }
            } else if (i.isStringSelectMenu() && i.customId === 'leaderboard_filter') {
                const selected = i.values[0];
                let newType = type, newPeriod = period, newSort = sort;

                // Handle filter/sort selection
                if (['xp', 'chatXP', 'vcXP'].includes(selected)) newType = selected;
                if (['all', 'weekly', 'monthly'].includes(selected)) newPeriod = selected;
                if (selected.startsWith('sort_')) {
                    switch (selected) {
                        case 'sort_xp': newSort = 'xp'; break;
                        case 'sort_level': newSort = 'level'; break;
                        case 'sort_voiceTime': newSort = 'voiceTime'; break;
                    }
                }

                try {
                    await showLeaderboard(i, 1, newType, newPeriod, newSort);
                } catch (err) {
                    console.error('Failed to update leaderboard:', err);
                    await i.followUp({
                        content: 'Failed to update the leaderboard. Please try again.',
                        ephemeral: true
                    }).catch(console.error);
                }
            }
        } catch (error) {
            console.error('Error handling interaction:', error);
            try {
                // Only send error message if we haven't already sent a response
                if (!i.replied && !i.deferred) {
                    await i.reply({ 
                        content: 'There was an error processing your request. Please try again.',
                        ephemeral: true 
                    });
                }
            } catch (e) {
                console.error('Failed to send error message:', e);
            }
        }
    });

    collector.on('end', async (collected, reason) => {
        // Only disable components if the message still exists and hasn't been replaced
        try {
            if (reason === 'time' || reason === 'limit') {
                const disabledRow = new ActionRowBuilder().addComponents(
                    row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
                );
                const disabledFilterRow = new ActionRowBuilder().addComponents(
                    filterRow.components.map(menu => StringSelectMenuBuilder.from(menu).setDisabled(true))
                );
                
                await message.edit({ 
                    components: [disabledRow, disabledFilterRow]
                });
            }
        } catch {} // Ignore if message was deleted or can't be edited
    });

    } catch (globalError) {
        console.error('Global leaderboard error:', globalError);
        try {
            const errorMessage = {
                content: 'An unexpected error occurred. Please try again later.',
                ephemeral: true
            };
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply(errorMessage);
            } else {
                await interaction.followUp(errorMessage);
            }
        } catch (finalError) {
            console.error('Failed to send error message:', finalError);
        }
    }
}

function getLeaderboardColor(userCount) {
    if (userCount >= 15) return '#FFD700'; // Gold
    if (userCount >= 10) return '#32CD32'; // Green
    if (userCount >= 5) return '#1E90FF';  // Blue
    return '#9370DB';                     // Purple
}