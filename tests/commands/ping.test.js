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
        
        command = require('../../commands/info/ping');
    });
    
    test('should have correct command data', () => {
        expect(command.data).toBeDefined();
        expect(command.data.name).toBe('ping');
        expect(command.data.description).toContain('bot latency');
        expect(command.execute).toBeDefined();
    });
    
    test('should reply with ping information', async () => {
        await command.execute(interaction);
        
        expect(interaction.reply).toHaveBeenCalledTimes(1);
        expect(interaction.reply).toHaveBeenCalledWith(
            expect.objectContaining({
                embeds: expect.arrayContaining([
                    expect.objectContaining({
                        title: expect.stringContaining('Pong'),
                        fields: expect.arrayContaining([
                            expect.objectContaining({
                                name: expect.stringContaining('API Latency')
                            }),
                            expect.objectContaining({
                                name: expect.stringContaining('Bot Latency')
                            })
                        ])
                    })
                ])
            })
        );
    });
    
    test('should calculate bot latency correctly', async () => {
        const mockMessage = { createdTimestamp: Date.now() + 100 };
        interaction.editReply.mockResolvedValue(mockMessage);
        
        await command.execute(interaction);
        
        // Should defer reply first, then edit with latency info
        expect(interaction.deferReply).toHaveBeenCalledTimes(1);
        expect(interaction.editReply).toHaveBeenCalledTimes(1);
    });
    
    test('should show websocket ping', async () => {
        await command.execute(interaction);
        
        const editReplyCall = interaction.editReply.mock.calls[0][0];
        const embed = editReplyCall.embeds[0];
        
        const apiLatencyField = embed.fields.find(field => 
            field.name.includes('API Latency')
        );
        
        expect(apiLatencyField).toBeDefined();
        expect(apiLatencyField.value).toContain('45ms');
    });
});
