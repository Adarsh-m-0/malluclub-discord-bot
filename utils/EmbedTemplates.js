const { EmbedBuilder } = require('discord.js');

// Discord's official color palette - Updated for purple theme
const Colors = {
    // Primary purple theme
    PRIMARY: 0x7B68EE,
    PURPLE: 0x9B59B6,
    DARK_PURPLE: 0x663399,
    LIGHT_PURPLE: 0xB19CD9,
    
    // Status colors
    SUCCESS: 0x57F287,
    WARNING: 0xFFAA00,
    ERROR: 0xFF4757,
    INFO: 0x7B68EE,
    
    // Neutral colors
    DARK: 0x2F3136,
    LIGHT: 0x99AAB5,
    WHITE: 0xFFFFFF,
    
    // Feature colors
    VOICE_XP: 0x9B59B6,
    MODERATION: 0x7B68EE,
    UTILITY: 0x8A7CA8
};

class EmbedTemplates {
    // Command success template
    static success(title, description, user) {
        return new EmbedBuilder()
            .setColor(Colors.SUCCESS)
            .setTitle(title)
            .setDescription(description)
            .setFooter({
                text: `Action completed by ${user.tag}`,
                iconURL: user.displayAvatarURL()
            })
            .setTimestamp();
    }
    
    // Command error template
    static error(title, description, user) {
        return new EmbedBuilder()
            .setColor(Colors.ERROR)
            .setTitle(title)
            .setDescription(description)
            .setFooter({
                text: `Error occurred • ${user.tag}`,
                iconURL: user.displayAvatarURL()
            })
            .setTimestamp();
    }
    
    // Information display template
    static info(title, description, guild) {
        return new EmbedBuilder()
            .setColor(Colors.PRIMARY)
            .setTitle(title)
            .setDescription(description)
            .setThumbnail(guild?.iconURL() || null)
            .setFooter({
                text: guild?.name || 'Information',
                iconURL: guild?.iconURL() || null
            })
            .setTimestamp();
    }
    
    // User profile template
    static userProfile(user, guild) {
        return new EmbedBuilder()
            .setColor(Colors.PRIMARY)
            .setAuthor({
                name: user.tag,
                iconURL: user.displayAvatarURL()
            })
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .setFooter({
                text: `Member of ${guild.name}`,
                iconURL: guild.iconURL()
            })
            .setTimestamp();
    }
    
    // Voice XP template
    static voiceXP(user, guild) {
        return new EmbedBuilder()
            .setColor(Colors.VOICE_XP)
            .setAuthor({
                name: `${user.username}'s Voice Stats`,
                iconURL: user.displayAvatarURL()
            })
            .setThumbnail(user.displayAvatarURL())
            .setFooter({
                text: `${guild.name} Voice XP System`,
                iconURL: guild.iconURL()
            })
            .setTimestamp();
    }
    
    // Moderation action template
    static moderation(action, target, moderator, guild) {
        const actionColors = {
            ban: Colors.ERROR,
            kick: Colors.WARNING,
            mute: Colors.MODERATION,
            warn: Colors.WARNING,
            unmute: Colors.SUCCESS,
            clear: Colors.PRIMARY
        };
        
        return new EmbedBuilder()
            .setColor(actionColors[action] || Colors.MODERATION)
            .setTitle(`${action.charAt(0).toUpperCase() + action.slice(1)} Action`)
            .setThumbnail(target.displayAvatarURL())
            .setFooter({
                text: `Moderated by ${moderator.tag} • ${guild.name}`,
                iconURL: moderator.displayAvatarURL()
            })
            .setTimestamp();
    }
    
    // Leaderboard template
    static leaderboard(type, guild) {
        const typeData = {
            xp: { color: Colors.VOICE_XP },
            time: { color: Colors.PRIMARY },
            level: { color: Colors.PURPLE },
            streak: { color: Colors.LIGHT_PURPLE }
        };
        
        const data = typeData[type] || { color: Colors.PRIMARY };
        
        return new EmbedBuilder()
            .setColor(data.color)
            .setTitle(`${type.charAt(0).toUpperCase() + type.slice(1)} Leaderboard`)
            .setThumbnail(guild.iconURL())
            .setFooter({
                text: `${guild.name} Leaderboard`,
                iconURL: guild.iconURL()
            })
            .setTimestamp();
    }
    
    // Level up celebration template
    static levelUp(user, level, guild) {
        return new EmbedBuilder()
            .setColor(Colors.SUCCESS)
            .setTitle('Level Up!')
            .setDescription(`Congratulations ${user}! You've reached **Level ${level}**!`)
            .setThumbnail(user.displayAvatarURL({ size: 128 }))
            .setFooter({
                text: `Keep chatting to level up more! • ${guild.name}`,
                iconURL: guild.iconURL()
            })
            .setTimestamp();
    }
    
    // Welcome message template
    static welcome(user, guild) {
        return new EmbedBuilder()
            .setColor(Colors.PRIMARY)
            .setTitle(`Welcome to ${guild.name}!`)
            .setDescription(`Hello ${user}! We're excited to have you join our community!`)
            .setThumbnail(user.displayAvatarURL())
            .setImage(guild.bannerURL({ size: 1024 }))
            .addFields(
                { name: 'Member Count', value: `${guild.memberCount}`, inline: true },
                { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
                { 
                    name: 'What to do next?', 
                    value: '• Read the rules\n• Introduce yourself\n• Join conversations\n• Have fun!', 
                    inline: false 
                }
            )
            .setFooter({
                text: guild.name,
                iconURL: guild.iconURL()
            })
            .setTimestamp();
    }
    
    // Statistics template with clean layout
    static statistics(title, stats, guild, user) {
        const embed = new EmbedBuilder()
            .setColor(Colors.PRIMARY)
            .setTitle(`${title}`)
            .setThumbnail(guild?.iconURL() || null)
            .setTimestamp();
        
        // Add stats in a 3-column layout
        const statEntries = Object.entries(stats);
        for (let i = 0; i < statEntries.length; i += 3) {
            const chunk = statEntries.slice(i, i + 3);
            chunk.forEach(([key, value]) => {
                embed.addFields({
                    name: `**${key}**`,
                    value: String(value),
                    inline: true
                });
            });
            
            // Add spacer row if there are more stats
            if (i + 3 < statEntries.length) {
                embed.addFields({ name: '\u200B', value: '\u200B', inline: false });
            }
        }
        
        if (user) {
            embed.setFooter({
                text: `Requested by ${user.tag}`,
                iconURL: user.displayAvatarURL()
            });
        }
        
        return embed;
    }

    // Generic embed creator
    static createEmbed(options) {
        const embed = new EmbedBuilder();
        
        if (options.title) embed.setTitle(options.title);
        if (options.description) embed.setDescription(options.description);
        if (options.color) embed.setColor(options.color);
        if (options.thumbnail) embed.setThumbnail(options.thumbnail);
        if (options.image) embed.setImage(options.image);
        if (options.timestamp) embed.setTimestamp(options.timestamp);
        if (options.url) embed.setURL(options.url);
        if (options.author) embed.setAuthor(options.author);
        if (options.footer) embed.setFooter(options.footer);
        if (options.fields) embed.addFields(options.fields);
        
        return embed;
    }
}

module.exports = { EmbedTemplates, Colors };
