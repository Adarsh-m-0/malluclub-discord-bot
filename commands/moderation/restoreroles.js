const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const UserRoles = require('../../models/UserRoles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restoreroles')
        .setDescription('Restore saved roles for a returning member')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to restore roles for')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('force')
                .setDescription('Force restore even if user already has some roles')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const force = interaction.options.getBoolean('force') || false;
        
        await interaction.deferReply();

        try {
            // Fetch member with error handling
            let member;
            try {
                member = await interaction.guild.members.fetch(targetUser.id);
            } catch (fetchError) {
                console.error('Failed to fetch member:', fetchError);
                return interaction.editReply({
                    content: '❌ User not found in this server or failed to fetch member data.'
                });
            }

            if (!member) {
                return interaction.editReply({
                    content: '❌ User not found in this server.'
                });
            }

            // Check bot permissions
            const botMember = interaction.guild.members.me;
            if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return interaction.editReply({
                    content: '❌ I don\'t have permission to manage roles in this server.'
                });
            }

            // Get saved roles
            const savedRoles = await UserRoles.findOne({
                userId: targetUser.id,
                guildId: interaction.guild.id
            });

            if (!savedRoles || savedRoles.roles.length === 0) {
                return interaction.editReply({
                    content: `❌ No saved roles found for ${targetUser.username}.`
                });
            }

            const rolesToRestore = savedRoles.getRolesToRestore();
            if (rolesToRestore.length === 0) {
                return interaction.editReply({
                    content: `❌ No restorable roles found for ${targetUser.username}.`
                });
            }

            let restoredCount = 0;
            let skippedCount = 0;
            let failedCount = 0;
            const results = [];

            for (const savedRole of rolesToRestore) {
                try {
                    // Fetch role with better error handling
                    const role = interaction.guild.roles.cache.get(savedRole.roleId);
                    
                    if (!role) {
                        console.log(`Role ${savedRole.roleName} (${savedRole.roleId}) not found in guild`);
                        results.push(`⚠️ **${savedRole.roleName}** - Role no longer exists`);
                        failedCount++;
                        continue;
                    }

                    // Check if user already has the role
                    if (member.roles.cache.has(role.id) && !force) {
                        results.push(`⏭️ **${savedRole.roleName}** - Already has role`);
                        skippedCount++;
                        continue;
                    }

                    // Check if bot can assign this role (hierarchy check)
                    const botHighestRole = interaction.guild.members.me.roles.highest;
                    if (role.position >= botHighestRole.position) {
                        console.log(`Cannot manage role ${role.name} (pos: ${role.position}) - Bot highest role (pos: ${botHighestRole.position})`);
                        results.push(`❌ **${savedRole.roleName}** - Role too high in hierarchy`);
                        failedCount++;
                        continue;
                    }

                    // Check if role is managed (by bots/integrations)
                    if (role.managed) {
                        results.push(`❌ **${savedRole.roleName}** - Managed role (cannot assign)`);
                        failedCount++;
                        continue;
                    }

                    // Assign the role with improved error handling
                    try {
                        await member.roles.add(role, `Role restored by ${interaction.user.tag}`);
                        console.log(`✅ Successfully restored role ${role.name} to ${targetUser.tag}`);
                        results.push(`✅ **${savedRole.roleName}** - Restored successfully`);
                        restoredCount++;
                    } catch (assignError) {
                        console.error(`Failed to assign role ${role.name}:`, assignError);
                        
                        // Provide more specific error messages
                        if (assignError.code === 50013) {
                            results.push(`❌ **${savedRole.roleName}** - Missing permissions`);
                        } else if (assignError.code === 50001) {
                            results.push(`❌ **${savedRole.roleName}** - Access denied`);
                        } else {
                            results.push(`❌ **${savedRole.roleName}** - Assignment failed`);
                        }
                        failedCount++;
                    }

                    // Rate limit protection - wait between each assignment
                    await new Promise(resolve => setTimeout(resolve, 250));

                } catch (error) {
                    console.error(`Error processing role ${savedRole.roleName}:`, error);
                    results.push(`❌ **${savedRole.roleName}** - Processing error`);
                    failedCount++;
                }
            }

            // Update saved roles data
            savedRoles.lastSeen = new Date();
            await savedRoles.save();

            const embed = new EmbedBuilder()
                .setColor(restoredCount > 0 ? 0x00FF00 : failedCount > 0 ? 0xFF6B6B : 0xFFAA00)
                .setTitle('🔄 Role Restoration Complete')
                .setDescription(`Role restoration for ${targetUser} has been completed.`)
                .addFields(
                    {
                        name: '📊 Statistics',
                        value: [
                            `✅ Restored: ${restoredCount}`,
                            `⏭️ Skipped: ${skippedCount}`,
                            `❌ Failed: ${failedCount}`,
                            `📁 Total Saved: ${savedRoles.roles.length}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '👤 User Info',
                        value: [
                            `**User:** ${targetUser.tag}`,
                            `**Rejoin Count:** #${savedRoles.rejoinCount}`,
                            `**Last Seen:** <t:${Math.floor(savedRoles.lastSeen.getTime() / 1000)}:R>`,
                            `**Left Server:** ${savedRoles.leftServer ? `<t:${Math.floor(savedRoles.leftServer.getTime() / 1000)}:R>` : 'Never'}`
                        ].join('\n'),
                        inline: true
                    }
                )
                .setFooter({
                    text: `Restored by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            if (results.length > 0) {
                embed.addFields({
                    name: '📋 Detailed Results',
                    value: results.slice(0, 20).join('\n') + (results.length > 20 ? '\n...and more' : ''),
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error restoring roles:', error);
            await interaction.editReply({
                content: '❌ An error occurred while restoring roles.'
            });
        }
    },
};
