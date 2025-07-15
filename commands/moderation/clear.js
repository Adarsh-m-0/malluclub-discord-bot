const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ModerationLog = require('../../models/ModerationLog');
const { EmbedTemplates, Colors } = require('../../utils/EmbedTemplates');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear messages from a channel')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to clear (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Only clear messages from this user')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const target = interaction.options.getUser('target');
        
        try {
            await interaction.deferReply({ ephemeral: true });
            
            // Fetch messages
            const messages = await interaction.channel.messages.fetch({ limit: amount });
            
            let messagesToDelete = messages;
            
            // Filter messages if target user is specified
            if (target) {
                messagesToDelete = messages.filter(msg => msg.author.id === target.id);
            }
            
            // Filter out messages older than 14 days (Discord limitation)
            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            messagesToDelete = messagesToDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);
            
            if (messagesToDelete.size === 0) {
                return interaction.editReply({ content: '❌ No messages found to delete or all messages are older than 14 days.' });
            }
            
            // Delete messages
            await interaction.channel.bulkDelete(messagesToDelete, true);
            
            // Log to database
            const modLog = new ModerationLog({
                userId: target ? target.id : 'N/A',
                moderatorId: interaction.user.id,
                action: 'clear',
                reason: target ? `Cleared ${messagesToDelete.size} messages from ${target.tag}` : `Cleared ${messagesToDelete.size} messages`,
                additionalInfo: { 
                    messageCount: messagesToDelete.size,
                    channelId: interaction.channel.id,
                    targetUser: target ? target.tag : null
                }
            });
            await modLog.save();
            
            // Success embed
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Messages Cleared')
                .setDescription(`Successfully cleared ${messagesToDelete.size} message(s)`)
                .addFields(
                    { name: 'Channel', value: `${interaction.channel}`, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Target User', value: target ? target.tag : 'All users', inline: true }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Log to log channel
            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (logChannel && logChannel.id !== interaction.channel.id) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#ff6600')
                        .setTitle('🧹 Messages Cleared')
                        .setDescription(`${messagesToDelete.size} message(s) were cleared by ${interaction.user}`)
                        .addFields(
                            { name: 'Channel', value: `${interaction.channel}`, inline: true },
                            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                            { name: 'Target User', value: target ? target.tag : 'All users', inline: true },
                            { name: 'Messages Cleared', value: `${messagesToDelete.size}`, inline: true }
                        )
                        .setFooter({ text: 'Messages Cleared' })
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
        } catch (error) {
            console.error('Error clearing messages:', error);
            await interaction.editReply({ content: '❌ An error occurred while clearing messages.' });
        }
    },
};
