const { Events } = require('discord.js');

// Channel name for user leave logs
const LEAVE_LOG_CHANNEL = 'user-leave-log';

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        // Try to find or create the log channel
        let logChannel = member.guild.channels.cache.find(
            ch => ch.name === LEAVE_LOG_CHANNEL && ch.type === 0 // 0 = GuildText
        );
        if (!logChannel) {
            try {
                logChannel = await member.guild.channels.create({
                    name: LEAVE_LOG_CHANNEL,
                    type: 0, // GuildText
                    reason: 'User leave log channel for member leaves',
                });
            } catch (err) {
                console.error('Failed to create leave log channel:', err);
                return;
            }
        }

        // Build the leave log embed (only display name) and ping the user
        const { EmbedBuilder } = require('discord.js');
        const leaveEmbed = new EmbedBuilder()
            .setTitle('Member Left')
            .setDescription(`${member} (**${member.user.displayName || member.user.username}**) has left the server.`)
            .setColor(0xED4245)
            .setTimestamp();
        try {
            await logChannel.send({ embeds: [leaveEmbed] });
        } catch (err) {
            console.error('Failed to send leave log message:', err);
        }

        // Delete welcome message if user left within 24 hours
        try {
            const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
            if (welcomeChannelId) {
                const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
                if (welcomeChannel) {
                    // Check if user joined less than 24 hours ago
                    const joinedAt = member.joinedAt || (member.user && member.user.joinedAt);
                    if (joinedAt && (Date.now() - new Date(joinedAt).getTime() < 24 * 60 * 60 * 1000)) {
                        // Fetch last 20 messages and find the welcome message
                        const messages = await welcomeChannel.messages.fetch({ limit: 20 });
                        const welcomeMsg = messages.find(msg => msg.mentions.users.has(member.id));
                        if (welcomeMsg) {
                            await welcomeMsg.delete().catch(() => {});
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Failed to delete welcome message:', err);
        }
    }
};
