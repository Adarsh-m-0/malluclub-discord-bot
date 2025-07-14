const { Collection } = require('discord.js');
require('dotenv').config();

// Mock Discord.js classes and methods
const mockUser = {
    id: '987654321098765432',
    tag: 'TestUser#1234',
    username: 'TestUser',
    discriminator: '1234',
    bot: false
};

const mockGuild = {
    id: '123456789012345678',
    name: 'Test Guild',
    members: new Collection(),
    channels: new Collection(),
    roles: new Collection()
};

const mockChannel = {
    id: '111222333444555666',
    name: 'test-channel',
    type: 0, // TEXT_CHANNEL
    send: jest.fn().mockResolvedValue({ id: 'message_id' }),
    guild: mockGuild
};

const mockInteraction = {
    id: 'interaction_id',
    user: mockUser,
    guild: mockGuild,
    channel: mockChannel,
    channelId: mockChannel.id,
    commandName: 'test',
    replied: false,
    deferred: false,
    reply: jest.fn().mockResolvedValue(undefined),
    editReply: jest.fn().mockResolvedValue(undefined),
    followUp: jest.fn().mockResolvedValue(undefined),
    deferReply: jest.fn().mockResolvedValue(undefined),
    options: {
        getString: jest.fn(),
        getUser: jest.fn(),
        getChannel: jest.fn(),
        getRole: jest.fn(),
        getInteger: jest.fn(),
        getBoolean: jest.fn()
    }
};

const mockClient = {
    user: {
        id: 'bot_id',
        tag: 'TestBot#0001',
        setActivity: jest.fn()
    },
    guilds: {
        cache: new Collection()
    },
    users: {
        cache: new Collection()
    },
    commands: new Collection(),
    cooldowns: new Collection(),
    login: jest.fn().mockResolvedValue('token'),
    destroy: jest.fn()
};

// Setup global mocks
global.mockUser = mockUser;
global.mockGuild = mockGuild;
global.mockChannel = mockChannel;
global.mockInteraction = mockInteraction;
global.mockClient = mockClient;

// Mock console methods to reduce test noise
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
};

// Mock process.env for tests
process.env.NODE_ENV = 'test';
process.env.DISCORD_TOKEN = 'test_token';
process.env.MONGODB_URI = 'mongodb://localhost:27017/malluclub_test';

// Setup test database
beforeAll(async () => {
    // Connect to test database
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
    }
});

afterAll(async () => {
    // Clean up database connection
    const mongoose = require('mongoose');
    await mongoose.connection.close();
});

// Clear database between tests
afterEach(async () => {
    const mongoose = require('mongoose');
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
});

// Custom matchers
expect.extend({
    toBeValidDiscordEmbed(received) {
        const pass = received && 
                    typeof received.title === 'string' &&
                    typeof received.description === 'string' &&
                    Array.isArray(received.fields || []);
        
        if (pass) {
            return {
                message: () => `expected ${received} not to be a valid Discord embed`,
                pass: true
            };
        } else {
            return {
                message: () => `expected ${received} to be a valid Discord embed`,
                pass: false
            };
        }
    },
    
    toHaveBeenCalledWithEphemeral(received) {
        const calls = received.mock.calls;
        const pass = calls.some(call => 
            call[0] && call[0].ephemeral === true
        );
        
        if (pass) {
            return {
                message: () => `expected function not to have been called with ephemeral: true`,
                pass: true
            };
        } else {
            return {
                message: () => `expected function to have been called with ephemeral: true`,
                pass: false
            };
        }
    }
});
