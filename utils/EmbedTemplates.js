const { EmbedBuilder } = require('discord.js');

// Discord's official color palette
const Colors = {
    // Brand colors
    BLURPLE: 0x5865F2,
    GREEN: 0x57F287,
    YELLOW: 0xFEE75C,
    FUCHSIA: 0xEB459E,
    RED: 0xED4245,
    
    // Status colors
    SUCCESS: 0x00D166,
    WARNING: 0xFFAA00,
    ERROR: 0xFF4757,
    INFO: 0x3742FA,
    
    // Neutral colors
    DARK: 0x2F3136,
    LIGHT: 0x99AAB5,
    WHITE: 0xFFFFFF,
    
    // Custom theme colors
    VOICE_XP: 0x9B59B6,
    MODERATION: 0xE74C3C,
    FUN: 0xF39C12,
    MUSIC: 0x1DB954
};

class EmbedTemplates {
    // Command success template
    static success(title, description, user) {
        return new EmbedBuilder()
            .setColor(Colors.SUCCESS)
            .setTitle(`✅ ${title}`)
            .setDescription(description)
            .setFooter({
                text: `Action completed • ${user.tag}`,
                iconURL: user.displayAvatarURL()
            })
            .setTimestamp();
    }
    
    // Command error template
    static error(title, description, user) {
        return new EmbedBuilder()
            .setColor(Colors.ERROR)
            .setTitle(`❌ ${title}`)
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
            .setColor(Colors.INFO)
            .setTitle(`ℹ️ ${title}`)
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
            .setColor(Colors.BLURPLE)
            .setAuthor({
                name: `${user.tag}`,
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
                name: `🎤 ${user.username}'s Voice Stats`,
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
            mute: Colors.YELLOW,
            warn: Colors.YELLOW,
            unmute: Colors.SUCCESS
        };
        
        const actionEmojis = {
            ban: '🔨',
            kick: '👢',
            mute: '🔇',
            warn: '⚠️',
            unmute: '🔊'
        };
        
        return new EmbedBuilder()
            .setColor(actionColors[action] || Colors.MODERATION)
            .setTitle(`${actionEmojis[action]} ${action.charAt(0).toUpperCase() + action.slice(1)} Action`)
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
            xp: { emoji: '🎤', color: Colors.VOICE_XP },
            time: { emoji: '⏱️', color: Colors.INFO },
            level: { emoji: '🌟', color: Colors.YELLOW },
            streak: { emoji: '🔥', color: Colors.ERROR }
        };
        
        const data = typeData[type] || { emoji: '📊', color: Colors.BLURPLE };
        
        return new EmbedBuilder()
            .setColor(data.color)
            .setTitle(`${data.emoji} ${type.charAt(0).toUpperCase() + type.slice(1)} Leaderboard`)
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
            .setTitle('🎉 Level Up!')
            .setDescription(`Congratulations ${user}! You've reached **Level ${level}**!`)
            .setThumbnail(user.displayAvatarURL({ size: 128 }))
            .setImage('https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif') // Optional celebration GIF
            .setFooter({
                text: `Keep chatting to level up more! • ${guild.name}`,
                iconURL: guild.iconURL()
            })
            .setTimestamp();
    }
    
    // Welcome message template
    static welcome(user, guild) {
        return new EmbedBuilder()
            .setColor(Colors.GREEN)
            .setTitle(`🎉 Welcome to ${guild.name}!`)
            .setDescription(`Hello ${user}! We're excited to have you join our community!`)
            .setThumbnail(user.displayAvatarURL())
            .setImage(guild.bannerURL({ size: 1024 })) // Server banner if available
            .addFields(
                { name: '👥 Member Count', value: `${guild.memberCount}`, inline: true },
                { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true }, // Spacer
                { 
                    name: '🎯 What to do next?', 
                    value: '• Read the rules\n• Introduce yourself\n• Join conversations\n• Have fun! 🎊', 
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
            .setColor(Colors.BLURPLE)
            .setTitle(`📊 ${title}`)
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
}

module.exports = { EmbedTemplates, Colors };
