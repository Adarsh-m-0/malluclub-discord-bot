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
            
            // Build leaderboard text with clean formatting
            let leaderboardText = '';
            const topUsers = leaderboard.slice(0, 3); // Top 3 users
            const otherUsers = leaderboard.slice(3); // Remaining users
            
            // Format top 3 users with special styling
            for (let i = 0; i < topUsers.length; i++) {
                const entry = topUsers[i];
                const user = await interaction.guild.members.fetch(entry.userId).catch(() => null);
                const username = user ? user.displayName : 'Unknown User';
                
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
                const levelBadge = getLevelBadge(entry.level);
                
                leaderboardText += `${medal} **${username}** ${levelBadge}\n`;
                leaderboardText += `    \`Level ${entry.level}\` • \`${entry.xp.toLocaleString()} XP\`\n\n`;
            }
            
            // Add separator if there are more users
            if (otherUsers.length > 0) {
                leaderboardText += '**─────────────────────**\n\n';
            }
            
            // Format remaining users with clean numbering
            for (let i = 0; i < otherUsers.length; i++) {
                const entry = otherUsers[i];
                const user = await interaction.guild.members.fetch(entry.userId).catch(() => null);
                const username = user ? user.displayName : 'Unknown User';
                
                const position = `${i + 4}`;
                const levelBadge = getLevelBadge(entry.level);
                
                leaderboardText += `\`${position.padStart(2, ' ')}.\` **${username}** ${levelBadge}\n`;
                leaderboardText += `      \`Level ${entry.level}\` • \`${entry.xp.toLocaleString()} XP\`\n\n`;
            }
            
            // Calculate total XP and average level
            const totalXP = leaderboard.reduce((sum, entry) => sum + entry.xp, 0);
            const avgLevel = Math.round(leaderboard.reduce((sum, entry) => sum + entry.level, 0) / leaderboard.length);
            
            const leaderboardEmbed = EmbedTemplates.createEmbed({
                title: `XP Leaderboard - Top ${leaderboard.length}`,
                description: leaderboardText,
                color: getLeaderboardColor(leaderboard.length),
                fields: [
                    {
                        name: 'Server Stats',
                        value: `\`\`\`yaml\nTotal XP: ${totalXP.toLocaleString()}\nAverage Level: ${avgLevel}\nActive Users: ${leaderboard.length}\`\`\``,
                        inline: false
                    }
                ],
                footer: {
                    text: `Keep earning XP to climb the ranks! • ${interaction.guild.name}`,
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

// Helper function to get level badge (minimal emojis)
function getLevelBadge(level) {
    if (level >= 100) return '👑'; // Crown for level 100+
    if (level >= 50) return '💎';  // Diamond for level 50+
    if (level >= 25) return '⭐';  // Star for level 25+
    return '';                     // No badge for lower levels
}

// Helper function to get color based on leaderboard size
function getLeaderboardColor(userCount) {
    if (userCount >= 15) return '#FFD700'; // Gold for active servers
    if (userCount >= 10) return '#32CD32'; // Green for medium activity
    if (userCount >= 5) return '#1E90FF';  // Blue for some activity
    return '#9370DB';                      // Purple for low activity
}