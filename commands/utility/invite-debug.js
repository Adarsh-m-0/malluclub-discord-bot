const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const inviteTracker = require('../../utils/InviteTracker');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite-debug')
        .setDescription('Debug invite tracking system (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('cache')
                .setDescription('Show current invite cache'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('refresh')
                .setDescription('Refresh invite cache'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('compare')
                .setDescription('Compare cache with current invites')),

    async execute(interaction) {
        // Additional admin check
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ You need **Administrator** permission to use this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'cache') {
                await interaction.deferReply({ ephemeral: true });

                const guildCache = inviteTracker.inviteCache.get(interaction.guild.id);
                
                if (!guildCache || guildCache.size === 0) {
                    return interaction.editReply({
                        content: '📭 No invites in cache. Cache might not be initialized.'
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor('#0099FF')
                    .setTitle('🔍 Invite Cache Debug')
                    .setDescription(`**Guild:** ${interaction.guild.name}\n**Cached Invites:** ${guildCache.size}`)
                    .setTimestamp();

                const cacheEntries = Array.from(guildCache.entries()).slice(0, 10);
                
                if (cacheEntries.length > 0) {
                    const cacheList = cacheEntries.map(([code, data]) => {
                        const inviter = data.inviter ? `${data.inviter.tag}` : 'Unknown';
                        const channel = data.channel ? `#${data.channel.name}` : 'Unknown';
                        return `\`${code}\` - ${data.uses} uses by ${inviter} in ${channel}`;
                    }).join('\n');

                    embed.addFields({ name: '📋 Cached Invites', value: cacheList, inline: false });
                }

                if (guildCache.size > 10) {
                    embed.setFooter({ text: `Showing 10 of ${guildCache.size} cached invites` });
                }

                await interaction.editReply({ embeds: [embed] });
            }

            else if (subcommand === 'refresh') {
                await interaction.deferReply({ ephemeral: true });

                await inviteTracker.initializeGuild(interaction.guild);

                await interaction.editReply({
                    content: '✅ Invite cache refreshed successfully!'
                });
            }

            else if (subcommand === 'compare') {
                await interaction.deferReply({ ephemeral: true });

                const currentInvites = await interaction.guild.invites.fetch();
                const cachedInvites = inviteTracker.inviteCache.get(interaction.guild.id) || new Map();

                const embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('⚖️ Cache vs Current Invites')
                    .addFields(
                        { name: '📊 Current Invites', value: currentInvites.size.toString(), inline: true },
                        { name: '💾 Cached Invites', value: cachedInvites.size.toString(), inline: true },
                        { name: '🔄 Status', value: currentInvites.size === cachedInvites.size ? '✅ Synced' : '⚠️ Out of Sync', inline: true }
                    )
                    .setTimestamp();

                // Find differences
                const differences = [];

                // Check for invites in current but not in cache
                for (const [code, invite] of currentInvites) {
                    const cached = cachedInvites.get(code);
                    if (!cached) {
                        differences.push(`❓ \`${code}\` - Not in cache (${invite.uses} uses)`);
                    } else if (cached.uses !== invite.uses) {
                        differences.push(`🔄 \`${code}\` - Uses mismatch (Cache: ${cached.uses}, Current: ${invite.uses})`);
                    }
                }

                // Check for invites in cache but not in current
                for (const [code, cached] of cachedInvites) {
                    if (!currentInvites.has(code)) {
                        differences.push(`🗑️ \`${code}\` - In cache but deleted (${cached.uses} uses)`);
                    }
                }

                if (differences.length > 0) {
                    const diffText = differences.slice(0, 10).join('\n');
                    embed.addFields({ name: '🔍 Differences Found', value: diffText, inline: false });
                    
                    if (differences.length > 10) {
                        embed.setFooter({ text: `Showing 10 of ${differences.length} differences` });
                    }
                } else {
                    embed.addFields({ name: '✅ Perfect Sync', value: 'Cache and current invites match perfectly!', inline: false });
                }

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            logger.logError(error, {
                category: 'invite-debug',
                context: 'Debug command execution failed',
                user: interaction.user.id,
                guild: interaction.guild.id
            });

            const errorMessage = '❌ An error occurred while debugging invite tracking.';
            
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },
};
