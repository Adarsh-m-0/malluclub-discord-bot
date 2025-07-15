const { Events } = require('discord.js');
const { EmbedTemplates, Colors } = require('../utils/EmbedTemplates');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        if (newMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;
        
        try {
            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = newMessage.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = EmbedTemplates.createEmbed({
                        title: 'Message Edited',
                        description: `A message was edited in ${newMessage.channel}`,
                        color: Colors.WARNING,
                        fields: [
                            { name: 'Author', value: `${newMessage.author.username}`, inline: true },
                            { name: 'Channel', value: `${newMessage.channel.name}`, inline: true },
                            { name: 'Before', value: oldMessage.content || 'No content', inline: false },
                            { name: 'After', value: newMessage.content || 'No content', inline: false },
                            { name: 'Jump to Message', value: `[Click here](${newMessage.url})`, inline: false }
                        ],
                        footer: { 
                            text: 'Message Edited',
                            iconURL: newMessage.author.displayAvatarURL({ size: 16 })
                        },
                        timestamp: new Date()
                    });
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
        } catch (error) {
            console.error('Error in messageUpdate event:', error);
        }
    },
};
