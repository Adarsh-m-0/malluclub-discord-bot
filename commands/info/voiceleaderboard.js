const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const VoiceActivity = require('../../models/VoiceActivity');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voiceleaderboard')
        .setDescription('View voice activity leaderboards')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of leaderboard to view')
                .setRequired(false)
                .addChoices(
                    { name: 'Voice XP', value: 'xp' },
                    { name: 'Total Time', value: 'time' },
                    { name: 'Daily Streak', value: 'streak' },
                    { name: 'Level', value: 'level' }
                ))
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of users to show (1-20)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(20)),

    async execute(interaction) {
        const type = interaction.options.getString('type') || 'xp';
        const limit = interaction.options.getInteger('limit') || 10;

        await interaction.reply({ 
            content: '📊 Fetching voice activity data...',
            ephemeral: true 
        });

        try {
            let sortField;
            let title;
            let emoji;
            let color;

            switch (type) {
                case 'xp':
                    sortField = { voiceXP: -1 };
                    title = 'Voice XP Leaderboard';
                    emoji = '💎';
                    color = '#FF6B6B';
                    break;
                case 'time':
                    sortField = { totalVoiceTime: -1 };
                    title = 'Voice Time Leaderboard';
                    emoji = '⏱️';
                    color = '#4ECDC4';
                    break;
                case 'streak':
                    sortField = { 'dailyStats.streak': -1 };
                    title = 'Voice Streak Leaderboard';
                    emoji = '🔥';
                    color = '#FF9500';
                    break;
                case 'level':
                    sortField = { level: -1, voiceXP: -1 };
                    title = 'Voice Level Leaderboard';
                    emoji = '🌟';
                    color = '#FFD700';
                    break;
            }

            const topUsers = await VoiceActivity.find({ guildId: interaction.guild.id })
                .sort(sortField)
                .limit(limit);

            if (topUsers.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('📊 No Voice Activity')
                    .setDescription('No voice activity data found yet. Join a voice channel to start earning XP!')
                    .setTimestamp();
                    
                return interaction.editReply({ content: null, embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setTitle(`${emoji} ${title}`)
                .setColor(color)
                .setTimestamp();

            let leaderboardText = '';
            const medals = ['🥇', '🥈', '🥉'];

            for (let i = 0; i < topUsers.length; i++) {
                const user = topUsers[i];
                const rank = i + 1;
                const rankEmoji = rank <= 3 ? medals[rank - 1] : `**${rank}.**`;
                
                let value;
                switch (type) {
                    case 'xp':
                        value = `${user.voiceXP.toLocaleString()} XP`;
                        break;
                    case 'time':
                        value = formatTime(user.totalVoiceTime);
                        break;
                    case 'streak':
                        value = `${user.dailyStats?.streak || 0} days`;
                        break;
                    case 'level':
                        value = `Level ${user.level}`;
                        break;
                }

                leaderboardText += `${rankEmoji} **${user.username}**\n   ${value}\n\n`;
            }

            embed.addFields({
                name: `Top ${topUsers.length} Members`,
                value: leaderboardText,
                inline: false
            });

            embed.setFooter({
                text: `Requested by ${interaction.user.tag} • Voice XP System`,
                iconURL: interaction.user.displayAvatarURL()
            });

            await interaction.editReply({ content: null, embeds: [embed] });

        } catch (error) {
            console.error('Voice leaderboard error:', error);
            
            await interaction.editReply({
                content: '❌ Error fetching leaderboard data. Please try again later.'
            });
        }
    },
};

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
