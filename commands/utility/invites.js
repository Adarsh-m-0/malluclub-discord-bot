const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const inviteTracker = require('../../utils/InviteTracker');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('View invite statistics and management')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View invite statistics for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check invite stats for (leave empty for yourself)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View top inviters in the server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all active invites')),

    async execute(interaction) {
        // Additional permission check for moderators
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers) && 
            !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
            !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ You need **Moderate Members** or **Manage Server** permission to use this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'stats') {
                const targetUser = interaction.options.getUser('user') || interaction.user;
                
                await interaction.deferReply();

                const stats = await inviteTracker.getInviteStats(interaction.guild, targetUser.id);
                
                if (!stats) {
                    return interaction.editReply({
                        content: '❌ Failed to fetch invite statistics.',
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor('#0099FF')
                    .setTitle(`📊 Invite Statistics for ${targetUser.displayName}`)
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: '📨 Total Invites Created', value: stats.totalInvites.toString(), inline: true },
                        { name: '👥 Total Uses', value: stats.totalUses.toString(), inline: true },
                        { name: '📈 Average Uses per Invite', value: stats.totalInvites > 0 ? (stats.totalUses / stats.totalInvites).toFixed(1) : '0', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Invite Statistics' });

                if (stats.invites.length > 0) {
                    const inviteList = stats.invites
                        .slice(0, 10) // Limit to top 10 invites
                        .map(invite => {
                            const usesText = invite.maxUses > 0 ? `${invite.uses}/${invite.maxUses}` : `${invite.uses}/∞`;
                            const tempText = invite.temporary ? ' (Temp)' : '';
                            return `\`${invite.code}\` - ${usesText} uses in #${invite.channel}${tempText}`;
                        })
                        .join('\n');

                    embed.addFields({ 
                        name: '📋 Active Invites', 
                        value: inviteList.length > 0 ? inviteList : 'No active invites', 
                        inline: false 
                    });

                    if (stats.invites.length > 10) {
                        embed.setFooter({ text: `Showing 10 of ${stats.invites.length} invites • Invite Statistics` });
                    }
                }

                await interaction.editReply({ embeds: [embed] });
            }

            else if (subcommand === 'leaderboard') {
                await interaction.deferReply();

                try {
                    const invites = await interaction.guild.invites.fetch();
                    const inviterStats = new Map();

                    // Aggregate invite statistics by inviter
                    invites.forEach(invite => {
                        if (invite.inviter) {
                            const existing = inviterStats.get(invite.inviter.id) || { user: invite.inviter, totalUses: 0, totalInvites: 0 };
                            existing.totalUses += invite.uses;
                            existing.totalInvites += 1;
                            inviterStats.set(invite.inviter.id, existing);
                        }
                    });

                    // Sort by total uses
                    const sortedStats = Array.from(inviterStats.values())
                        .sort((a, b) => b.totalUses - a.totalUses)
                        .slice(0, 15); // Top 15

                    if (sortedStats.length === 0) {
                        return interaction.editReply({
                            content: '📭 No invite statistics found for this server.',
                        });
                    }

                    const embed = new EmbedBuilder()
                        .setColor('#FFD700')
                        .setTitle('🏆 Top Inviters Leaderboard')
                        .setDescription(`Top ${sortedStats.length} members by invite uses`)
                        .setTimestamp()
                        .setFooter({ text: 'Invite Leaderboard' });

                    const leaderboardText = sortedStats
                        .map((stat, index) => {
                            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                            return `${medal} **${stat.user.displayName}** - ${stat.totalUses} uses (${stat.totalInvites} invites)`;
                        })
                        .join('\n');

                    embed.addFields({ name: '📊 Rankings', value: leaderboardText, inline: false });

                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    logger.logError(error, {
                        category: 'invite-command',
                        context: 'Failed to generate leaderboard',
                        guild: interaction.guild.id,
                        user: interaction.user.id
                    });

                    await interaction.editReply({
                        content: '❌ Failed to generate invite leaderboard.',
                    });
                }
            }

            else if (subcommand === 'list') {
                await interaction.deferReply();

                try {
                    const invites = await interaction.guild.invites.fetch();
                    
                    if (invites.size === 0) {
                        return interaction.editReply({
                            content: '📭 No active invites found in this server.',
                        });
                    }

                    const sortedInvites = Array.from(invites.values())
                        .sort((a, b) => b.uses - a.uses);

                    const embed = new EmbedBuilder()
                        .setColor('#0099FF')
                        .setTitle('📨 Active Invites')
                        .setDescription(`Total: ${invites.size} active invites`)
                        .setTimestamp()
                        .setFooter({ text: 'Active Invites List' });

                    // Split into chunks if too many invites
                    const maxInvitesPerEmbed = 15;
                    const invitesToShow = sortedInvites.slice(0, maxInvitesPerEmbed);

                    const inviteList = invitesToShow.map(invite => {
                        const createdBy = invite.inviter ? invite.inviter.displayName : 'Unknown';
                        const usesText = invite.maxUses > 0 ? `${invite.uses}/${invite.maxUses}` : `${invite.uses}/∞`;
                        const expiry = invite.maxAge > 0 ? `<t:${Math.floor((invite.createdTimestamp + invite.maxAge * 1000) / 1000)}:R>` : 'Never';
                        const tempText = invite.temporary ? ' (Temp)' : '';
                        
                        return `**\`${invite.code}\`** - ${usesText} uses${tempText}\n` +
                               `┗ By: ${createdBy} | Channel: #${invite.channel.name} | Expires: ${expiry}`;
                    }).join('\n\n');

                    embed.addFields({ name: '📋 Invite List', value: inviteList, inline: false });

                    if (sortedInvites.length > maxInvitesPerEmbed) {
                        embed.setFooter({ text: `Showing ${maxInvitesPerEmbed} of ${sortedInvites.length} invites • Active Invites List` });
                    }

                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    logger.logError(error, {
                        category: 'invite-command',
                        context: 'Failed to list invites',
                        guild: interaction.guild.id,
                        user: interaction.user.id
                    });

                    await interaction.editReply({
                        content: '❌ Failed to fetch invite list.',
                    });
                }
            }

        } catch (error) {
            logger.logError(error, {
                category: 'invite-command',
                context: 'Invite command execution failed',
                user: interaction.user.id,
                guild: interaction.guild.id
            });

            const errorMessage = '❌ An error occurred while executing the invite command.';
            
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },
};
