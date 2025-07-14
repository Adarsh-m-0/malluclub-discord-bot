const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { EmbedTemplates, Colors } = require('../../utils/EmbedTemplates');
const { EmbedUtils } = require('../../utils/EmbedUtils');

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
                const errorEmbed = EmbedTemplates.error(
                    'Command Not Found',
                    `Command \`${commandName}\` was not found. Use \`/help\` to see available commands.`,
                    interaction.user
                );
                return interaction.reply({ embeds: [errorEmbed], flags: 64 });
            }
            
            // Enhanced individual command help
            const commandHelp = EmbedTemplates.info(
                `Command: /${command.data.name}`,
                `📝 **${command.data.description}**`,
                interaction.guild
            ).addFields(
                EmbedUtils.createField('⚡ Usage', `\`/${command.data.name}\``, true),
                EmbedUtils.createField('⏱️ Cooldown', `${command.cooldown || 3} seconds`, true),
                EmbedUtils.createField('🔒 Permissions', getCommandPermissions(command), true)
            ).setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });
            
            return interaction.reply({ embeds: [commandHelp] });
        }
        
        // Enhanced main help embed
        const helpEmbed = EmbedTemplates.info(
            '🤖 MalluClub Bot - Help Center',
            'Welcome to **MalluClub Bot**! 🎉\n\nExplore our comprehensive command system using the dropdown menu below.',
            interaction.guild
        ).setColor(Colors.BLURPLE)
         .addFields(
            EmbedUtils.createField('📊 Bot Statistics', [
                `**Commands:** ${interaction.client.commands.size}`,
                `**Servers:** ${interaction.client.guilds.cache.size}`,
                `**Users:** ${interaction.client.users.cache.size.toLocaleString()}`
            ].join('\n'), true),
            EmbedUtils.createField('🎤 Voice Features', [
                '• **Voice XP System** with levels',
                '• **Leaderboards** and statistics',
                '• **Role rewards** for activity',
                '• **Streak tracking** for consistency'
            ].join('\n'), true),
            EmbedUtils.createField('🛡️ Server Management', [
                '• **Advanced moderation** tools',
                '• **Role management** system',
                '• **Auto-role** assignment',
                '• **Comprehensive logging**'
            ].join('\n'), true),
            EmbedUtils.createField('\u200B', '\u200B', false),
            EmbedUtils.createField('🚀 Quick Start', [
                '• Use `/voicestats` to check your voice activity',
                '• Try `/voiceleaderboard` to see rankings',
                '• Use `/serverinfo` for server details',
                '• Explore categories below for all commands!'
            ].join('\n'), false)
        ).setFooter({
            text: `Requested by ${interaction.user.tag} • ${interaction.client.commands.size} commands available`,
            iconURL: interaction.user.displayAvatarURL()
        });
        
        // Enhanced select menu
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('🎯 Choose a command category to explore')
            .addOptions([
                {
                    label: 'Moderation',
                    description: 'Server moderation and management tools',
                    value: 'moderation',
                    emoji: '🛡️'
                },
                {
                    label: 'Information', 
                    description: 'Server, user, and voice statistics',
                    value: 'info',
                    emoji: '📊'
                },
                {
                    label: 'Fun',
                    description: 'Entertainment and social commands',
                    value: 'fun',
                    emoji: '🎮'
                },
                {
                    label: 'Voice System',
                    description: 'Voice XP, levels, and leaderboards',
                    value: 'voice',
                    emoji: '🎤'
                }
            ]);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        await interaction.reply({ embeds: [helpEmbed], components: [row] });
        
        const filter = i => i.customId === 'help_category' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
        
        collector.on('collect', async i => {
            const category = i.values[0];
            const categoryEmbed = getCategoryHelp(category, interaction.client);
            if (categoryEmbed) {
                await i.update({ embeds: [categoryEmbed], components: [row] });
            }
        });
        
        collector.on('end', async () => {
            selectMenu.setDisabled(true);
            const disabledRow = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.editReply({ components: [disabledRow] }).catch(() => {});
        });
    },
};

