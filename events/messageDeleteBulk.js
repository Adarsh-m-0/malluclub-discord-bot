const { Events } = require('discord.js');
const ModerationLog = require('../models/ModerationLog');
const { EmbedTemplates, Colors } = require('../utils/EmbedTemplates');

module.exports = {
    name: Events.MessageBulkDelete,
    async execute(messages) {
        try {
            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const firstMessage = messages.first();
                if (!firstMessage) return;
                
                const logChannel = firstMessage.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    // Filter out bot messages and messages with null authors for logging
                    const userMessages = messages.filter(msg => msg.author && !msg.author.bot);
                    
                    if (userMessages.size === 0) return; // No user messages to log
                    
                    // Create moderation log entry for bulk deletion
                    const logEntry = new ModerationLog({
                        userId: 'BULK_DELETE',
                        moderatorId: 'SYSTEM',
                        action: 'message_delete',
                        reason: `Bulk message deletion - ${userMessages.size} messages`,
                        additionalInfo: {
                            channelId: firstMessage.channel.id,
                            channelName: firstMessage.channel.name,
                            messageCount: userMessages.size,
                            totalCount: messages.size,
                            userIds: [...new Set(userMessages.map(msg => msg.author?.id || 'UNKNOWN_USER'))],
                            isBulkDelete: true
                        }
                    });
                    
                    await logEntry.save();
                    
                    // Create embed for log channel
                    const logEmbed = EmbedTemplates.createEmbed({
                        title: 'Bulk Message Deletion',
                        description: `${userMessages.size} messages were bulk deleted in ${firstMessage.channel}`,
                        color: Colors.WARNING,
                        fields: [
                            { name: 'Channel', value: `${firstMessage.channel.name}`, inline: true },
                            { name: 'User Messages', value: `${userMessages.size}`, inline: true },
                            { name: 'Total Messages', value: `${messages.size}`, inline: true }
                        ],
                        footer: {
                            text: `Bulk Deletion • Case ID: ${logEntry.caseId}`,
                            iconURL: firstMessage.guild.iconURL({ size: 16 })
                        },
                        timestamp: new Date()
                    });
                    
                    // Add affected users info
                    const affectedUsers = [...new Set(userMessages.map(msg => msg.author?.username || 'Unknown User'))];
                    if (affectedUsers.length > 0) {
                        const userList = affectedUsers.length > 10 
                            ? affectedUsers.slice(0, 10).join(', ') + ` and ${affectedUsers.length - 10} more...`
                            : affectedUsers.join(', ');
                        logEmbed.addFields({ name: 'Affected Users', value: userList, inline: false });
                    }
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
        } catch (error) {
            console.error('Error in messageDeleteBulk event:', error);
        }
    },
};
