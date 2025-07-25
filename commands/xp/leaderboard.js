const { SlashCommandBuilder } = require('discord.js');
const XPManager = require('../../utils/XPManager');
const { EmbedTemplates, Colors } = require('../../utils/EmbedTemplates');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Display the XP leaderboard')
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of users to display (1-20)')
                .setMinValue(1)
                .setMaxValue(20)
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            const limit = interaction.options.getInteger('limit') || 10;
            const guildId = interaction.guild.id;
            
            // Get leaderboard data
            const leaderboard = await XPManager.getLeaderboard(guildId, limit);
            
            if (!leaderboard || leaderboard.length === 0) {
                const noDataEmbed = EmbedTemplates.createEmbed({
                    title: 'Empty Leaderboard',
                    description: 'No users have earned XP yet.\n\n**Get started:**\n```diff\n+ Join voice channels to earn XP\n+ Talk and be active with others\n+ Use camera for bonus XP\n```',
                    color: Colors.WARNING
                });
                
                return await interaction.reply({ embeds: [noDataEmbed] });
            }
            
            // Ensure required variables for pagination and highlighting
            const userId = interaction.user.id;
            const BADGES = [];
            const startIdx = 0;
            const endIdx = leaderboard.length;
            const pageEntries = leaderboard;
            const userEntry = leaderboard.find(e => e.userId === userId);
            const userRank = leaderboard.findIndex(e => e.userId === userId) + 1;
            const page = 1;
            const totalPagesSafe = 1;
            const totalUsers = leaderboard.length;
            const type = 'all';
            const period = 'all';

            // Build minimal, informative leaderboard text
            let leaderboardText = `#  Name         Lv   XP\n`;
            leaderboardText += `------------------------\n`;
            for (let i = 0; i < pageEntries.length; i++) {
                const entry = pageEntries[i];
                let username = (await interaction.guild.members.fetch(entry.userId).catch(() => null))?.displayName || 'Unknown';
                if (username.length > 10) username = username.slice(0, 8) + '…';
                const position = (startIdx + i + 1).toString().padStart(2, ' ');
                // Calculate level from XP for accuracy
                const level = Math.floor(entry.xp / 200);
                // Highlight user
                const highlight = entry.userId === userId ? '➡️ ' : '';
                leaderboardText += `${highlight}${position}. ${username.padEnd(10, ' ')} ${level.toString().padStart(2, ' ')} ${entry.xp.toLocaleString().padStart(5, ' ')}\n`;
            }
            // If user not on page, show their entry at the bottom
            if (userEntry && (userRank < startIdx + 1 || userRank > endIdx)) {
                let username = (await interaction.guild.members.fetch(userEntry.userId).catch(() => null))?.displayName || 'Unknown';
                if (username.length > 10) username = username.slice(0, 8) + '…';
                const level = Math.floor(userEntry.xp / 200);
                leaderboardText += `\n➡️${userRank.toString().padStart(2, ' ')}. ${username.padEnd(10, ' ')} ${level.toString().padStart(2, ' ')} ${userEntry.xp.toLocaleString().padStart(5, ' ')}   (You)\n`;
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
                const level = Math.floor(userEntry.xp / 200);
                const currentLevelXP = 200 * level;
                const nextLevelXP = 200 * (level + 1);
                const progressXP = userEntry.xp - currentLevelXP;
                const neededXP = nextLevelXP - currentLevelXP;
                const progressPercentage = Math.round((progressXP / neededXP) * 100);
                progressBar = `Progress: [${'▰'.repeat(Math.round(progressPercentage / 5))}${'▱'.repeat(20 - Math.round(progressPercentage / 5))}] ${progressXP}/${neededXP} XP`;
            }
            const leaderboardEmbed = EmbedTemplates.createEmbed({
                title: `XP Leaderboard`,
                description: '```\n' + leaderboardDesc + '```' + (progressBar ? `\n${progressBar}` : '') + (truncated ? '\n*Leaderboard truncated for display*' : ''),
                color: getLeaderboardColor(pageEntries.length),
                footer: {
                    text: `Page ${page}/${totalPagesSafe} • ${userEntry ? `You: #${userRank} of ${totalUsers}` : ''}`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                },
                timestamp: new Date()
            });

            await interaction.reply({ embeds: [leaderboardEmbed] });

        } catch (error) {
            console.error('Error in leaderboard command:', error);
            
            const errorEmbed = EmbedTemplates.createEmbed({
                title: 'Error',
                description: 'An error occurred while fetching the leaderboard.',
                color: Colors.ERROR
            });

            await interaction.reply({ embeds: [errorEmbed], flags: 64 }); // 64 = MessageFlags.Ephemeral
        }
    }
};

// Helper function to get color based on leaderboard size
function getLeaderboardColor(userCount) {
    if (userCount >= 15) return '#FFD700'; // Gold for active servers
    if (userCount >= 10) return '#32CD32'; // Green for medium activity
    if (userCount >= 5) return '#1E90FF';  // Blue for some activity
    return '#9370DB';                      // Purple for low activity
}