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
            const member = await interaction.guild.members.fetch(targetUser.id);
            if (!member) {
                return interaction.editReply({
                    content: '❌ User not found in this server.'
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
                    const role = interaction.guild.roles.cache.get(savedRole.roleId);
                    
                    if (!role) {
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

                    // Check if bot can assign this role
                    if (role.position >= interaction.guild.members.me.roles.highest.position) {
                        results.push(`❌ **${savedRole.roleName}** - Insufficient permissions`);
                        failedCount++;
                        continue;
                    }

                    // Assign the role
                    await member.roles.add(role, `Role restored by ${interaction.user.tag}`);
                    results.push(`✅ **${savedRole.roleName}** - Restored successfully`);
                    restoredCount++;

                    // Small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 200));

                } catch (error) {
                    console.error(`Failed to restore role ${savedRole.roleName}:`, error);
                    results.push(`❌ **${savedRole.roleName}** - Failed to restore`);
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
