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
            
            // Build minimal, informative leaderboard text
            let leaderboardText = `Pos  Name             Lv   XP     Chat  VC\n`;
            leaderboardText += `---------------------------------------------\n`;
            for (let i = 0; i < leaderboard.length; i++) {
                const entry = leaderboard[i];
                const user = await interaction.guild.members.fetch(entry.userId).catch(() => null);
                let username = user ? user.displayName : 'Unknown User';
                if (username.length > 13) username = username.slice(0, 11) + '…';
                const position = (i + 1).toString().padStart(2, ' ');
                // Calculate level from XP to ensure accuracy
                const level = Math.floor(entry.xp / 200);
                leaderboardText += `${position}. ${username.padEnd(13, ' ')} ${level.toString().padStart(2, ' ')} ${entry.xp.toLocaleString().padStart(6, ' ')} ${entry.chatXP.toLocaleString().padStart(5, ' ')} ${entry.vcXP.toLocaleString().padStart(5, ' ')}\n`;
            }

            const leaderboardEmbed = EmbedTemplates.createEmbed({
                title: `XP Leaderboard`,
                description: '```\n' + leaderboardText + '```',
                color: getLeaderboardColor(leaderboard.length),
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

// Helper function to get color based on leaderboard size
function getLeaderboardColor(userCount) {
    if (userCount >= 15) return '#FFD700'; // Gold for active servers
    if (userCount >= 10) return '#32CD32'; // Green for medium activity
    if (userCount >= 5) return '#1E90FF';  // Blue for some activity
    return '#9370DB';                      // Purple for low activity
}