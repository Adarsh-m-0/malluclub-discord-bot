describe('Ping Command Tests', () => {
    let command;
    let interaction;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        interaction = {
            ...global.mockInteraction,
            reply: jest.fn().mockResolvedValue(undefined),
            editReply: jest.fn().mockResolvedValue(undefined),
            deferReply: jest.fn().mockResolvedValue(undefined),
            createdTimestamp: Date.now()
        };
        
        interaction.client = {
            ws: { ping: 45 },
            user: { displayAvatarURL: jest.fn().mockReturnValue('https://example.com/avatar.png') }
        };
        
        command = require('../commands/info/ping');
    });
    
    test('should have correct command data', () => {
        expect(command.data).toBeDefined();
        expect(command.data.name).toBe('ping');
        expect(command.data.description).toContain('latency');
        expect(command.execute).toBeDefined();
    });
    
    test('should reply with "Pong!" and latency info without error', async () => {
        const mockMessage = { createdTimestamp: Date.now() + 100 };
        interaction.editReply.mockResolvedValue(mockMessage);
        
        await expect(command.execute(interaction)).resolves.not.toThrow();
        
        expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
        expect(interaction.editReply).toHaveBeenCalledTimes(1);
        
        const editReplyCall = interaction.editReply.mock.calls[0][0];
        expect(editReplyCall).toHaveProperty('embeds');
        expect(editReplyCall.embeds[0].title).toContain('Pong');
    });
    
    test('should calculate latency correctly', async () => {
        const mockMessage = { createdTimestamp: Date.now() + 150 };
        interaction.editReply.mockResolvedValue(mockMessage);
        
        await command.execute(interaction);
        
        const editReplyCall = interaction.editReply.mock.calls[0][0];
        const embed = editReplyCall.embeds[0];
        
        const latencyField = embed.fields.find(field => 
            field.name.includes('Bot Latency')
        );
        
        expect(latencyField).toBeDefined();
        expect(latencyField.value).toMatch(/\d+ms/); // Should contain numbers followed by "ms"
    });
    
    test('should show API latency', async () => {
        await command.execute(interaction);
        
        const editReplyCall = interaction.editReply.mock.calls[0][0];
        const embed = editReplyCall.embeds[0];
        
        const apiLatencyField = embed.fields.find(field => 
            field.name.includes('API Latency')
        );
        
        expect(apiLatencyField).toBeDefined();
        expect(apiLatencyField.value).toContain('45ms');
    });
    
    test('should handle errors gracefully', async () => {
        interaction.deferReply.mockRejectedValue(new Error('Discord API Error'));
        
        // Should not throw
        await expect(command.execute(interaction)).resolves.not.toThrow();
    });
});
