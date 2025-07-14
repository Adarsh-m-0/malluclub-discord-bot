const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help and information about bot commands')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get detailed help for a specific command')
                .setRequired(false)),
    
    async execute(interaction) {
        const commandName = interaction.options.getString('command');
        
        if (commandName) {
            const command = interaction.client.commands.get(commandName);
            if (!command) {
                return interaction.reply({ 
                    content: `❌ Command \`${commandName}\` not found.`, 
                    flags: 64 
                });
            }
            
            const commandHelp = new EmbedBuilder()
                .setColor(0x5865F2)
                .setAuthor({ 
                    name: `Command Help: /${command.data.name}`, 
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setDescription(`📖 **${command.data.description}**`)
                .addFields(
                    { 
                        name: '⚡ Usage', 
                        value: `\`/${command.data.name}\``, 
                        inline: true 
                    },
                    { 
                        name: '⏱️ Cooldown', 
                        value: `${command.cooldown || 3} seconds`, 
                        inline: true 
                    }
                )
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag}`, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setTimestamp();
            
            return interaction.reply({ embeds: [commandHelp] });
        }
        
        const helpEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🤖 MalluClub Bot - Help Center')
            .setDescription('Welcome to MalluClub Bot! Use the menu below to explore commands.')
            .addFields(
                { 
                    name: '📊 Statistics', 
                    value: `Commands: ${interaction.client.commands.size}\nServers: ${interaction.client.guilds.cache.size}`, 
                    inline: true 
                }
            )
            .setFooter({ 
                text: `Requested by ${interaction.user.tag}`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('Select a command category')
            .addOptions([
                {
                    label: 'Moderation',
                    description: 'Server moderation tools',
                    value: 'moderation',
                    emoji: '🛡️'
                },
                {
                    label: 'Information', 
                    description: 'Server and user info',
                    value: 'info',
                    emoji: '📊'
                },
                {
                    label: 'Fun',
                    description: 'Entertainment commands',
                    value: 'fun',
                    emoji: '🎮'
                }
            ]);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        await interaction.reply({ embeds: [helpEmbed], components: [row] });
        
        const filter = i => i.customId === 'help_category' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
        
        collector.on('collect', async i => {
            const category = i.values[0];
            const categoryEmbed = getCategoryHelp(category, interaction.client);
            await i.update({ embeds: [categoryEmbed], components: [row] });
        });
        
        collector.on('end', async () => {
            selectMenu.setDisabled(true);
            const disabledRow = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.editReply({ components: [disabledRow] }).catch(() => {});
        });
    },
};

function getCategoryHelp(category, client) {
    const commands = client.commands.filter(cmd => {
        const cmdName = cmd.data.name;
        switch (category) {
            case 'moderation':
                return ['kick', 'ban', 'mute', 'unmute', 'warn', 'clear', 'modlogs', 'voiceadmin', 'autorole', 'role', 'setup', 'restoreroles'].includes(cmdName);
            case 'info':
                return ['ping', 'userinfo', 'serverinfo', 'voicestats', 'voiceleaderboard'].includes(cmdName);
            case 'fun':
                return ['meme', 'joke', 'avatar'].includes(cmdName);
            default:
                return false;
        }
    });
    
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
        .setDescription(`Available ${category} commands:`)
        .setTimestamp();
    
    const commandList = commands.map(cmd => {
        return `**/${cmd.data.name}** - ${cmd.data.description}`;
    }).join('\n');
    
    if (commandList) {
        embed.addFields({ 
            name: 'Commands', 
            value: commandList, 
            inline: false 
        });
    } else {
        embed.addFields({ 
            name: 'No Commands', 
            value: 'No commands found in this category.', 
            inline: false 
        });
    }
    
    return embed;
}
