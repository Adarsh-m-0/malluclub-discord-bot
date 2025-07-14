// Example Usage of Enhanced Embed Templates and Utilities
// This file demonstrates how to use the new embed system

const { EmbedTemplates, Colors } = require('./utils/EmbedTemplates');
const { EmbedUtils } = require('./utils/EmbedUtils');

// ============= BASIC TEMPLATE EXAMPLES =============

// 1. Success Message
function showSuccessExample(user, guild) {
    return EmbedTemplates.success(
        'Command Executed Successfully',
        'Your voice XP has been updated! You gained 50 XP points.',
        user
    );
}

// 2. Error Message
function showErrorExample(user) {
    return EmbedTemplates.error(
        'Insufficient Permissions',
        'You need the `Manage Messages` permission to use this command.',
        user
    );
}

// 3. User Profile with Enhanced Styling
function showUserProfileExample(user, guild, voiceData) {
    const embed = EmbedTemplates.userProfile(user, guild)
        .addFields(
            EmbedUtils.createField('🎤 Voice Level', `Level ${voiceData.level}`, true),
            EmbedUtils.createField('💎 Total XP', EmbedUtils.formatNumber(voiceData.totalXP), true),
            EmbedUtils.createField('⏱️ Voice Time', EmbedUtils.formatDuration(voiceData.totalTime * 1000), true),
            EmbedUtils.createField('\u200B', '\u200B', false), // Spacer
            EmbedUtils.createField(
                '📊 Level Progress',
                EmbedUtils.createProgressBar(voiceData.currentXP, voiceData.neededXP, 12),
                false
            )
        );
    
    return embed;
}

// 4. Voice XP Leaderboard with Enhanced Design
function showEnhancedLeaderboard(guild, leaderboardData, page = 0, totalPages = 1) {
    const embed = EmbedTemplates.leaderboard('xp', guild);
    
    // Enhanced description with better formatting
    let description = '';
    const medals = ['🥇', '🥈', '🥉'];
    const gems = ['💎', '🔷', '🔹', '◾'];
    
    leaderboardData.forEach((userData, index) => {
        const rank = page * 10 + index + 1;
        let emoji = rank <= 3 ? medals[rank - 1] : gems[Math.min(Math.floor((rank - 4) / 2), 3)];
        
        const xp = EmbedUtils.formatNumber(userData.totalXP);
        const time = EmbedUtils.formatDuration(userData.totalTime * 1000);
        
        description += `${emoji} **#${rank}** ${userData.username}\n`;
        description += `   💎 **${xp} XP** • 🌟 Level ${userData.level} • ⏱️ ${time}\n\n`;
    });
    
    embed.setDescription(description);
    
    // Add statistics
    embed.addFields(
        EmbedUtils.createField('📊 Total Members', leaderboardData.length.toLocaleString(), true),
        EmbedUtils.createField('📄 Current Page', `${page + 1}/${totalPages}`, true),
        EmbedUtils.createField('⚡ Last Updated', EmbedUtils.timestamp(new Date()), true)
    );
    
    return embed;
}

// 5. Moderation Action with Professional Styling
function showModerationExample(action, target, moderator, reason, duration, guild) {
    const embed = EmbedTemplates.moderation(action, target, moderator, guild)
        .addFields(
            EmbedUtils.createField('👤 Target', EmbedUtils.userMention(target.id), true),
            EmbedUtils.createField('👮 Moderator', EmbedUtils.userMention(moderator.id), true),
            EmbedUtils.createField('📅 Time', EmbedUtils.timestamp(new Date()), true)
        );
    
    if (reason) {
        embed.addFields(EmbedUtils.createField('📝 Reason', reason, false));
    }
    
    if (duration) {
        embed.addFields(EmbedUtils.createField('⏱️ Duration', EmbedUtils.formatDuration(duration), true));
    }
    
    return embed;
}

// 6. Welcome Message with Rich Content
function showWelcomeExample(user, guild) {
    const embed = EmbedTemplates.welcome(user, guild)
        .setDescription(`Welcome to **${guild.name}**, ${user}! 🎉\n\nWe're thrilled to have you join our amazing community!`)
        .addFields(
            EmbedUtils.createField('🌟 What makes us special?', 
                '• Active voice channels with XP rewards\n• Friendly community members\n• Regular events and activities\n• Fair moderation and rules', 
                false
            ),
            EmbedUtils.createField('🚀 Getting Started', 
                '• Check out our rules in #rules\n• Introduce yourself in #introductions\n• Join voice channels to earn XP\n• Ask questions in #general', 
                false
            )
        );
    
    return embed;
}

