const { Events, EmbedBuilder } = require('discord.js');

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
                    const logEmbed = new EmbedBuilder()
                        .setColor('#ffff00')
                        .setTitle('✏️ Message Edited')
                        .setDescription(`A message was edited in ${newMessage.channel}`)
                        .addFields(
                            { name: 'Author', value: `${newMessage.author}`, inline: true },
                            { name: 'Channel', value: `${newMessage.channel}`, inline: true },
                            { name: 'Before', value: oldMessage.content || 'No content', inline: false },
                            { name: 'After', value: newMessage.content || 'No content', inline: false },
                            { name: 'Jump to Message', value: `[Click here](${newMessage.url})`, inline: false }
                        )
                        .setFooter({ text: 'Message Edited' })
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
        } catch (error) {
            console.error('Error in messageUpdate event:', error);
        }
    },
};
