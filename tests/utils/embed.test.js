const { EmbedBuilder } = require('discord.js');
const CleanEmbedBuilder = require('../../utils/CleanEmbedBuilder');

describe('CleanEmbedBuilder Tests', () => {
    let cleanEmbed;
    
    beforeEach(() => {
        cleanEmbed = new CleanEmbedBuilder();
    });
    
    test('should create a clean embed instance', () => {
        expect(cleanEmbed).toBeInstanceOf(CleanEmbedBuilder);
        expect(cleanEmbed).toBeInstanceOf(EmbedBuilder);
    });
    
    test('should have default blue color', () => {
        const embed = cleanEmbed.toJSON();
        expect(embed.color).toBe(0x0099ff); // Blue color
    });
    
    test('should allow setting custom colors', () => {
        cleanEmbed.setColor('#ff0000');
        const embed = cleanEmbed.toJSON();
        expect(embed.color).toBe(0xff0000); // Red color
    });
    
    test('should handle title and description', () => {
        cleanEmbed
            .setTitle('Test Title')
            .setDescription('Test Description');
            
        const embed = cleanEmbed.toJSON();
        expect(embed.title).toBe('Test Title');
        expect(embed.description).toBe('Test Description');
    });
    
    test('should handle fields correctly', () => {
        cleanEmbed
            .addFields(
                { name: 'Field 1', value: 'Value 1', inline: true },
                { name: 'Field 2', value: 'Value 2', inline: false }
            );
            
        const embed = cleanEmbed.toJSON();
        expect(embed.fields).toHaveLength(2);
        expect(embed.fields[0].name).toBe('Field 1');
        expect(embed.fields[0].inline).toBe(true);
        expect(embed.fields[1].inline).toBe(false);
    });
    
    test('should handle footer', () => {
        cleanEmbed.setFooter({ text: 'Test Footer' });
        
        const embed = cleanEmbed.toJSON();
        expect(embed.footer.text).toBe('Test Footer');
    });
    
    test('should handle timestamp', () => {
        const now = new Date();
        cleanEmbed.setTimestamp(now);
        
        const embed = cleanEmbed.toJSON();
        expect(embed.timestamp).toBe(now.toISOString());
    });
    
    test('should handle author', () => {
        cleanEmbed.setAuthor({ 
            name: 'Test Author', 
            iconURL: 'https://example.com/icon.png' 
        });
        
        const embed = cleanEmbed.toJSON();
        expect(embed.author.name).toBe('Test Author');
        expect(embed.author.icon_url).toBe('https://example.com/icon.png');
    });
    
    test('should handle thumbnail', () => {
        cleanEmbed.setThumbnail('https://example.com/thumb.png');
        
        const embed = cleanEmbed.toJSON();
        expect(embed.thumbnail.url).toBe('https://example.com/thumb.png');
    });
    
    test('should handle image', () => {
        cleanEmbed.setImage('https://example.com/image.png');
        
        const embed = cleanEmbed.toJSON();
        expect(embed.image.url).toBe('https://example.com/image.png');
    });
    
    test('should validate embed structure', () => {
        const embed = cleanEmbed
            .setTitle('Valid Embed')
            .setDescription('This is a valid embed')
            .toJSON();
            
        expect(embed).toBeValidDiscordEmbed();
    });
    
    test('should respect Discord embed limits', () => {
        const longTitle = 'A'.repeat(300); // Exceeds 256 char limit
        const longDescription = 'B'.repeat(5000); // Exceeds 4096 char limit
        
        cleanEmbed
            .setTitle(longTitle)
            .setDescription(longDescription);
            
        const embed = cleanEmbed.toJSON();
        
        // Title should be truncated
        expect(embed.title.length).toBeLessThanOrEqual(256);
        
        // Description should be truncated
        expect(embed.description.length).toBeLessThanOrEqual(4096);
    });
    
    test('should handle multiple field additions', () => {
        cleanEmbed.addFields({ name: 'Field 1', value: 'Value 1' });
        cleanEmbed.addFields({ name: 'Field 2', value: 'Value 2' });
        cleanEmbed.addFields({ name: 'Field 3', value: 'Value 3' });
        
        const embed = cleanEmbed.toJSON();
        expect(embed.fields).toHaveLength(3);
    });
});
