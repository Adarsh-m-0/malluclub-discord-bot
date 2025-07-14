/**
 * Utility functions for the Mallu Club Bot
 */

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config/config');

class Utils {
    /**
     * Create a standard embed with default styling
     */
    static createEmbed(options = {}) {
        const embed = new EmbedBuilder()
            .setColor(options.color || config.embeds.colors.primary)
            .setTimestamp();
        
        if (options.title) embed.setTitle(options.title);
        if (options.description) embed.setDescription(options.description);
        if (options.footer) embed.setFooter(options.footer);
        if (options.thumbnail) embed.setThumbnail(options.thumbnail);
        if (options.image) embed.setImage(options.image);
        if (options.fields) embed.addFields(options.fields);
        if (options.author) embed.setAuthor(options.author);
        
        return embed;
    }
    
    /**
     * Create a success embed
     */
    static createSuccessEmbed(title, description) {
        return this.createEmbed({
            color: config.embeds.colors.success,
            title: `✅ ${title}`,
            description
        });
    }
    
    /**
     * Create an error embed
     */
    static createErrorEmbed(title, description) {
        return this.createEmbed({
            color: config.embeds.colors.error,
            title: `❌ ${title}`,
            description
        });
    }
    
    /**
     * Create a warning embed
     */
    static createWarningEmbed(title, description) {
        return this.createEmbed({
            color: config.embeds.colors.warning,
            title: `⚠️ ${title}`,
            description
        });
    }
    
    /**
     * Parse duration string to milliseconds
     */
    static parseDuration(duration) {
        const regex = /^(\d+)([smhd])$/;
        const match = duration.match(regex);
        
        if (!match) return null;
        
        const value = parseInt(match[1]);
        const unit = match[2];
        
        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return null;
        }
    }
    
    /**
     * Format duration from milliseconds to human readable
     */
    static formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
    
    /**
     * Check if user has permission
     */
    static hasPermission(member, permission) {
        return member.permissions.has(permission);
    }
    
    /**
     * Check if user can moderate another user
     */
    static canModerate(moderator, target) {
        if (moderator.id === target.id) return false;
        if (target.roles.highest.position >= moderator.roles.highest.position) return false;
        return true;
    }
    
    /**
     * Get user's highest role color
     */
    static getUserColor(member) {
        return member.displayHexColor || config.embeds.colors.primary;
    }
    
    /**
     * Truncate text to specified length
     */
    static truncateText(text, length = 100) {
        if (text.length <= length) return text;
        return text.substring(0, length - 3) + '...';
    }
    
    /**
     * Escape markdown characters
     */
    static escapeMarkdown(text) {
        return text.replace(/[*_`~\\]/g, '\\$&');
    }
    
    /**
     * Get random item from array
     */
    static getRandomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    /**
     * Check if string is a valid Discord ID
     */
    static isValidDiscordId(id) {
        return /^\d{17,19}$/.test(id);
    }
    
    /**
     * Format number with commas
     */
    static formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    /**
     * Get time ago string
     */
    static getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
    }
    
    /**
     * Log to console with timestamp
     */
    static log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        const colors = {
            INFO: '\x1b[36m',
            SUCCESS: '\x1b[32m',
            WARNING: '\x1b[33m',
            ERROR: '\x1b[31m',
            RESET: '\x1b[0m'
        };
        
        console.log(`${colors[type]}[${timestamp}] ${type}: ${message}${colors.RESET}`);
    }
    
    /**
     * Send log to log channel
     */
    static async sendLog(client, embed) {
        const logChannelId = config.channels.logs;
        if (!logChannelId) return;
        
        const logChannel = client.channels.cache.get(logChannelId);
        if (!logChannel) return;
        
        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error sending log:', error);
        }
    }
    
    /**
     * Validate environment variables
     */
    static validateEnvironment() {
        const required = ['DISCORD_TOKEN', 'CLIENT_ID'];
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
        
        return true;
    }
}

module.exports = Utils;
