const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function clearAllCommands() {
    try {
        console.log('🗑️  Clearing ALL slash commands...\n');
        
        // Clear guild commands if GUILD_ID is set
        if (process.env.GUILD_ID) {
            console.log('🎯 Clearing guild commands...');
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: [] }
            );
            console.log('✅ Guild commands cleared');
        }
        
        // Clear global commands
        console.log('🌍 Clearing global commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [] }
        );
        console.log('✅ Global commands cleared');
        
        console.log('\n🎉 All commands have been cleared!');
        console.log('💡 Run "node deploy-commands.js" to deploy your current commands.');
        
    } catch (error) {
        console.error('❌ Error clearing commands:', error);
    }
}

// Run the clear function
clearAllCommands();
