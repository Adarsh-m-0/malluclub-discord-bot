const { Collection } = require('discord.js');

describe('Help Command Tests', () => {
    let command;
    let interaction;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Setup fresh interaction mock
        interaction = {
            ...global.mockInteraction,
            reply: jest.fn().mockResolvedValue(undefined),
            options: {
                getString: jest.fn()
            }
        };
        
        // Mock client with commands
        interaction.client = {
            commands: new Collection(),
            user: { displayAvatarURL: jest.fn().mockReturnValue('https://example.com/avatar.png') }
        };
        
        // Add some test commands
        interaction.client.commands.set('ping', {
            data: { name: 'ping', description: 'Pong!' },
            category: 'info'
        });
        
        interaction.client.commands.set('ban', {
            data: { name: 'ban', description: 'Ban a user' },
            category: 'moderation'
        });
        
        // Load the actual command
        command = require('../../commands/info/help_enhanced');
    });
    
    test('should have correct command data', () => {
        expect(command.data).toBeDefined();
        expect(command.data.name).toBe('help');
        expect(command.data.description).toContain('Show help information');
        expect(command.execute).toBeDefined();
        expect(typeof command.execute).toBe('function');
    });
    
    test('should show general help when no command specified', async () => {
        interaction.options.getString.mockReturnValue(null);
        
        await command.execute(interaction);
        
        expect(interaction.reply).toHaveBeenCalledTimes(1);
        expect(interaction.reply).toHaveBeenCalledWith(
            expect.objectContaining({
                embeds: expect.arrayContaining([
                    expect.objectContaining({
                        title: expect.stringContaining('Help')
                    })
                ]),
                ephemeral: true
            })
        );
    });
    
    test('should show specific command help when command specified', async () => {
        interaction.options.getString.mockReturnValue('ping');
        
        await command.execute(interaction);
        
        expect(interaction.reply).toHaveBeenCalledTimes(1);
        expect(interaction.reply).toHaveBeenCalledWith(
            expect.objectContaining({
                embeds: expect.arrayContaining([
                    expect.objectContaining({
                        title: expect.stringContaining('ping')
                    })
                ]),
                ephemeral: true
            })
        );
    });
    
    test('should handle non-existent command gracefully', async () => {
        interaction.options.getString.mockReturnValue('nonexistent');
        
        await command.execute(interaction);
        
        expect(interaction.reply).toHaveBeenCalledTimes(1);
        expect(interaction.reply).toHaveBeenCalledWith(
            expect.objectContaining({
                content: expect.stringContaining('command not found'),
                ephemeral: true
            })
        );
    });
    
    test('should categorize commands correctly', async () => {
        interaction.options.getString.mockReturnValue(null);
        
        await command.execute(interaction);
        
        const replyCall = interaction.reply.mock.calls[0][0];
        const embed = replyCall.embeds[0];
        
        // Should have fields for different categories
        expect(embed.fields).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: expect.stringContaining('Info')
                }),
                expect.objectContaining({
                    name: expect.stringContaining('Moderation')
                })
            ])
        );
    });
    
    test('should use ephemeral replies', async () => {
        interaction.options.getString.mockReturnValue(null);
        
        await command.execute(interaction);
        
        expect(interaction.reply).toHaveBeenCalledWith(
            expect.objectContaining({
                ephemeral: true
            })
        );
    });
    
    test('should handle errors gracefully', async () => {
        // Mock an error in the interaction
        interaction.reply.mockRejectedValue(new Error('Discord API Error'));
        
        // Should not throw
        await expect(command.execute(interaction)).resolves.not.toThrow();
    });
});
