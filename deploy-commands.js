const { REST, Routes } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = join(__dirname, 'commands');
const commandFolders = readdirSync(commandsPath);

// Load all commands
for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = join(folderPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            console.log(`✅ Loaded command: ${command.data.name}`);
        } else {
            console.log(`⚠️  Command at ${filePath} is missing required "data" or "execute" property.`);
        }
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
    try {
        console.log(`\n🚀 Started refreshing ${commands.length} application (/) commands.`);

        // Choose between guild-specific or global commands
        const data = process.env.GUILD_ID 
            ? await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            )
            : await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
        console.log('\n📋 Deployed commands:');
        data.forEach(cmd => console.log(`  - ${cmd.name}: ${cmd.description}`));
        
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
        
        if (error.code === 50001) {
            console.error('💡 Missing Access: Make sure the bot has the "applications.commands" scope.');
        } else if (error.code === 10002) {
            console.error('💡 Unknown Application: Check your CLIENT_ID in .env file.');
        } else if (error.code === 50013) {
            console.error('💡 Missing Permissions: The bot needs proper permissions in the guild.');
        }
    }
})();
