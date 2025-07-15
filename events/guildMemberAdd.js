const { Events, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { Colors } = require('../utils/EmbedTemplates');

// Debounce map to prevent duplicate welcome messages
const welcomeDebounce = new Map();

// Helper function to get ordinal numbers (1st, 2nd, 3rd, etc.)
function getOrdinalNumber(num) {
    const ones = num % 10;
    const tens = Math.floor(num / 10) % 10;
    
    if (tens === 1) {
        return `${num}th`;
    }
    
    switch (ones) {
        case 1: return `${num}st`;
        case 2: return `${num}nd`;
        case 3: return `${num}rd`;
        default: return `${num}th`;
    }
}

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            // Create debounce key for this member
            const debounceKey = `${member.id}_${member.guild.id}`;
            const now = Date.now();
            
            // Check if we've already sent a welcome message for this member recently (within 5 seconds)
            const lastWelcomeTime = welcomeDebounce.get(debounceKey);
            if (lastWelcomeTime && (now - lastWelcomeTime) < 5000) {
                logger.info(`Skipping duplicate welcome message for ${member.user.tag}`, {
                    category: 'welcome',
                    user: member.user.id,
                    guild: member.guild.id,
                    reason: 'debounce'
                });
                return;
            }
            
            // Update debounce map
            welcomeDebounce.set(debounceKey, now);
            
            // Clean up old entries from debounce map (older than 30 seconds)
            for (const [key, time] of welcomeDebounce.entries()) {
                if (now - time > 30000) {
                    welcomeDebounce.delete(key);
                }
            }
            
            // Get welcome channel ID from environment variables
            const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
            
            if (!welcomeChannelId) {
                logger.warn('WELCOME_CHANNEL_ID not set in environment variables', {
                    category: 'welcome',
                    guild: member.guild.id
                });
                return;
            }

            // Get the welcome channel
            const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
            
            if (!welcomeChannel) {
                logger.warn(`Welcome channel not found: ${welcomeChannelId}`, {
                    category: 'welcome',
                    guild: member.guild.id
                });
                return;
            }

            // Create modern welcome embed with clean styling
            const welcomeEmbed = new EmbedBuilder()
                .setAuthor({
                    name: `Welcome to ${member.guild.name}!`,
                    iconURL: member.guild.iconURL({ dynamic: true })
                })
                .setTitle(`👋 Hey ${member.user.username}!`)
                .setDescription(`**Welcome to our community!**\n\nWe're excited to have you here. Feel free to explore, make friends, and join the conversation!\n\n\`\`\`\nYou are our ${getOrdinalNumber(member.guild.memberCount)} member!\nCheck out the channels and start chatting\nHave fun and enjoy your stay!\`\`\``)
                .setColor(Colors.PRIMARY)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    {
                        name: '📊 Server Stats',
                        value: `\`\`\`yaml\nMembers: ${member.guild.memberCount}\nChannels: ${member.guild.channels.cache.size}\`\`\``,
                        inline: true
                    },
                    {
                        name: '🎯 Quick Start',
                        value: `\`\`\`\nRead the rules\nIntroduce yourself\nJoin voice channels\nEarn XP by chatting\`\`\``,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `Member #${member.guild.memberCount} • ${member.guild.name}`,
                    iconURL: member.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();

            // Send welcome message
            await welcomeChannel.send({ 
                content: `${member}`, // Ping the user
                embeds: [welcomeEmbed] 
            });

            logger.info(`Welcome message sent for ${member.user.tag}`, {
                category: 'welcome',
                user: member.user.id,
                guild: member.guild.id
            });

        } catch (error) {
            logger.logError(error, {
                category: 'welcome',
                context: 'Failed to send welcome message',
                user: member.user.id,
                guild: member.guild.id
            });
        }
    }
};
