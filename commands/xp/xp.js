const { SlashCommandBuilder } = require('discord.js');
const XPManager = require('../../utils/XPManager');
const { EmbedTemplates, Colors } = require('../../utils/EmbedTemplates');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xp')
        .setDescription('Check your XP and level')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose XP you want to check')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user') || interaction.user;
            const guildId = interaction.guild.id;
            
            // Get user's detailed stats
            const userStats = await XPManager.getUserStats(user.id, guildId);
            
            if (!userStats || userStats.xp === 0) {
                const noDataEmbed = EmbedTemplates.createEmbed({
                    title: 'No XP Data Found',
                    description: `**${user.username}** hasn't earned any XP yet!\n\n**How to earn XP:**\n\`\`\`diff\n+ Join voice channels to start earning\n+ Stay active and talk with others\n+ Use camera for bonus XP\n\`\`\`\n\n**XP Rates:**\n\`\`\`yaml\nMuted:    0.5 XP/min\nTalking:  1.0 XP/min\nStreaming: 2.0 XP/min\nCamera:   5.0 XP/min\`\`\``,
                    color: Colors.WARNING,
                    thumbnail: user.displayAvatarURL({ dynamic: true })
                });
                
                return await interaction.reply({ embeds: [noDataEmbed] });
            }

            // Calculate progress for next level
            const currentLevelXP = XPManager.calculateXPForLevel(userStats.level);
            const nextLevelXP = XPManager.calculateXPForLevel(userStats.level + 1);
            const progressXP = userStats.xp - currentLevelXP;
            const neededXP = nextLevelXP - currentLevelXP;
            const progressPercentage = Math.round((progressXP / neededXP) * 100);
            const progressBar = createProgressBar(progressPercentage);

            // Calculate voice time in hours and minutes
            const voiceHours = Math.floor(userStats.voiceTime / 60);
            const voiceMinutes = userStats.voiceTime % 60;
            const voiceTimeFormatted = voiceHours > 0 ? `${voiceHours}h ${voiceMinutes}m` : `${voiceMinutes}m`;

            // Get user status
            const statusText = userStats.isTracked ? 'Active in Voice' : 'Not in Voice';

            // Level badge based on level
            const levelBadge = getLevelBadge(userStats.level);

            // Create main description
            const description = `**${levelBadge} Level ${userStats.level}** • **Rank #${userStats.rank || 'N/A'}**\n\n**Progress to Level ${userStats.level + 1}:**\n${progressBar}\n\`${progressXP.toLocaleString()} / ${neededXP.toLocaleString()} XP\` **(${progressPercentage}%)**`;

            // Prepare clean fields array
            const fields = [
                { 
                    name: 'Total Experience', 
                    value: `**${userStats.xp.toLocaleString()}** XP`, 
                    inline: true 
                },
                { 
                    name: 'Chat XP', 
                    value: `**${userStats.chatXP.toLocaleString()}**`, 
                    inline: true 
                },
                { 
                    name: 'VC XP', 
                    value: `**${userStats.vcXP.toLocaleString()}**`, 
                    inline: true 
                },
                { 
                    name: 'Voice Time', 
                    value: `**${voiceTimeFormatted}**`, 
                    inline: true 
                },
                { 
                    name: 'Status', 
                    value: `**${statusText}**`, 
                    inline: true 
                },
                {
                    name: 'XP Earning Rates',
                    value: `\`\`\`yaml\nMuted:    0.5 XP/min\nTalking:  1.0 XP/min\nStreaming: 2.0 XP/min\nCamera:   5.0 XP/min\nChat:     5 XP/msg (30s cooldown)\`\`\``,
                    inline: false
                }
            ];

            const xpEmbed = EmbedTemplates.createEmbed({
                title: `${user.username}'s XP Statistics`,
                description: description,
                color: getColorByLevel(userStats.level),
                thumbnail: user.displayAvatarURL({ dynamic: true, size: 256 }),
                fields: fields,
                footer: {
                    text: `Keep talking in voice channels to level up! • ${interaction.guild.name}`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                },
                timestamp: new Date()
            });

            await interaction.reply({ embeds: [xpEmbed] });

        } catch (error) {
            console.error('Error in xp command:', error);
            
            const errorEmbed = EmbedTemplates.createEmbed({
                title: 'Error',
                description: 'An error occurred while fetching XP data. Please try again later.',
                color: Colors.ERROR
            });

            await interaction.reply({ embeds: [errorEmbed], flags: 64 }); // 64 = MessageFlags.Ephemeral
        }
    }
};

// Helper function to create modern progress bar
function createProgressBar(percentage) {
    const totalBars = 24;
    const filledBars = Math.round((percentage / 100) * totalBars);
    const emptyBars = totalBars - filledBars;
    
    // Use different characters for a more modern look
    const filled = '▰';
    const empty = '▱';
    
    const progressBar = filled.repeat(filledBars) + empty.repeat(emptyBars);
    return `\`${progressBar}\``;
}

// Helper function to get level badge emoji (minimal)
function getLevelBadge(level) {
    if (level >= 100) return '👑'; // Crown for level 100+
    if (level >= 50) return '💎';  // Diamond for level 50+
    if (level >= 25) return '⭐';  // Star for level 25+
    return '';                     // No badge for lower levels
}

// Helper function to get color based on level
function getColorByLevel(level) {
    if (level >= 100) return '#FFD700'; // Gold
    if (level >= 75) return '#E6E6FA';  // Lavender
    if (level >= 50) return '#FF6347';  // Tomato
    if (level >= 25) return '#32CD32';  // Lime Green
    if (level >= 10) return '#1E90FF';  // Dodger Blue
    if (level >= 5) return '#FF69B4';   // Hot Pink
    return '#9370DB';                   // Medium Purple
}
