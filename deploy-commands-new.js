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

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
    try {
        logger.info(`🚀 Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        logger.info(`✅ Successfully reloaded ${data.length} application (/) commands.`);
        
        // Also deploy globally for production
        if (process.env.NODE_ENV === 'production') {
            const globalData = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            logger.info(`✅ Successfully deployed ${globalData.length} global application (/) commands.`);
        }
        
    } catch (error) {
        logger.logError(error, { context: 'Command deployment failed' });
    }
})();