// ============= ADVANCED UTILITY EXAMPLES =============

// 7. Paginated Content Example
function showPaginatedExample(allData, page = 0) {
    const paginatedData = EmbedUtils.createPaginatedEmbed(allData, 5, 'Voice Activity History');
    const currentPage = paginatedData[page];
    
    // Customize the embed for this page
    currentPage.embed.setColor(Colors.VOICE_XP);
    
    // Add page data
    currentPage.data.forEach((item, index) => {
        currentPage.embed.addFields(
            EmbedUtils.createField(
                `Session ${page * 5 + index + 1}`,
                `**Duration:** ${EmbedUtils.formatDuration(item.duration)}\n**XP Gained:** ${item.xpGained}`,
                true
            )
        );
    });
    
    const navigationButtons = EmbedUtils.createPaginationButtons(page, paginatedData.length);
    
    return { embed: currentPage.embed, components: [navigationButtons] };
}

// 8. Confirmation Dialog Example
function showConfirmationExample(user, actionDescription) {
    const { embed, row } = EmbedUtils.createConfirmation(
        'Confirm Action',
        `Are you sure you want to ${actionDescription}?\n\n⚠️ This action cannot be undone.`,
        user
    );
    
    return { embeds: [embed], components: [row] };
}

// 9. Statistics Dashboard Example
function showStatsDashboard(guild, user, stats) {
    const embed = EmbedTemplates.statistics(
        `${guild.name} Voice Statistics`,
        {
            'Total Members': stats.totalMembers.toLocaleString(),
            'Active Today': stats.activeToday.toLocaleString(),
            'Total Voice Time': EmbedUtils.formatDuration(stats.totalVoiceTime),
            'Total XP Earned': EmbedUtils.formatNumber(stats.totalXP),
            'Average Level': stats.averageLevel.toFixed(1),
            'Top Level': stats.topLevel,
            'Active Channels': stats.activeChannels,
            'Peak Online': stats.peakOnline,
            'Server Age': EmbedUtils.formatDuration(Date.now() - guild.createdTimestamp)
        },
        guild,
        user
    );
    
    return embed;
}

// 10. Loading States Example
function showLoadingExample() {
    return EmbedUtils.createLoading(
        'Processing Voice Data',
        '🔄 Calculating your voice statistics and level progress...\n\nThis may take a few moments for large servers.'
    );
}

// ============= COLOR SCHEME EXAMPLES =============

// 11. Custom Color Themes
const CustomThemes = {
    // Gradient-inspired themes
    sunset: [Colors.YELLOW, Colors.FUCHSIA, Colors.RED],
    ocean: [Colors.BLURPLE, Colors.INFO, Colors.GREEN],
    forest: [Colors.GREEN, Colors.SUCCESS, Colors.DARK],
    
    // Status-based themes
    positive: Colors.SUCCESS,
    negative: Colors.ERROR,
    neutral: Colors.INFO,
    warning: Colors.WARNING,
    
    // Feature-based themes
    voice: Colors.VOICE_XP,
    moderation: Colors.MODERATION,
    fun: Colors.FUN,
    music: Colors.MUSIC
};

// 12. Dynamic Color Selection
function getDynamicColor(type, value) {
    const colorMap = {
        xp: value > 10000 ? Colors.FUCHSIA : value > 5000 ? Colors.BLURPLE : Colors.INFO,
        level: value > 50 ? Colors.YELLOW : value > 25 ? Colors.GREEN : Colors.BLURPLE,
        time: value > 86400000 ? Colors.FUCHSIA : value > 3600000 ? Colors.GREEN : Colors.INFO, // milliseconds
        streak: value > 30 ? Colors.RED : value > 7 ? Colors.YELLOW : Colors.GREEN
    };
    
    return colorMap[type] || Colors.BLURPLE;
}

module.exports = {
    // Template examples
    showSuccessExample,
    showErrorExample,
    showUserProfileExample,
    showEnhancedLeaderboard,
    showModerationExample,
    showWelcomeExample,
    
    // Utility examples
    showPaginatedExample,
    showConfirmationExample,
    showStatsDashboard,
    showLoadingExample,
    
    // Color utilities
    CustomThemes,
    getDynamicColor
};
