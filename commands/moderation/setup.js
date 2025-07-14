const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup server roles and permissions automatically')
        .addSubcommand(subcommand =>
            subcommand
                .setName('roles')
                .setDescription('Create all necessary roles for the bot')
                .addBooleanOption(option =>
                    option.setName('force')
                        .setDescription('Force recreation of existing roles')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('permissions')
                .setDescription('Setup channel permissions for mute role'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('complete')
                .setDescription('Run complete server setup (roles + permissions)'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'roles':
                    await handleSetupRoles(interaction);
                    break;
                case 'permissions':
                    await handleSetupPermissions(interaction);
                    break;
                case 'complete':
                    await handleCompleteSetup(interaction);
                    break;
            }
        } catch (error) {
            console.error('Setup command error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred during setup.',
                    ephemeral: true
                });
            }
        }
    },
};

async function handleSetupRoles(interaction) {
    const force = interaction.options.getBoolean('force') || false;
    await interaction.deferReply();

    const rolesToCreate = [
        {
            name: 'Muted',
            color: '#6B6B6B',
            permissions: [],
            reason: 'Mute role for moderation'
        },
        {
            name: 'Voice Newcomer',
            color: '#95A5A6',
            permissions: [],
            reason: 'Voice XP Level 5 role'
        },
        {
            name: 'Voice Regular',
            color: '#3498DB',
            permissions: [],
            reason: 'Voice XP Level 10 role'
        },
        {
            name: 'Voice Enthusiast',
            color: '#9B59B6',
            permissions: [],
            reason: 'Voice XP Level 20 role'
        },
        {
            name: 'Voice Expert',
            color: '#E67E22',
            permissions: [],
            reason: 'Voice XP Level 35 role'
        },
        {
            name: 'Voice Master',
            color: '#E74C3C',
            permissions: [],
            reason: 'Voice XP Level 50 role'
        },
        {
            name: 'Voice Legend',
            color: '#F1C40F',
            permissions: [],
            reason: 'Voice XP Level 75 role'
        }
    ];

    let created = 0;
    let skipped = 0;
    let errors = 0;
    const results = [];

    for (const roleData of rolesToCreate) {
        try {
            const existingRole = interaction.guild.roles.cache.find(role => role.name === roleData.name);
            
            if (existingRole && !force) {
                skipped++;
                results.push(`⏭️ **${roleData.name}** - Already exists`);
                continue;
            }

            if (existingRole && force) {
                await existingRole.delete('Force recreation during setup');
            }

            const newRole = await interaction.guild.roles.create({
                name: roleData.name,
                color: roleData.color,
                permissions: roleData.permissions,
                reason: roleData.reason
            });

            created++;
            results.push(`✅ **${roleData.name}** - Created successfully`);

            // If it's the Muted role, set up channel permissions
            if (roleData.name === 'Muted') {
                await setupMuteRolePermissions(interaction.guild, newRole);
            }

        } catch (error) {
            console.error(`Error creating role ${roleData.name}:`, error);
            errors++;
            results.push(`❌ **${roleData.name}** - Failed to create`);
        }
    }

    const embed = new EmbedBuilder()
        .setColor(created > 0 ? 0x00FF00 : errors > 0 ? 0xFF6B6B : 0xFFAA00)
        .setTitle('🔧 Role Setup Complete')
        .setDescription('Server role setup has been completed!')
        .addFields(
            { name: 'Statistics', value: `✅ Created: ${created}\n⏭️ Skipped: ${skipped}\n❌ Errors: ${errors}`, inline: true },
            { name: 'Results', value: results.join('\n'), inline: false }
        )
        .setFooter({ text: 'Use /setup permissions to configure channel permissions' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleSetupPermissions(interaction) {
    await interaction.deferReply();

    const muteRole = interaction.guild.roles.cache.find(role => role.name === 'Muted');
    if (!muteRole) {
        return interaction.editReply({
            content: '❌ Muted role not found. Please run `/setup roles` first.'
        });
    }

    let updated = 0;
    let errors = 0;
    const results = [];

    const channels = interaction.guild.channels.cache;

    for (const [channelId, channel] of channels) {
        try {
            if (channel.isTextBased() && !channel.isThread()) {
                // Text channels - deny sending messages, adding reactions, creating threads
                await channel.permissionOverwrites.create(muteRole, {
                    SendMessages: false,
                    AddReactions: false,
                    CreatePublicThreads: false,
                    CreatePrivateThreads: false,
                    SendMessagesInThreads: false,
                    UseApplicationCommands: false
                });
                updated++;
                results.push(`📝 **${channel.name}** - Text permissions set`);
            } else if (channel.isVoiceBased()) {
                // Voice channels - deny speaking and video
                await channel.permissionOverwrites.create(muteRole, {
                    Speak: false,
                    Stream: false,
                    UseVAD: false
                });
                updated++;
                results.push(`🎤 **${channel.name}** - Voice permissions set`);
            }

            // Add small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
            console.error(`Error setting permissions for channel ${channel.name}:`, error);
            errors++;
            results.push(`❌ **${channel.name}** - Failed to set permissions`);
        }
    }

    const embed = new EmbedBuilder()
        .setColor(updated > 0 ? 0x00FF00 : 0xFF6B6B)
        .setTitle('🔐 Permission Setup Complete')
        .setDescription('Channel permissions for mute role have been configured!')
        .addFields(
            { name: 'Statistics', value: `✅ Updated: ${updated}\n❌ Errors: ${errors}`, inline: true },
            { name: 'Results', value: results.slice(0, 20).join('\n') + (results.length > 20 ? '\n...and more' : ''), inline: false }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleCompleteSetup(interaction) {
    await interaction.deferReply();

    const statusEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🚀 Starting Complete Server Setup')
        .setDescription('This may take a few moments...')
        .addFields({
            name: 'Setup Steps',
            value: '1️⃣ Creating roles...\n2️⃣ Setting up permissions...\n3️⃣ Finalizing configuration...',
            inline: false
        })
        .setTimestamp();

    await interaction.editReply({ embeds: [statusEmbed] });

    try {
        // Step 1: Setup roles
        await handleSetupRoles(interaction);
        
        // Wait a bit for rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 2: Setup permissions
        await handleSetupPermissions(interaction);

        // Final success message
        const finalEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎉 Complete Setup Finished!')
            .setDescription('Your server has been fully configured with all necessary roles and permissions.')
            .addFields(
                {
                    name: '✅ Completed Features',
                    value: [
                        '• Moderation roles (Muted)',
                        '• Voice XP level roles',
                        '• Channel permissions',
                        '• Mute functionality',
                        '• Role hierarchy'
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🎯 Next Steps',
                    value: [
                        '• Set auto-role with `/autorole set`',
                        '• Test moderation commands',
                        '• Check voice XP system',
                        '• Customize role colors if needed'
                    ].join('\n'),
                    inline: true
                }
            )
            .setFooter({ text: 'Your MalluClub server is now ready!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [finalEmbed] });

    } catch (error) {
        console.error('Error during complete setup:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor(0xFF6B6B)
            .setTitle('❌ Setup Error')
            .setDescription('An error occurred during the complete setup process.')
            .addFields({
                name: 'What to do',
                value: 'Try running `/setup roles` and `/setup permissions` separately.',
                inline: false
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function setupMuteRolePermissions(guild, muteRole) {
    const channels = guild.channels.cache;
    
    for (const [channelId, channel] of channels) {
        try {
            if (channel.isTextBased() && !channel.isThread()) {
                await channel.permissionOverwrites.create(muteRole, {
                    SendMessages: false,
                    AddReactions: false,
                    CreatePublicThreads: false,
                    CreatePrivateThreads: false,
                    SendMessagesInThreads: false,
                    UseApplicationCommands: false
                });
            } else if (channel.isVoiceBased()) {
                await channel.permissionOverwrites.create(muteRole, {
                    Speak: false,
                    Stream: false,
                    UseVAD: false
                });
            }
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.error(`Error setting mute permissions for ${channel.name}:`, error);
        }
    }
}
