const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { EmbedTemplates, Colors } = require('../../utils/EmbedTemplates');
const ModerationLog = require('../../models/ModerationLog');

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
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false), // Disable in DMs
    
    async execute(interaction) {
        // Double-check permissions at runtime
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const noPermissionEmbed = EmbedTemplates.createEmbed({
                title: '❌ Access Denied',
                description: 'You need the `Manage Messages` permission to use this command.',
                color: Colors.ERROR
            });
            return interaction.reply({ embeds: [noPermissionEmbed], ephemeral: true });
        }

        const amount = interaction.options.getInteger('amount');
        const target = interaction.options.getUser('target');
        
        try {
            // Check if bot has permissions
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
                const botNoPermissionEmbed = EmbedTemplates.createEmbed({
                    title: '❌ Bot Missing Permission',
                    description: 'I need the `Manage Messages` permission to clear messages.',
                    color: Colors.ERROR
                });
                return interaction.reply({ embeds: [botNoPermissionEmbed], ephemeral: true });
            }

            await interaction.deferReply({ ephemeral: true });
            
            // Fetch messages with a higher limit to account for filtering
            const fetchLimit = target ? Math.min(amount * 2, 100) : amount;
            const messages = await interaction.channel.messages.fetch({ limit: fetchLimit });
            
            let messagesToDelete = messages;
            
            // Filter messages if target user is specified
            if (target) {
                messagesToDelete = messages.filter(msg => msg.author.id === target.id);
                
                // If we didn't find enough messages from the target, inform the user
                if (messagesToDelete.size < amount) {
                    const notEnoughEmbed = EmbedTemplates.createEmbed({
                        title: '⚠️ Limited Messages',
                        description: `Only found ${messagesToDelete.size} message(s) from ${target.tag} in the last ${fetchLimit} messages.`,
                        color: Colors.WARNING
                    });
                    await interaction.editReply({ embeds: [notEnoughEmbed] });
                }
            }
            
            // Filter out messages older than 14 days (Discord limitation)
            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            const validMessages = messagesToDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);
            const oldMessages = messagesToDelete.filter(msg => msg.createdTimestamp <= twoWeeksAgo);
            
            if (validMessages.size === 0) {
                const noMessagesEmbed = EmbedTemplates.createEmbed({
                    title: '❌ No Messages Found',
                    description: target 
                        ? `No messages from ${target.tag} found that are less than 14 days old.`
                        : 'No messages found that are less than 14 days old.',
                    color: Colors.ERROR
                });
                return interaction.editReply({ embeds: [noMessagesEmbed] });
            }

            // Limit to requested amount
            const finalMessages = validMessages.first(amount);
            
            // Delete messages
            const deletedMessages = await interaction.channel.bulkDelete(finalMessages, true);
            const deletedCount = deletedMessages.size;

            // Log to database
            const modLog = new ModerationLog({
                userId: target ? target.id : 'N/A',
                moderatorId: interaction.user.id,
                action: 'clear',
                reason: target ? `Cleared ${deletedCount} messages from ${target.tag}` : `Cleared ${deletedCount} messages`,
                additionalInfo: { 
                    messageCount: deletedCount,
                    channelId: interaction.channel.id,
                    targetUser: target ? target.tag : null,
                    oldMessagesSkipped: oldMessages.size
                }
            });
            await modLog.save();

            // Success embed
            const successEmbed = EmbedTemplates.createEmbed({
                title: '✅ Messages Cleared',
                description: `Successfully cleared **${deletedCount}** message(s)${oldMessages.size > 0 ? `\n⚠️ ${oldMessages.size} message(s) were skipped (older than 14 days)` : ''}`,
                color: Colors.SUCCESS,
                fields: [
                    { name: '📍 Channel', value: `${interaction.channel}`, inline: true },
                    { name: '👮 Moderator', value: interaction.user.tag, inline: true },
                    { name: '🎯 Target User', value: target ? target.tag : 'All users', inline: true }
                ],
                footer: {
                    text: `Case ID: ${modLog.caseId} • Moderation Action`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                },
                timestamp: new Date()
            });

            await interaction.editReply({ embeds: [successEmbed] });

            // Log to log channel
            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (logChannel && logChannel.id !== interaction.channel.id) {
                    const logEmbed = EmbedTemplates.createEmbed({
                        title: '🧹 Messages Cleared',
                        description: `**${deletedCount}** message(s) were cleared by ${interaction.user}`,
                        color: Colors.WARNING,
                        fields: [
                            { name: '📍 Channel', value: `${interaction.channel}`, inline: true },
                            { name: '👮 Moderator', value: `${interaction.user.tag}`, inline: true },
                            { name: '🎯 Target User', value: target ? target.tag : 'All users', inline: true },
                            { name: '📊 Messages Cleared', value: `${deletedCount}`, inline: true }
                        ],
                        footer: {
                            text: `Case ID: ${modLog.caseId} • Messages Cleared`,
                            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                        },
                        timestamp: new Date()
                    });
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
        } catch (error) {
            console.error('Error clearing messages:', error);
            
            let errorMessage = 'An error occurred while clearing messages. Please try again.';
            
            // Handle specific Discord API errors
            if (error.code === 10008) {
                errorMessage = 'Unknown message - the message may have already been deleted.';
            } else if (error.code === 50013) {
                errorMessage = 'I don\'t have permission to delete messages in this channel.';
            } else if (error.code === 50034) {
                errorMessage = 'You can only bulk delete messages that are under 14 days old.';
            }
            
            const errorEmbed = EmbedTemplates.createEmbed({
                title: '❌ Error',
                description: errorMessage,
                color: Colors.ERROR
            });
            
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};
