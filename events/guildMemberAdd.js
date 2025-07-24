const { Events, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { EmbedTemplates, Colors } = require('../utils/EmbedTemplates');

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

            // Use the shared welcome embed template, but override for minimal style
            let welcomeEmbed = EmbedTemplates.welcome(member.user, member.guild)
                .setDescription(`Welcome to the club, **${member.user.username}**!`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .setFields([]) // Remove extra fields for minimalism
                .setImage(null); // Remove banner image for minimalism

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
