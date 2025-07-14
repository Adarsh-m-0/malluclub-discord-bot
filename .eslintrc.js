module.exports = {
    env: {
        browser: false,
        es2021: true,
        node: true,
        jest: true
    },
    extends: [
        'standard'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        // Indent with 4 spaces
        'indent': ['error', 4],
        
        // Use semicolons
        'semi': ['error', 'always'],
        
        // Allow console.log in development
        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
        
        // Prefer const/let over var
        'no-var': 'error',
        'prefer-const': 'error',
        
        // Spacing rules
        'space-before-function-paren': ['error', {
            'anonymous': 'always',
            'named': 'never',
            'asyncArrow': 'always'
        }],
        
        // Object and array formatting
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'never'],
        
        // String quotes
        'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
        
        // Trailing commas
        'comma-dangle': ['error', 'never'],
        
        // Line length
        'max-len': ['warn', { 
            'code': 120, 
            'ignoreUrls': true, 
            'ignoreStrings': true,
            'ignoreTemplateLiterals': true
        }],
        
        // Function complexity
        'complexity': ['warn', 10],
        'max-depth': ['warn', 4],
        'max-params': ['warn', 5],
        
        // Discord.js specific rules
        'no-unused-vars': ['error', { 
            'argsIgnorePattern': '^_',
            'varsIgnorePattern': '^_'
        }],
        
        // Async/await best practices
        'require-await': 'error',
        'no-return-await': 'error',
        
        // Error handling
        'no-throw-literal': 'error',
        'prefer-promise-reject-errors': 'error',
        
        // Node.js specific
        'no-process-exit': 'warn',
        'no-sync': 'warn'
    },
    overrides: [
        {
            files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
            env: {
                jest: true
            },
            rules: {
                // Allow longer lines in tests
                'max-len': ['warn', { 'code': 150 }],
                
                // Allow console in tests
                'no-console': 'off',
                
                // Allow more complex test functions
                'complexity': ['warn', 15],
                'max-params': ['warn', 8]
            }
        },
        {
            files: ['deploy-commands.js', 'quick-start.bat'],
            rules: {
                // Allow console in utility scripts
                'no-console': 'off',
                
                // Allow process.exit in utility scripts
                'no-process-exit': 'off'
            }
        }
    ],
    globals: {
        // Jest globals
        'describe': 'readonly',
        'test': 'readonly',
        'expect': 'readonly',
        'beforeEach': 'readonly',
        'afterEach': 'readonly',
        'beforeAll': 'readonly',
        'afterAll': 'readonly',
        'jest': 'readonly',
        
        // Custom test globals
        'mockUser': 'readonly',
        'mockGuild': 'readonly',
        'mockChannel': 'readonly',
        'mockInteraction': 'readonly',
        'mockClient': 'readonly'
    }
};
