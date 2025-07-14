const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        if (message.author?.bot) return;
        
        try {
            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = message.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#ff6600')
                        .setTitle('🗑️ Message Deleted')
                        .setDescription(`A message was deleted in ${message.channel}`)
                        .addFields(
                            { name: 'Author', value: `${message.author}`, inline: true },
                            { name: 'Channel', value: `${message.channel}`, inline: true },
                            { name: 'Content', value: message.content || 'No content (possibly an embed or attachment)', inline: false }
                        )
                        .setFooter({ text: 'Message Deleted' })
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
        } catch (error) {
            console.error('Error in messageDelete event:', error);
        }
    },
};
