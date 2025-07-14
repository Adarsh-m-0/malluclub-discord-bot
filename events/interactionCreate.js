const { Events, Collection } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                logger.warn(`No command matching ${interaction.commandName} was found`, {
                    category: 'command',
                    command: interaction.commandName,
                    user: `${interaction.user.tag} (${interaction.user.id})`,
                    guild: interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DM'
                });
                return;
            }

            const { cooldowns } = interaction.client;

            if (!cooldowns.has(command.data.name)) {
                cooldowns.set(command.data.name, new Collection());
            }

            const now = Date.now();
            const timestamps = cooldowns.get(command.data.name);
            const defaultCooldownDuration = 3;
            const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

                if (now < expirationTime) {
                    const expiredTimestamp = Math.round(expirationTime / 1000);
                    return interaction.reply({
                        content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
                        ephemeral: true
                    });
                }
            }

            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

            // Additional security checks
            if (!interaction.guild) {
                return interaction.reply({
                    content: '❌ This command can only be used in a server!',
                    ephemeral: true
                });
            }

            try {
                const startTime = Date.now();
                await command.execute(interaction);
                const duration = Date.now() - startTime;
                
                logger.command(interaction.commandName, interaction.user, interaction.guild, {
                    duration: duration,
                    channelId: interaction.channelId,
                    channelName: interaction.channel?.name
                });
                
                if (duration > 3000) {
                    logger.performance('Command execution', duration, {
                        command: interaction.commandName,
                        user: interaction.user.id
                    });
                }
            } catch (error) {
                logger.logError(error, {
                    context: `Error executing command: ${interaction.commandName}`,
                    command: interaction.commandName,
                    user: `${interaction.user.tag} (${interaction.user.id})`,
                    guild: interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DM',
                    channelId: interaction.channelId
                });
                
                const errorMessage = {
                    content: '❌ Something went wrong, the devs have been notified.',
                    ephemeral: true
                };

                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorMessage);
                    } else {
                        await interaction.reply(errorMessage);
                    }
                } catch (replyError) {
                    logger.logError(replyError, {
                        context: 'Failed to send error message to user',
                        originalError: error.message,
                        command: interaction.commandName,
                        user: interaction.user.id
                    });
                }
            }
        }
    },
};
