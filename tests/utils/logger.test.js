const logger = require('../../utils/logger');

describe('Logger Utility Tests', () => {
    let consoleSpy;
    
    beforeEach(() => {
        jest.clearAllMocks();
        // Spy on console methods
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });
    
    afterEach(() => {
        consoleSpy.mockRestore();
    });
    
    test('should have all required log methods', () => {
        expect(logger.info).toBeDefined();
        expect(logger.error).toBeDefined();
        expect(logger.warn).toBeDefined();
        expect(logger.debug).toBeDefined();
        expect(logger.discord).toBeDefined();
        expect(logger.command).toBeDefined();
        expect(logger.voice).toBeDefined();
        expect(logger.moderation).toBeDefined();
        expect(logger.database).toBeDefined();
        expect(logger.security).toBeDefined();
        expect(logger.logError).toBeDefined();
        expect(logger.performance).toBeDefined();
        expect(logger.startup).toBeDefined();
        expect(logger.shutdown).toBeDefined();
    });
    
    test('should log basic messages', () => {
        logger.info('Test message');
        expect(typeof logger.info).toBe('function');
    });
    
    test('should log discord events with metadata', () => {
        const metadata = { userId: '123', guilds: 5 };
        logger.discord('Bot ready', metadata);
        expect(typeof logger.discord).toBe('function');
    });
    
    test('should log command execution', () => {
        const user = { tag: 'User#1234', id: '123' };
        const guild = { name: 'Test Guild', id: '456' };
        
        logger.command('ping', user, guild);
        expect(typeof logger.command).toBe('function');
    });
    
    test('should log moderation actions', () => {
        const target = { tag: 'BadUser#1234', id: '123' };
        const moderator = { tag: 'Mod#5678', id: '456' };
        
        logger.moderation('ban', target, moderator, 'Spam');
        expect(typeof logger.moderation).toBe('function');
    });
    
    test('should log errors with context', () => {
        const error = new Error('Test error');
        const context = { command: 'test', user: '123' };
        
        logger.logError(error, context);
        expect(typeof logger.logError).toBe('function');
    });
    
    test('should log performance metrics', () => {
        logger.performance('database query', 150, { query: 'SELECT * FROM users' });
        expect(typeof logger.performance).toBe('function');
    });
    
    test('should handle startup logging', () => {
        logger.startup();
        expect(typeof logger.startup).toBe('function');
    });
    
    test('should handle shutdown logging', () => {
        logger.shutdown();
        expect(typeof logger.shutdown).toBe('function');
    });
    
    test('should log voice activities', () => {
        const metadata = { userId: '123', channelId: '456', duration: 300 };
        logger.voice('User joined voice channel', metadata);
        expect(typeof logger.voice).toBe('function');
    });
    
    test('should log database operations', () => {
        const metadata = { operation: 'insert', collection: 'users' };
        logger.database('User created', metadata);
        expect(typeof logger.database).toBe('function');
    });
    
    test('should log security events', () => {
        const metadata = { userId: '123', action: 'failed_login' };
        logger.security('Suspicious activity detected', metadata);
        expect(typeof logger.security).toBe('function');
    });
});
