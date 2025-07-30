const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Manage auto role assignment')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers | PermissionFlagsBits.ManageRoles)
        .addSubcommand(subcommand =>
            subcommand
                .setName('assign-all')
                .setDescription('Assign the auto role to all existing human members'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Show current auto role configuration')),

    async execute(interaction) {
        // Additional permission check for moderators
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers) && 
            !interaction.member.permissions.has(PermissionFlagsBits.ManageRoles) &&
            !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ You need **Moderate Members** or **Manage Roles** permission to use this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'info') {
                const autoRoleId = process.env.AUTO_ROLE_ID;
                
                if (!autoRoleId) {
                    return interaction.reply({
                        content: '❌ Auto role is not configured. Please set AUTO_ROLE_ID in the environment variables.',
                        ephemeral: true
                    });
                }

                const autoRole = interaction.guild.roles.cache.get(autoRoleId);
                if (!autoRole) {
                    return interaction.reply({
                        content: `❌ Auto role not found. Role ID: \`${autoRoleId}\``,
                        ephemeral: true
                    });
                }

                return interaction.reply({
                    content: `✅ **Auto Role Configuration**\n` +
                            `**Role:** ${autoRole} (\`${autoRole.name}\`)\n` +
                            `**ID:** \`${autoRole.id}\`\n` +
                            `**Members with role:** ${autoRole.members.size}`,
                    ephemeral: true
                });
            }

            if (subcommand === 'assign-all') {
                const autoRoleId = process.env.AUTO_ROLE_ID;
                
                if (!autoRoleId) {
                    return interaction.reply({
                        content: '❌ Auto role is not configured. Please set AUTO_ROLE_ID in the environment variables.',
                        ephemeral: true
                    });
                }

                const autoRole = interaction.guild.roles.cache.get(autoRoleId);
                if (!autoRole) {
                    return interaction.reply({
                        content: `❌ Auto role not found. Role ID: \`${autoRoleId}\``,
                        ephemeral: true
                    });
                }

                // Check if bot has permission to assign this role
                if (autoRole.position >= interaction.guild.members.me.roles.highest.position) {
                    return interaction.reply({
                        content: `❌ I don't have permission to assign the role **${autoRole.name}**. The role is higher than my highest role.`,
                        ephemeral: true
                    });
                }

                await interaction.deferReply({ ephemeral: true });

                // Fetch all members to ensure we have the latest data
                await interaction.guild.members.fetch();

                // Get all human members (exclude bots)
                const humanMembers = interaction.guild.members.cache.filter(member => !member.user.bot);
                
                // Get members who don't have the auto role
                const membersWithoutRole = humanMembers.filter(member => !member.roles.cache.has(autoRoleId));

                if (membersWithoutRole.size === 0) {
                    return interaction.editReply({
                        content: `✅ All human members (${humanMembers.size}) already have the **${autoRole.name}** role.`
                    });
                }

                let successCount = 0;
                let failCount = 0;
                const errors = [];

                // Process members in batches to avoid rate limits
                const memberArray = Array.from(membersWithoutRole.values());
                const batchSize = 10;

                for (let i = 0; i < memberArray.length; i += batchSize) {
                    const batch = memberArray.slice(i, i + batchSize);
                    
                    await Promise.allSettled(
                        batch.map(async (member) => {
                            try {
                                await member.roles.add(autoRole);
                                successCount++;
                                
                                logger.info(`Auto role assigned to existing member ${member.user.tag}`, {
                                    category: 'autorole',
                                    user: member.user.id,
                                    guild: interaction.guild.id,
                                    role: autoRole.name,
                                    executor: interaction.user.id
                                });
                            } catch (error) {
                                failCount++;
                                errors.push(`${member.user.tag}: ${error.message}`);
                                
                                logger.logError(error, {
                                    category: 'autorole',
                                    context: 'Failed to assign auto role to existing member',
                                    user: member.user.id,
                                    guild: interaction.guild.id,
                                    executor: interaction.user.id
                                });
                            }
                        })
                    );

                    // Add a small delay between batches to respect rate limits
                    if (i + batchSize < memberArray.length) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    // Update progress for large operations
                    if (memberArray.length > 20) {
                        const processed = Math.min(i + batchSize, memberArray.length);
                        await interaction.editReply({
                            content: `🔄 Processing... ${processed}/${memberArray.length} members`
                        });
                    }
                }

                // Final result message
                let resultMessage = `✅ **Auto Role Assignment Complete**\n` +
                                  `**Role:** ${autoRole.name}\n` +
                                  `**Successfully assigned:** ${successCount} members\n` +
                                  `**Total human members:** ${humanMembers.size}`;

                if (failCount > 0) {
                    resultMessage += `\n**Failed:** ${failCount} members`;
                    
                    if (errors.length <= 5) {
                        resultMessage += `\n**Errors:**\n${errors.map(e => `• ${e}`).join('\n')}`;
                    } else {
                        resultMessage += `\n**Errors:** Too many to display (${errors.length} total)`;
                    }
                }

                await interaction.editReply({ content: resultMessage });
            }

        } catch (error) {
            logger.logError(error, {
                category: 'autorole',
                context: 'Auto role command execution failed',
                user: interaction.user.id,
                guild: interaction.guild.id
            });

            const errorMessage = '❌ An error occurred while executing the auto role command.';
            
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },
};
