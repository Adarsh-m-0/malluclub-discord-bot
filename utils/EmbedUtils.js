const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Colors } = require('./EmbedTemplates');

class EmbedUtils {
    // Create paginated embeds
    static createPaginatedEmbed(data, itemsPerPage = 10, title = 'Results') {
        const pages = [];
        const totalPages = Math.ceil(data.length / itemsPerPage);
        
        for (let i = 0; i < totalPages; i++) {
            const start = i * itemsPerPage;
            const end = start + itemsPerPage;
            const pageData = data.slice(start, end);
            
            const embed = new EmbedBuilder()
                .setColor(Colors.BLURPLE)
                .setTitle(`${title} (Page ${i + 1}/${totalPages})`)
                .setFooter({ text: `Showing ${start + 1}-${Math.min(end, data.length)} of ${data.length} results` })
                .setTimestamp();
            
            pages.push({ embed, data: pageData });
        }
        
        return pages;
    }
    
    // Create navigation buttons for paginated embeds
    static createPaginationButtons(currentPage, totalPages, disabled = false) {
        const row = new ActionRowBuilder();
        
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('first_page')
                .setLabel('⏮️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || currentPage === 0),
            
            new ButtonBuilder()
                .setCustomId('prev_page')
                .setLabel('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || currentPage === 0),
            
            new ButtonBuilder()
                .setCustomId('page_indicator')
                .setLabel(`${currentPage + 1}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            
            new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || currentPage === totalPages - 1),
            
            new ButtonBuilder()
                .setCustomId('last_page')
                .setLabel('⏭️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || currentPage === totalPages - 1)
        );
        
        return row;
    }
    
    // Format time duration nicely
    static formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
    
    // Format numbers with appropriate suffixes
    static formatNumber(num) {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    }
    
    // Create progress bar for XP/levels
    static createProgressBar(current, max, length = 10, filled = '█', empty = '░') {
        const percentage = Math.min(current / max, 1);
        const filledLength = Math.round(length * percentage);
        const emptyLength = length - filledLength;
        
        const bar = filled.repeat(filledLength) + empty.repeat(emptyLength);
        return `${bar} ${Math.round(percentage * 100)}%`;
    }
    
    // Create user mention link
    static userMention(userId) {
        return `<@${userId}>`;
    }
    
    // Create role mention link
    static roleMention(roleId) {
        return `<@&${roleId}>`;
    }
    
    // Create channel mention link
    static channelMention(channelId) {
        return `<#${channelId}>`;
    }
    
    // Format timestamp for Discord
    static timestamp(date, style = 'R') {
        const timestamp = Math.floor(date.getTime() / 1000);
        return `<t:${timestamp}:${style}>`;
    }
    
    // Create field with proper formatting
    static createField(name, value, inline = false) {
        return {
            name: String(name).substring(0, 256),
            value: String(value).substring(0, 1024) || '\u200B',
            inline
        };
    }
    
    // Create embed description with proper length
    static createDescription(text, maxLength = 4096) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    
    // Create confirmation embed with buttons
    static createConfirmation(title, description, user) {
        const embed = new EmbedBuilder()
            .setColor(Colors.WARNING)
            .setTitle(`⚠️ ${title}`)
            .setDescription(description)
            .setFooter({
                text: `Requested by ${user.tag}`,
                iconURL: user.displayAvatarURL()
            })
            .setTimestamp();
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_yes')
                    .setLabel('✅ Confirm')
                    .setStyle(ButtonStyle.Success),
                
                new ButtonBuilder()
                    .setCustomId('confirm_no')
                    .setLabel('❌ Cancel')
                    .setStyle(ButtonStyle.Danger)
            );
        
        return { embed, row };
    }
    
    // Create loading embed
    static createLoading(title = 'Loading...', description = 'Please wait while we process your request.') {
        return new EmbedBuilder()
            .setColor(Colors.INFO)
            .setTitle(`⏳ ${title}`)
            .setDescription(description)
            .setTimestamp();
    }
    
    // Create error embed with retry button
    static createRetryableError(title, description, user) {
        const embed = new EmbedBuilder()
            .setColor(Colors.ERROR)
            .setTitle(`❌ ${title}`)
            .setDescription(description)
            .setFooter({
                text: `Error for ${user.tag}`,
                iconURL: user.displayAvatarURL()
            })
            .setTimestamp();
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('retry_action')
                    .setLabel('🔄 Retry')
                    .setStyle(ButtonStyle.Primary)
            );
        
        return { embed, row };
    }
    
    // Create tabbed embed interface
    static createTabbedEmbed(tabs, activeTab = 0) {
        const embed = tabs[activeTab].embed;
        
        const row = new ActionRowBuilder();
        tabs.forEach((tab, index) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`tab_${index}`)
                    .setLabel(tab.label)
                    .setEmoji(tab.emoji || null)
                    .setStyle(index === activeTab ? ButtonStyle.Primary : ButtonStyle.Secondary)
            );
        });
        
        return { embed, row };
    }
}

module.exports = { EmbedUtils };
