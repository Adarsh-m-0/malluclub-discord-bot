const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ModerationLog = require('../../models/ModerationLog');
const User = require('../../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modlogs')
        .setDescription('View moderation logs')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('View logs for a specific user')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Filter by action type')
                .setRequired(false)
                .addChoices(
                    { name: 'Kick', value: 'kick' },
                    { name: 'Ban', value: 'ban' },
                    { name: 'Mute', value: 'mute' },
                    { name: 'Unmute', value: 'unmute' },
                    { name: 'Warn', value: 'warn' },
                    { name: 'Clear', value: 'clear' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const action = interaction.options.getString('action');
        
        try {
            await interaction.deferReply();
            
            // Build query
            const query = {};
            if (target) query.userId = target.id;
            if (action) query.action = action;
            
            // Get logs from database
            const logs = await ModerationLog.find(query)
                .sort({ timestamp: -1 })
                .limit(20);
            
            if (logs.length === 0) {
                const noLogsEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('📋 Moderation Logs')
                    .setDescription('No moderation logs found with the specified criteria.')
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [noLogsEmbed] });
            }
            
            // If target user is specified, also show their warnings
            let warningsText = '';
            if (target) {
                const userData = await User.findOne({ userId: target.id });
                if (userData && userData.warnings.length > 0) {
                    warningsText = `\n**Active Warnings (${userData.warnings.length}):**\n`;
                    userData.warnings.slice(-5).forEach((warning, index) => {
                        warningsText += `${index + 1}. ${warning.reason} - *${warning.moderator}* (<t:${Math.floor(warning.timestamp.getTime() / 1000)}:R>)\n`;
                    });
                }
            }
            
            // Create embed
            const logsEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📋 Moderation Logs')
                .setDescription(`Showing ${logs.length} recent log(s)${target ? ` for ${target.tag}` : ''}${action ? ` (${action})` : ''}${warningsText}`)
                .setTimestamp();
            
            // Add log entries
            let logsText = '';
            for (const log of logs) {
                const moderator = await interaction.client.users.fetch(log.moderatorId).catch(() => null);
                const user = await interaction.client.users.fetch(log.userId).catch(() => null);
                
                const actionEmoji = {
                    kick: '🦶',
                    ban: '🔨',
                    mute: '🔇',
                    unmute: '🔊',
                    warn: '⚠️',
                    clear: '🧹'
                };
                
                logsText += `${actionEmoji[log.action] || '❓'} **${log.action.toUpperCase()}** | ${user ? user.tag : 'Unknown User'} | ${moderator ? moderator.tag : 'Unknown Moderator'}\n`;
                logsText += `📝 ${log.reason}\n`;
                logsText += `🕐 <t:${Math.floor(log.timestamp.getTime() / 1000)}:R>\n\n`;
                
                if (logsText.length > 1500) {
                    logsText += '... (truncated)';
                    break;
                }
            }
            
            logsEmbed.addFields({ name: 'Recent Actions', value: logsText || 'No actions found' });
            
            await interaction.editReply({ embeds: [logsEmbed] });
            
        } catch (error) {
            console.error('Error fetching moderation logs:', error);
            await interaction.editReply({ content: '❌ An error occurred while fetching moderation logs.' });
        }
    },
};
