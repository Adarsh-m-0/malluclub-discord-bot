const { EmbedBuilder } = require('discord.js');

class CleanEmbedBuilder extends EmbedBuilder {
    constructor(options = {}) {
        super();
        
        // Default clean styling
        this.setColor(options.color || 0x5865F2); // Discord Blurple
        
        if (options.timestamp !== false) {
            this.setTimestamp();
        }
    }
    
    // Success embed (green)
    success(title, description) {
        this.setColor(0x00D166);
        this.setTitle(`✅ ${title}`);
        if (description) this.setDescription(description);
        return this;
    }
    
    // Error embed (red)
    error(title, description) {
        this.setColor(0xED4245);
        this.setTitle(`❌ ${title}`);
        if (description) this.setDescription(description);
        return this;
    }
    
    // Warning embed (yellow)
    warning(title, description) {
        this.setColor(0xFEE75C);
        this.setTitle(`⚠️ ${title}`);
        if (description) this.setDescription(description);
        return this;
    }
    
    // Info embed (blue)
    info(title, description) {
        this.setColor(0x5865F2);
        this.setTitle(`ℹ️ ${title}`);
        if (description) this.setDescription(description);
        return this;
    }
    
    // Loading embed (gray)
    loading(title, description) {
        this.setColor(0x99AAB5);
        this.setTitle(`⏳ ${title}`);
        if (description) this.setDescription(description);
        return this;
    }
    
    // Add stats in a clean format
    addStats(stats) {
        const statFields = Object.entries(stats).map(([key, value]) => {
            return { name: key, value: String(value), inline: true };
        });
        this.addFields(...statFields);
        return this;
    }
    
    // Add user footer
    addUserFooter(user, text = '') {
        this.setFooter({
            text: `${text} ${text ? '•' : ''} Requested by ${user.tag}`,
            iconURL: user.displayAvatarURL()
        });
        return this;
    }
    
    // Add server footer
    addServerFooter(guild, text = '') {
        this.setFooter({
            text: `${text} ${text ? '•' : ''} ${guild.name}`,
            iconURL: guild.iconURL()
        });
        return this;
    }
    
    // Professional divider
    addDivider() {
        this.addFields({ name: '\u200B', value: '\u200B', inline: false });
        return this;
    }
    
    // Clean field with proper spacing
    addCleanField(name, value, inline = false) {
        this.addFields({
            name: `**${name}**`,
            value: String(value),
            inline
        });
        return this;
    }
    
    // Progress bar
    addProgressBar(name, current, max, length = 10) {
        const percentage = Math.round((current / max) * 100);
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        const bar = `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
        
        this.addFields({
            name: `**${name}**`,
            value: `${bar} ${percentage}% (${current}/${max})`,
            inline: false
        });
        return this;
    }
}

module.exports = CleanEmbedBuilder;
