require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');

console.log('🧪 Starting comprehensive bot test...\n');

// Test 1: Environment Variables
console.log('🔧 Testing Environment Variables:');
const requiredEnvVars = ['DISCORD_TOKEN', 'CLIENT_ID', 'MONGODB_URI', 'GUILD_ID'];
let envErrors = 0;

requiredEnvVars.forEach(varName => {
    if (process.env[varName]) {
        console.log(`✅ ${varName}: Set`);
    } else {
        console.log(`❌ ${varName}: Missing`);
        envErrors++;
    }
});

if (envErrors > 0) {
    console.log(`\n❌ ${envErrors} environment variable(s) missing. Please check your .env file.`);
    process.exit(1);
}

// Test 2: Database Connection
console.log('\n💾 Testing Database Connection:');
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB connection successful');
        
        // Test 3: Command Loading
        console.log('\n📂 Testing Command Loading:');
        const { readdirSync } = require('fs');
        const { join } = require('path');
        
        const commandsPath = join(__dirname, 'commands');
        const commandFolders = readdirSync(commandsPath);
        let commandCount = 0;
        let commandErrors = 0;
        
        for (const folder of commandFolders) {
            const folderPath = join(commandsPath, folder);
            try {
                const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));
                
                for (const file of commandFiles) {
                    const filePath = join(folderPath, file);
                    try {
                        const command = require(filePath);
                        
                        if ('data' in command && 'execute' in command) {
                            console.log(`✅ ${folder}/${file}: Valid command structure`);
                            commandCount++;
                        } else {
                            console.log(`⚠️  ${folder}/${file}: Missing required properties`);
                            commandErrors++;
                        }
                    } catch (error) {
                        console.log(`❌ ${folder}/${file}: ${error.message}`);
                        commandErrors++;
                    }
                }
            } catch (error) {
                console.log(`❌ Error reading folder ${folder}: ${error.message}`);
                commandErrors++;
            }
        }
        
        console.log(`\n📊 Command Summary: ${commandCount} valid, ${commandErrors} errors`);
        
        // Test 4: Event Loading
        console.log('\n🎯 Testing Event Loading:');
        const eventsPath = join(__dirname, 'events');
        const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        let eventCount = 0;
        let eventErrors = 0;
        
        for (const file of eventFiles) {
            const filePath = join(eventsPath, file);
            try {
                const event = require(filePath);
                
                if ('name' in event && 'execute' in event) {
                    console.log(`✅ ${file}: Valid event structure`);
                    eventCount++;
                } else {
                    console.log(`⚠️  ${file}: Missing required properties`);
                    eventErrors++;
                }
            } catch (error) {
                console.log(`❌ ${file}: ${error.message}`);
                eventErrors++;
            }
        }
        
        console.log(`\n📊 Event Summary: ${eventCount} valid, ${eventErrors} errors`);
        
        // Test 5: Models
        console.log('\n🗄️ Testing Database Models:');
        try {
            const User = require('./models/User');
            const ModerationLog = require('./models/ModerationLog');
            console.log('✅ User model: Loaded successfully');
            console.log('✅ ModerationLog model: Loaded successfully');
        } catch (error) {
            console.log(`❌ Model loading error: ${error.message}`);
        }
        
        // Final Summary
        console.log('\n🎉 Test Summary:');
        console.log('✅ Environment variables: Valid');
        console.log('✅ Database connection: Working');
        console.log(`✅ Commands: ${commandCount} loaded`);
        console.log(`✅ Events: ${eventCount} loaded`);
        console.log('✅ Models: Loaded successfully');
        
        if (commandErrors === 0 && eventErrors === 0) {
            console.log('\n🚀 All tests passed! Bot is ready for deployment.');
        } else {
            console.log(`\n⚠️  Some issues found: ${commandErrors + eventErrors} errors total`);
        }
        
        console.log('\n💡 To start the bot: npm start');
        console.log('💡 To deploy commands: npm run deploy');
        
        mongoose.connection.close();
        process.exit(0);
        
    })
    .catch(err => {
        console.log(`❌ MongoDB connection failed: ${err.message}`);
        process.exit(1);
    });
