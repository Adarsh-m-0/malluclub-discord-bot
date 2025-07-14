const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency and API response time'),
    
    async execute(interaction) {
        const sent = await interaction.reply({ 
            content: '🏓 Pinging...', 
            fetchReply: true 
        });
        
        const roundTripLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const wsLatency = interaction.client.ws.ping;
        
        const pingEmbed = new EmbedBuilder()
            .setColor(0x00FF00) // Green for good performance
            .setAuthor({ 
                name: '🏓 Bot Latency Check', 
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setDescription('📊 **Performance Metrics**')
            .addFields(
                { 
                    name: '📡 Roundtrip Latency', 
                    value: `\`${roundTripLatency}ms\``, 
                    inline: true 
                },
                { 
                    name: '💓 WebSocket Heartbeat', 
                    value: `\`${wsLatency}ms\``, 
                    inline: true 
                },
                { 
                    name: '🌐 Connection Status', 
                    value: getLatencyStatus(roundTripLatency), 
                    inline: true 
                },
                {
                    name: '⏰ Response Time',
                    value: `Message processed in \`${roundTripLatency}ms\``,
                    inline: false
                }
            )
            .setFooter({ 
                text: `Requested by ${interaction.user.tag} • MalluClub Bot`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();
        
        await interaction.editReply({ 
            content: '', 
            embeds: [pingEmbed] 
        });
    },
};

function getLatencyStatus(latency) {
    if (latency < 100) return '🟢 Excellent';
    if (latency < 200) return '🟡 Good';
    if (latency < 500) return '🟠 Fair';
    return '🔴 Poor';
}
