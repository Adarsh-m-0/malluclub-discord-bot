const { REST, Routes } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function cleanupAndDeployCommands() {
    try {
        console.log('🧹 Starting command cleanup and deployment...\n');

        // First, let's see what commands are currently registered
        console.log('📋 Fetching currently registered commands...');
        
        const existingCommands = process.env.GUILD_ID 
            ? await rest.get(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID))
            : await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
        
        console.log(`Found ${existingCommands.length} existing commands:`);
        existingCommands.forEach(cmd => console.log(`  - ${cmd.name} (ID: ${cmd.id})`));
        
        // Load current commands from files
        const commands = [];
        const commandsPath = join(__dirname, 'commands');
        const commandFolders = readdirSync(commandsPath);
        
        console.log('\n📁 Loading commands from files...');
        
        for (const folder of commandFolders) {
            const folderPath = join(commandsPath, folder);
            const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));
            
            for (const file of commandFiles) {
                const filePath = join(folderPath, file);
                try {
                    const command = require(filePath);
                    
                    if ('data' in command && 'execute' in command) {
                        commands.push(command.data.toJSON());
                        console.log(`  ✅ Loaded: ${command.data.name} (${folder}/${file})`);
                    } else {
                        console.log(`  ⚠️  Skipped: ${file} (missing data/execute)`);
                    }
                } catch (error) {
                    console.log(`  ❌ Error loading ${file}: ${error.message}`);
                }
            }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`  • Files scanned: ${commandFolders.length} folders`);
        console.log(`  • Commands loaded: ${commands.length}`);
        console.log(`  • Commands in Discord: ${existingCommands.length}`);
        
        // Show current commands that will be deployed
        console.log('\n🎯 Commands to deploy:');
        commands.forEach(cmd => console.log(`  - ${cmd.name}: ${cmd.description}`));
        
        // Deploy the commands (this will replace ALL existing commands)
        console.log('\n🚀 Deploying commands...');
        
        const data = process.env.GUILD_ID 
            ? await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            )
            : await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
        
        console.log(`\n✅ Successfully deployed ${data.length} commands!`);
        
        // Show what was deployed
        console.log('\n📋 Deployed commands:');
        data.forEach(cmd => console.log(`  - ${cmd.name} (ID: ${cmd.id})`));
        
        // Find removed commands
        const deployedNames = data.map(cmd => cmd.name);
        const removedCommands = existingCommands.filter(cmd => !deployedNames.includes(cmd.name));
        
        if (removedCommands.length > 0) {
            console.log('\n🗑️  Removed commands:');
            removedCommands.forEach(cmd => console.log(`  - ${cmd.name} (was ID: ${cmd.id})`));
        }
        
        console.log('\n🎉 Command cleanup and deployment completed successfully!');
        console.log('💡 Old commands should no longer appear in Discord.');
        
    } catch (error) {
        console.error('❌ Error during command cleanup:', error);
        
        if (error.code === 50001) {
            console.error('💡 Missing Access: Make sure the bot has the "applications.commands" scope.');
        } else if (error.code === 10002) {
            console.error('💡 Unknown Application: Check your CLIENT_ID in .env file.');
        } else if (error.code === 50013) {
            console.error('💡 Missing Permissions: The bot needs proper permissions in the guild.');
        }
    }
}

// Run the cleanup
cleanupAndDeployCommands();
