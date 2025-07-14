module.exports = {
    // Test environment
    testEnvironment: 'node',
    
    // Test file patterns
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js',
        '**/__tests__/**/*.js'
    ],
    
    // Coverage settings
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/tests/',
        '/coverage/',
        '/logs/',
        'jest.config.js',
        'deploy-commands.js'
    ],
    
    // Test timeout (30 seconds for Discord API calls)
    testTimeout: 30000,
    
    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    
    // Mock settings
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    
    // Verbose output
    verbose: true,
    
    // Transform settings
    transform: {},
    
    // Module name mapping for easier imports
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@commands/(.*)$': '<rootDir>/commands/$1',
        '^@events/(.*)$': '<rootDir>/events/$1',
        '^@models/(.*)$': '<rootDir>/models/$1',
        '^@utils/(.*)$': '<rootDir>/utils/$1'
    },
    
    // Global variables available in tests
    globals: {
        'TEST_GUILD_ID': '123456789012345678',
        'TEST_USER_ID': '987654321098765432',
        'TEST_CHANNEL_ID': '111222333444555666'
    }
};
