const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const XPManager = require('../../utils/XPManager');
const { EmbedTemplates, Colors } = require('../../utils/EmbedTemplates');

const PAGE_SIZE = 10;
const BADGES = ['🥇', '🥈', '🥉'];
const MILESTONE_LEVELS = [50, 100];

// Filter options for the select menu - simplified and clear descriptions
const FILTER_OPTIONS = [
    { label: '📊 Combined XP', value: 'xp', description: 'Chat + Voice XP combined' },
    { label: '💬 Chat XP', value: 'chatXP', description: 'Only XP from messages' },
    { label: '🎤 Voice XP', value: 'vcXP', description: 'Only XP from voice chat' },
    { label: '📅 Weekly', value: 'weekly', description: 'Last 7 days only' },
    { label: '📆 Monthly', value: 'monthly', description: 'Last 30 days only' }
];

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
        
        // Always sort by the selected type for simplicity
        const sort = customSort || type;
        
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
        
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: errorMsg,
                    ephemeral: true 
                });
            } else {
                await interaction.editReply({ 
                    content: errorMsg
                });
            }
        } catch (replyError) {
            console.error('Failed to send error message:', replyError);
        }
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
        if (period === 'weekly') {
            leaderboardText = 'No activity found in the last 7 days. Try the all-time leaderboard!';
        } else if (period === 'monthly') {
            leaderboardText = 'No activity found in the last 30 days. Try the all-time leaderboard!';
        } else {
            leaderboardText = 'No users found in this leaderboard';
        }
    } else {
        // Prepare member data fetching
        const userIds = pageEntries.map(entry => entry.userId);
        const members = new Map();
        
        try {
            // Fetch members in one batch request
            const fetchedMembers = await interaction.guild.members.fetch({ user: userIds });
            fetchedMembers.forEach(member => members.set(member.id, member));
        } catch (error) {
            console.error('Error fetching members:', error);
        }

        // Generate leaderboard entries
        leaderboardText = pageEntries.map((entry, index) => {
            const rank = startIdx + index + 1;
            const member = members.get(entry.userId);
            
            // Get badge based on rank or level
            const badge = rank <= 3 ? (BADGES[rank - 1] || '•') : 
                         entry.level >= 100 ? '💎' : 
                         entry.level >= 50 ? '✨' : '•';
            
            // Format user display info
            const displayName = member ? (member.displayName || member.user.username) : 'Unknown User';
            const mention = member ? `<@${entry.userId}>` : displayName;
            const rankStr = `#${rank}`.padStart(3);
            const levelInfo = `Level ${entry.level || 0}`.padEnd(10);
            const xpStr = (entry.xp || 0).toLocaleString().padStart(8);
            
            return `${badge} **${rankStr}** ${mention} • ${levelInfo} • ${xpStr} XP`;
        }).join('\n');
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

    // Calculate user progress information
    const userProgress = (() => {
        if (!userEntry) return { progressBar: '', userProgressText: '' };

        const currentLevelXP = XPManager.calculateXPForLevel(userEntry.level);
        const nextLevelXP = XPManager.calculateXPForLevel(userEntry.level + 1);
        const progressXP = userEntry.xp - currentLevelXP;
        const neededXP = nextLevelXP - currentLevelXP;

        if (neededXP <= 0) return { progressBar: '', userProgressText: '' };

        const progressPercentage = Math.min(100, Math.round((progressXP / neededXP) * 100));
        const filled = Math.round(progressPercentage / 5);

        return {
            progressBar: `Progress: [${'▰'.repeat(filled)}${'▱'.repeat(20 - filled)}] ${progressXP.toLocaleString()}/${neededXP.toLocaleString()} XP`,
            userProgressText: `\n\n**Your Progress**\nLevel ${userEntry.level} → ${userEntry.level + 1}\n${progressXP.toLocaleString()} / ${neededXP.toLocaleString()} XP (${progressPercentage}%)`
        };
    })();

    // Create embed title with clear information
    const typeNames = {
        'xp': 'Combined XP',
        'chatXP': 'Chat XP', 
        'vcXP': 'Voice XP'
    };
    
    const periodNames = {
        'all': '',
        'weekly': ' • This Week',
        'monthly': ' • This Month'
    };
    
    const title = `${typeNames[type]} Leaderboard${periodNames[period]}`;
    console.log(`Title created: "${title}" (type: ${type}, period: ${period})`); // Debug line

    // Clear any previous timeouts
    if (interaction.client._timeouts?.get(interaction.user.id)) {
        clearTimeout(interaction.client._timeouts.get(interaction.user.id));
        interaction.client._timeouts.delete(interaction.user.id);
    }

    const leaderboardEmbed = EmbedTemplates.createEmbed({
        title: title,
        description: `${leaderboardText}${userProgress.userProgressText}${truncated ? '\n\n*Some entries hidden due to length*' : ''}`,
        color: getLeaderboardColor(pageEntries.length),
        footer: {
            text: `Page ${page}/${totalPagesSafe}${userEntry ? ` • Your rank: #${userRank}` : ''}`,
            iconURL: interaction.guild.iconURL({ dynamic: true })
        },
        timestamp: new Date()
    });

    // Create options with the current selection marked as default - simplified logic
    const filterOptions = FILTER_OPTIONS.map(opt => ({
        ...opt,
        default: opt.value === type || opt.value === period
    }));

    // Ensure only one default by priority (type first, then period)
    const defaultOption = filterOptions.find(opt => opt.value === type) || 
                          filterOptions.find(opt => opt.value === period);

    if (defaultOption) {
        filterOptions.forEach(opt => opt.default = (opt === defaultOption));
    }

    const filterRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('leaderboard_filter')
            .setPlaceholder('Select XP Type or Time Period')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(filterOptions)
    );

    // Create navigation buttons with proper error handling
    const createNavigationRow = () => {
        try {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('leaderboard_prev')
                    .setLabel('◀')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page <= 1),
                new ButtonBuilder()
                    .setCustomId('leaderboard_page')
                    .setLabel(`${page} / ${totalPagesSafe}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('leaderboard_next')
                    .setLabel('▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= totalPagesSafe)
            );
        } catch (error) {
            console.error('Error creating navigation row:', error);
            return null;
        }
    };

    const navigationRow = createNavigationRow();
    if (!navigationRow) {
        throw new Error('Failed to create navigation buttons');
    }

    // Response handling with error catching
    const responseOptions = { 
        embeds: [leaderboardEmbed], 
        components: [navigationRow, filterRow],
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

    // Set up collector for all component types with improved filtering
    const collector = message.createMessageComponentCollector({
        time: 120000, // Reduced to 2 minutes to prevent expired interactions
        filter: i => {
            // Only allow the original user to interact
            if (i.user.id !== userId) return false;
            
            // Check if interaction is too old
            const interactionAge = Date.now() - i.createdTimestamp;
            if (interactionAge > 14 * 60 * 1000) { // 14 minutes max
                return false;
            }
            
            // Check if this interaction was already processed globally
            if (i.client._processedInteractions?.has(i.id)) {
                return false;
            }
            
            // Only allow our specific component interactions
            if (i.isButton()) {
                return ['leaderboard_prev', 'leaderboard_next', 'leaderboard_page'].includes(i.customId);
            }
            
            if (i.isStringSelectMenu()) {
                return i.customId === 'leaderboard_filter';
            }
            
            return false;
        },
        max: 50
    });

    // Initialize global interaction tracking if not exists
    if (!collector.client._processedInteractions) {
        collector.client._processedInteractions = new Set();
    }

    // Track active interactions to prevent duplicates
    const activeInteractions = new Set();
    
    collector.on('collect', async (i) => {
        try {
            // Add to global processed interactions immediately
            i.client._processedInteractions.add(i.id);
            
            // Clean up old processed interactions (keep last 1000)
            if (i.client._processedInteractions.size > 1000) {
                const oldInteractions = Array.from(i.client._processedInteractions).slice(0, 500);
                oldInteractions.forEach(id => i.client._processedInteractions.delete(id));
            }
            
            // Verify user permissions first
            if (i.user.id !== userId) {
                if (!i.replied && !i.deferred) {
                    await i.reply({ 
                        content: 'Only the user who ran the command can use these controls.', 
                        ephemeral: true 
                    }).catch(() => {});
                }
                return;
            }

            // Track active interactions using interaction ID
            const interactionKey = i.id;
            if (activeInteractions.has(interactionKey)) {
                console.log('Duplicate interaction prevented:', interactionKey);
                return;
            }
            activeInteractions.add(interactionKey);

            // Clear the interaction after processing
            setTimeout(() => activeInteractions.delete(interactionKey), 5000);

            // Add user-specific cooldown to prevent rapid clicking
            const userCooldownKey = `${userId}_leaderboard`;
            const now = Date.now();
            if (!i.client._userCooldowns) {
                i.client._userCooldowns = new Map();
            }
            
            const lastInteraction = i.client._userCooldowns.get(userCooldownKey);
            if (lastInteraction && now - lastInteraction < 1000) { // 1 second cooldown
                console.log('User cooldown active, ignoring interaction');
                activeInteractions.delete(interactionKey);
                return;
            }
            i.client._userCooldowns.set(userCooldownKey, now);

            // Check if interaction is still valid and within time limits
            const interactionAge = Date.now() - i.createdTimestamp;
            const maxInteractionAge = 14.5 * 60 * 1000; // 14.5 minutes (15min - safety buffer)
            
            if (interactionAge > maxInteractionAge) {
                console.log('Interaction expired, ignoring:', interactionKey);
                activeInteractions.delete(interactionKey);
                return;
            }

            // Check interaction state and defer immediately - simplified approach
            if (!i.deferred && !i.replied) {
                try {
                    await i.deferUpdate();
                } catch (deferError) {
                    console.error('Failed to defer interaction:', deferError);
                    
                    // Handle specific Discord API errors
                    if (deferError.code === 10062) {
                        console.log('Interaction expired or unknown, cleaning up');
                    } else if (deferError.code === 40060) {
                        console.log('Interaction already acknowledged');
                    } else if (deferError.message === 'Defer timeout') {
                        console.log('Defer operation timed out');
                    }
                    
                    // Clean up and exit if we can't defer
                    activeInteractions.delete(interactionKey);
                    return;
                }
            } else {
                // Interaction was already handled
                console.log('Interaction already processed, skipping');
                activeInteractions.delete(interactionKey);
                return;
            }

            // Handle button interactions with smooth transitions
            if (i.isButton()) {
                let newPage = page;
                
                if (i.customId === 'leaderboard_prev' && page > 1) {
                    newPage = page - 1;
                } else if (i.customId === 'leaderboard_next' && page < totalPagesSafe) {
                    newPage = page + 1;
                } else if (i.customId === 'leaderboard_page') {
                    // Page button clicked, no action needed
                    activeInteractions.delete(interactionKey);
                    return;
                }

                if (newPage !== page) {
                    try {
                        // Clean up before starting new leaderboard
                        activeInteractions.delete(interactionKey);
                        await showLeaderboard(i, newPage, type, period, sort);
                    } catch (showError) {
                        console.error('Error updating leaderboard for button:', showError);
                        // If showing leaderboard fails, send error message
                        if (i.deferred && !i.replied) {
                            await i.editReply({
                                content: 'There was an error updating the leaderboard page. Please try again.',
                                components: []
                            }).catch(() => {});
                        }
                    }
                } else {
                    // No page change needed, clean up
                    activeInteractions.delete(interactionKey);
                }
            } 
            // Handle select menu interactions with smooth transitions
            else if (i.isStringSelectMenu() && i.customId === 'leaderboard_filter') {
                if (!i.values || i.values.length === 0) {
                    console.error('No values in select menu interaction');
                    activeInteractions.delete(interactionKey);
                    return;
                }

                const selected = i.values[0];
                let newType = type, newPeriod = period, newSort = sort;
                console.log(`Filter selection: "${selected}" -> type: ${type}->${newType}, period: ${period}->${newPeriod}`); // Debug

                // Process filter selection - preserve current selections properly
                if (['xp', 'chatXP', 'vcXP'].includes(selected)) {
                    newType = selected;
                    // Keep current period (don't change time filter when changing XP type)
                } else if (['weekly', 'monthly'].includes(selected)) {
                    newPeriod = selected;
                    // Keep current type (don't change XP type when changing time period)
                }
                
                console.log(`After processing: type: ${newType}, period: ${newPeriod}`); // Debug

                // Update sort to match the type for better accuracy
                newSort = newType;

                // Always reset to page 1 when changing filters
                try {
                    // Clean up before starting new leaderboard
                    activeInteractions.delete(interactionKey);
                    await showLeaderboard(i, 1, newType, newPeriod, newSort);
                } catch (showError) {
                    console.error('Error updating leaderboard for select menu:', showError);
                    // If showing leaderboard fails, send error message
                    if (i.deferred && !i.replied) {
                        await i.editReply({
                            content: 'There was an error updating the leaderboard filter. Please try again.',
                            components: []
                        }).catch(() => {});
                    }
                }
            }
        } catch (error) {
            console.error('Error handling interaction:', error);
            
            // Clean up the interaction key using interaction ID
            const interactionKey = i.id;
            activeInteractions.delete(interactionKey);
            
            try {
                // Only send error message if we haven't already responded
                if (!i.replied && !i.deferred) {
                    await i.reply({ 
                        content: 'There was an error processing your request. Please try again.',
                        ephemeral: true 
                    }).catch(() => {});
                } else if (i.deferred && !i.replied) {
                    await i.editReply({
                        content: 'There was an error processing your request. Please try again.'
                    }).catch(() => {});
                }
            } catch (followUpError) {
                console.error('Failed to send error message:', followUpError);
            }
        }
    });

    collector.on('end', async (collected, reason) => {
        // Clean up global tracking for this user
        const userCooldownKey = `${userId}_leaderboard`;
        if (collector.client._userCooldowns) {
            collector.client._userCooldowns.delete(userCooldownKey);
        }
        
        // Only disable components if the message still exists and hasn't been replaced
        try {
            if (reason === 'time' || reason === 'limit') {
                const disabledNavigationRow = new ActionRowBuilder().addComponents(
                    navigationRow.components.map(button => ButtonBuilder.from(button).setDisabled(true))
                );
                const disabledFilterRow = new ActionRowBuilder().addComponents(
                    filterRow.components.map(menu => StringSelectMenuBuilder.from(menu).setDisabled(true))
                );
                
                await message.edit({ 
                    components: [disabledNavigationRow, disabledFilterRow]
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