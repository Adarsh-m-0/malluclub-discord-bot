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
            // Show help for specific command
            const command = interaction.client.commands.get(commandName);
            if (!command) {
                return interaction.reply({ content: `❌ Command \`${commandName}\` not found.`, ephemeral: true });
            }
            
            const commandHelp = new EmbedBuilder()
                .setColor(0x5865F2) // Discord Blurple
                .setAuthor({ 
                    name: `Command Help: /${command.data.name}`, 
                    iconURL: interaction.client.user.displayAvatarURL(),
                    url: null
                })
                .setDescription(`📖 **${command.data.description}**`)
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .addFields(
                    { 
                        name: '⚡ Usage', 
                        value: `\`\`\`/${command.data.name}\`\`\``, 
                        inline: true 
                    },
                    { 
                        name: '⏱️ Cooldown', 
                        value: `\`${command.cooldown || 3} seconds\``, 
                        inline: true 
                    },
                    {
                        name: '🔗 Category',
                        value: `\`${getCategoryFromCommand(command.data.name)}\``,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag} • MalluClub Bot`, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setTimestamp();
            
            if (command.data.options && command.data.options.length > 0) {
                const options = command.data.options.map(option => {
                    const required = option.required ? '🔸 **Required**' : '🔹 *Optional*';
                    return `${required} \`${option.name}\`\n└ ${option.description}`;
                }).join('\n\n');
                
                commandHelp.addFields({ 
                    name: '⚙️ Command Options', 
                    value: options, 
                    inline: false 
                });
            }
            
            return interaction.reply({ embeds: [commandHelp] });
        }
        
        // Show general help with select menu
        const helpEmbed = new EmbedBuilder()
            .setColor(0x5865F2) // Discord Blurple
            .setAuthor({ 
                name: 'MalluClub Bot - Command Center', 
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setDescription(`👋 **Welcome to MalluClub Bot!**\n\n🤖 I'm a comprehensive Discord bot designed to help manage your server with powerful moderation tools, fun entertainment features, and useful information commands.\n\n✨ Use the dropdown menu below to explore different command categories!`)
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                { 
                    name: '📊 Bot Statistics', 
                    value: `🔢 **Commands:** ${interaction.client.commands.size}\n⏰ **Uptime:** <t:${Math.floor((Date.now() - interaction.client.readyTimestamp) / 1000)}:R>\n🌐 **Servers:** ${interaction.client.guilds.cache.size}\n👥 **Users:** ${interaction.client.users.cache.size}`, 
                    inline: true 
                },
                { 
                    name: '🚀 Quick Start', 
                    value: '📋 Browse categories below\n🔍 Use `/help <command>`\n⚡ All commands use slash system\n🛡️ Permissions auto-checked', 
                    inline: true 
                },
                { 
                    name: '⭐ Key Features', 
                    value: '🛡️ Advanced moderation\n🎮 Fun entertainment\n📊 Server insights\n🤖 Auto-moderation\n📝 Comprehensive logging', 
                    inline: true 
                }
            )
            .setFooter({ 
                text: `Requested by ${interaction.user.tag} • MalluClub Bot v2.0`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();

        // ...existing code...
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('📋 Select a command category to view')
            .addOptions(
                {
                    label: 'Moderation Commands',
                    description: 'Server management and moderation tools',
                    value: 'moderation',
                    emoji: '🛡️'
                },
                {
                    label: 'Information Commands',
                    description: 'User and server information utilities',
                    value: 'info',
                    emoji: '📊'
                },
                {
                    label: 'Fun Commands',
                    description: 'Entertainment and community engagement',
                    value: 'fun',
                    emoji: '🎮'
                }
            );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        await interaction.reply({ embeds: [helpEmbed], components: [row] });
        
        // Handle select menu interaction
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

function getCategoryFromCommand(commandName) {
    const categories = {
        'kick': 'Moderation', 'ban': 'Moderation', 'mute': 'Moderation', 
        'unmute': 'Moderation', 'warn': 'Moderation', 'clear': 'Moderation', 'modlogs': 'Moderation',
        'ping': 'Information', 'userinfo': 'Information', 'serverinfo': 'Information',
        'meme': 'Fun', 'joke': 'Fun', 'avatar': 'Fun',
        'help': 'General'
    };
    return categories[commandName] || 'Other';
}

function getCategoryHelp(category, client) {
    const commands = client.commands.filter(cmd => {
        const cmdPath = cmd.data.name;
        switch (category) {
            case 'moderation':
                return ['kick', 'ban', 'mute', 'unmute', 'warn', 'clear', 'modlogs'].includes(cmdPath);
            case 'info':
                return ['ping', 'userinfo', 'serverinfo'].includes(cmdPath);
            case 'fun':
                return ['meme', 'joke', 'avatar'].includes(cmdPath);
            default:
                return false;
        }
    });
    
    const categoryTitles = {
        moderation: '🛡️ Moderation & Security Commands',
        info: '📊 Information & Utility Commands',
        fun: '🎮 Entertainment & Fun Commands'
    };
    
    const categoryDescriptions = {
        moderation: 'Powerful tools to keep your server safe, organized, and well-moderated. These commands require appropriate permissions.',
        info: 'Comprehensive information commands to get details about users, server statistics, and bot performance.',
        fun: 'Engaging entertainment features to keep your community active and entertained with memes, jokes, and interactive content.'
    };
    
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({ 
            name: categoryTitles[category], 
            iconURL: client.user.displayAvatarURL()
        })
        .setDescription(categoryDescriptions[category])
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ text: `${categoryTitles[category]} • MalluClub Bot v2.0`, iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
    
    const commandList = commands.map(cmd => {
        const cooldown = cmd.cooldown ? ` (${cmd.cooldown}s cooldown)` : ' (3s cooldown)';
        return `**/${cmd.data.name}**${cooldown}\n└ ${cmd.data.description}`;
    }).join('\n\n');
    
    if (commandList) {
        embed.addFields({ 
            name: `📋 Available Commands (${commands.size} total)`, 
            value: commandList, 
            inline: false 
        });
        
        // Add usage tips for each category
        const usageTips = {
            moderation: '💡 **Permission Required:** Most moderation commands require specific Discord permissions. Make sure the bot has the necessary roles and permissions in your server.',
            info: '💡 **Usage Tip:** These commands work in any channel and provide real-time information about your server and its members.',
            fun: '💡 **Entertainment:** These commands help keep your community engaged. Some commands may fetch content from external APIs.'
        };
        
        embed.addFields({ 
            name: 'ℹ️ Additional Information', 
            value: usageTips[category], 
            inline: false 
        });
    } else {
        embed.addFields({ 
            name: '❌ No Commands Available', 
            value: 'No commands were found in this category. This may indicate a configuration issue.', 
            inline: false 
        });
    }
    
    return embed;
}