function getCategoryHelp(category, client) {
    const categoryData = {
        moderation: {
            title: '🛡️ Moderation Commands',
            description: 'Comprehensive server management and moderation tools',
            color: Colors.MODERATION,
            commands: ['kick', 'ban', 'mute', 'unmute', 'warn', 'clear', 'modlogs', 'role', 'setup', 'autorole', 'restoreroles', 'voiceadmin']
        },
        info: {
            title: '📊 Information Commands', 
            description: 'Server statistics, user information, and system details',
            color: Colors.INFO,
            commands: ['ping', 'userinfo', 'serverinfo', 'voicestats', 'voiceleaderboard']
        },
        fun: {
            title: '🎮 Fun Commands',
            description: 'Entertainment and social interaction commands',
            color: Colors.FUN,
            commands: ['meme', 'joke', 'avatar']
        },
        voice: {
            title: '🎤 Voice System Commands',
            description: 'Voice XP tracking, levels, and activity management',
            color: Colors.VOICE_XP,
            commands: ['voicestats', 'voiceleaderboard', 'voiceadmin']
        }
    };
    
    const catData = categoryData[category];
    if (!catData) return null;
    
    const commands = client.commands.filter(cmd => 
        catData.commands.includes(cmd.data.name)
    );
    
    const embed = EmbedTemplates.info(catData.title, catData.description, null)
        .setColor(catData.color);
    
    if (commands.size > 0) {
        // Group commands for better layout
        const commandGroups = [];
        const commandArray = Array.from(commands.values());
        
        for (let i = 0; i < commandArray.length; i += 5) {
            const chunk = commandArray.slice(i, i + 5);
            const commandList = chunk.map(cmd => {
                const emoji = getCommandEmoji(cmd.data.name);
                return `${emoji} **/${cmd.data.name}** - ${cmd.data.description}`;
            }).join('\n');
            
            commandGroups.push(commandList);
        }
        
        commandGroups.forEach((group, index) => {
            embed.addFields(
                EmbedUtils.createField(
                    index === 0 ? 'Available Commands' : '\u200B',
                    group,
                    false
                )
            );
        });
        
        // Add category-specific tips
        const tips = getCategoryTips(category);
        if (tips) {
            embed.addFields(
                EmbedUtils.createField('💡 Pro Tips', tips, false)
            );
        }
        
    } else {
        embed.addFields(
            EmbedUtils.createField('No Commands', 'No commands found in this category.', false)
        );
    }
    
    embed.addFields(
        EmbedUtils.createField('ℹ️ Need Help?', 'Use `/help <command>` for detailed information about a specific command.', false)
    );
    
    return embed;
}

function getCommandEmoji(commandName) {
    const emojiMap = {
        // Moderation
        kick: '👢', ban: '🔨', mute: '🔇', unmute: '🔊', warn: '⚠️',
        clear: '🧹', modlogs: '📋', role: '🎭', setup: '⚙️', 
        autorole: '🤖', restoreroles: '🔄', voiceadmin: '🎛️',
        
        // Info  
        ping: '🏓', userinfo: '👤', serverinfo: '🏠',
        voicestats: '📈', voiceleaderboard: '🏆',
        
        // Fun
        meme: '😂', joke: '🤣', avatar: '🖼️'
    };
    
    return emojiMap[commandName] || '▫️';
}

function getCategoryTips(category) {
    const tips = {
        moderation: '• Use `/setup` first to configure the bot\n• Check `/modlogs` to review recent actions\n• `/autorole` helps manage member roles automatically',
        info: '• `/voicestats` shows your personal voice activity\n• `/voiceleaderboard` displays server rankings\n• `/ping` checks bot responsiveness',
        fun: '• Commands work in any channel where the bot has permissions\n• Use `/avatar` to see profile pictures in high quality',
        voice: '• Join voice channels to start earning XP\n• Check leaderboards to see your server rank\n• Daily activity builds your streak multiplier'
    };
    
    return tips[category] || null;
}

function getCommandPermissions(command) {
    // Basic permission mapping - you can expand this
    const permissionMap = {
        kick: 'Kick Members',
        ban: 'Ban Members', 
        mute: 'Manage Roles',
        clear: 'Manage Messages',
        role: 'Manage Roles',
        setup: 'Administrator',
        autorole: 'Manage Roles',
        voiceadmin: 'Manage Channels'
    };
    
    return permissionMap[command.data.name] || 'None';
}
