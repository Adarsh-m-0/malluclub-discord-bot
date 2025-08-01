const { Events } = require('discord.js');
const ModerationLog = require('../models/ModerationLog');
const { EmbedTemplates, Colors } = require('../utils/EmbedTemplates');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        // Skip if message author is bot (if author is available)
        if (message.author?.bot) return;
        
        try {
            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = message.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    // Handle case where author might be null (uncached message)
                    let authorId = message.author?.id || 'UNKNOWN_USER';
                    let authorName = message.author?.username || 'Unknown User';
                    
                    // Try to fetch user information if author is null but we have a user ID from webhook or other sources
                    if (!message.author && message.webhookId) {
                        authorName = 'Webhook';
                        authorId = message.webhookId;
                    } else if (!message.author) {
                        // Skip logging if we can't identify the author and it's not a meaningful deletion
                        // This helps reduce "Unknown User" spam from system messages, embeds, etc.
                        if (!message.content && message.attachments.size === 0 && message.embeds.length === 0) {
                            return;
                        }
                        authorName = 'Unknown User (Uncached)';
                    }
                    
                    // Create moderation log entry
                    const logEntry = new ModerationLog({
                        userId: authorId,
                        moderatorId: 'SYSTEM', // System deleted or user deleted
                        action: 'message_delete',
                        reason: 'Message deleted',
                        additionalInfo: {
                            channelId: message.channel.id,
                            channelName: message.channel.name,
                            messageContent: message.content || 'No content (possibly an embed or attachment)',
                            messageId: message.id,
                            attachments: message.attachments.size > 0 ? message.attachments.map(att => att.name) : [],
                            embeds: message.embeds.length > 0 ? message.embeds.length : 0,
                            authorWasNull: !message.author,
                            wasWebhook: !!message.webhookId
                        }
                    });
                    
                    await logEntry.save();
                    
                    // Create embed for log channel
                    const logEmbed = EmbedTemplates.createEmbed({
                        title: 'Message Deleted',
                        description: `A message was deleted in ${message.channel}`,
                        color: Colors.WARNING,
                        fields: [
                            { name: 'Author', value: authorName, inline: true },
                            { name: 'Channel', value: `${message.channel.name}`, inline: true },
                            { name: 'Content', value: message.content || 'No content (possibly an embed or attachment)', inline: false }
                        ],
                        footer: {
                            text: `Message Deleted • Case ID: ${logEntry.caseId}`,
                            iconURL: message.author?.displayAvatarURL({ size: 16 }) || null
                        },
                        timestamp: new Date()
                    });
                    
                    // Add additional info if author was unknown
                    if (!message.author) {
                        logEmbed.addFields({ 
                            name: 'ℹ️ Note', 
                            value: 'Author information unavailable (message was not cached)', 
                            inline: false 
                        });
                    }
                    
                    // Add attachment info if present
                    if (message.attachments.size > 0) {
                        const attachmentNames = message.attachments.map(att => att.name).join(', ');
                        logEmbed.addFields({ name: 'Attachments', value: attachmentNames, inline: false });
                    }
                    
                    // Add embed count if present
                    if (message.embeds.length > 0) {
                        logEmbed.addFields({ name: 'Embeds', value: `${message.embeds.length} embed(s)`, inline: true });
                    }
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
        } catch (error) {
            console.error('Error in messageDelete event:', error);
        }
    },
};
