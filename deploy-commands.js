const { REST, Routes } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
const logger = require('./utils/logger');
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
        try {
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
                logger.info(`✅ Loaded command: ${command.data.name}`);
            } else {
                logger.warn(`⚠️  Command at ${filePath} is missing required "data" or "execute" property.`);
            }
        } catch (error) {
            logger.logError(error, {
                context: `Failed to load command file: ${file}`,
                filePath: filePath
            });
        }
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
    try {
        logger.info(`Started refreshing ${commands.length} application (/) commands.`);
        
        // Deploy globally for production, per-guild for development
        const route = process.env.NODE_ENV === 'production' 
            ? Routes.applicationCommands(process.env.CLIENT_ID)
            : Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID);
        
        const data = await rest.put(route, { body: commands });
        
        logger.info(`✅ Successfully reloaded ${data.length} application (/) commands${process.env.NODE_ENV === 'production' ? ' globally' : ' for development guild'}.`);
    } catch (error) {
        logger.logError(error, {
            context: 'Failed to deploy slash commands',
            commandCount: commands.length
        });
        process.exit(1);
    }
})();
