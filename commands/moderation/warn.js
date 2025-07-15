const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { EmbedTemplates, Colors } = require('../../utils/EmbedTemplates');
const User = require('../../models/User');
const ModerationLog = require('../../models/ModerationLog');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warning system for members')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a warning to a member')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('The member to warn')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for warning')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View all warnings for a member')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('The member to check warnings for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a specific warning from a member')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('The member to remove warning from')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('warning_id')
                        .setDescription('The warning ID to remove (use /warn list to see IDs)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all warnings for a member')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('The member to clear warnings for')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for clearing warnings')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false), // Disable in DMs
    
    async execute(interaction) {
        // Double-check permissions at runtime
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const noPermEmbed = EmbedTemplates.createEmbed({
                title: 'Access Denied',
                description: 'You need the Moderate Members permission to use this command.',
                color: Colors.ERROR
            });
            return await interaction.reply({ embeds: [noPermEmbed], flags: MessageFlags.Ephemeral });
        }

        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'add':
                await this.addWarning(interaction);
                break;
            case 'list':
                await this.listWarnings(interaction);
                break;
            case 'remove':
                await this.removeWarning(interaction);
                break;
            case 'clear':
                await this.clearWarnings(interaction);
                break;
        }
    },

    // Helper function to check permissions
    async checkPermissions(interaction, target) {
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        
        if (!member) {
            const errorEmbed = EmbedTemplates.createEmbed({
                title: 'User Not Found',
                description: 'User not found in this server.',
                color: Colors.ERROR
            });
            if (!interaction.replied) {
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
            return false;
        }
        
        if (member.id === interaction.user.id) {
            const errorEmbed = EmbedTemplates.createEmbed({
                title: 'Invalid Target',
                description: 'You cannot perform this action on yourself.',
                color: Colors.ERROR
            });
            if (!interaction.replied) {
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
            return false;
        }
        
        if (member.roles.highest.position >= interaction.member.roles.highest.position) {
            const errorEmbed = EmbedTemplates.createEmbed({
                title: 'Insufficient Permissions',
                description: 'You cannot perform this action on this member due to role hierarchy.',
                color: Colors.ERROR
            });
            if (!interaction.replied) {
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
            return false;
        }
        
        return member;
    },

    // Add warning subcommand
    async addWarning(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');
        
        const member = await this.checkPermissions(interaction, target);
        if (!member) return;
        
        try {
            // Create warning object with better ID generation
            const newWarning = {
                id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`, // More unique ID
                reason: reason,
                moderator: interaction.user.tag,
                moderatorId: interaction.user.id,
                timestamp: new Date()
            };
            
            // Update user in database
            const userData = await User.findOneAndUpdate(
                { userId: target.id, guildId: interaction.guild.id },
                { 
                    userId: target.id,
                    guildId: interaction.guild.id,
                    username: target.username,
                    lastSeen: new Date(),
                    $push: { warnings: newWarning }
                },
                { upsert: true, new: true }
            );
            
            // Log to database
            const modLog = new ModerationLog({
                userId: target.id,
                moderatorId: interaction.user.id,
                action: 'warn',
                reason: reason,
                additionalInfo: {
                    warningId: newWarning.id,
                    totalWarnings: userData.warnings.length
                }
            });
            await modLog.save();
            
            // Send DM to user
            try {
                const dmEmbed = EmbedTemplates.createEmbed({
                    title: 'Warning Issued',
                    description: `You have been warned in ${interaction.guild.name}`,
                    color: Colors.WARNING,
                    fields: [
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Moderator', value: interaction.user.tag, inline: true },
                        { name: 'Total Warnings', value: `${userData.warnings.length}`, inline: true }
                    ],
                    footer: {
                        text: `Case ID: ${modLog.caseId} | Warning ID: ${newWarning.id}`,
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    },
                    timestamp: new Date()
                });
                
                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                // console.log('Could not send DM to user');
            }
            
            // Success response
            const successEmbed = EmbedTemplates.createEmbed({
                title: 'Warning Issued',
                description: `${target.tag} has been warned successfully`,
                color: Colors.WARNING,
                fields: [
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Total Warnings', value: `${userData.warnings.length}`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                ],
                footer: {
                    text: `Case ID: ${modLog.caseId} | Warning ID: ${newWarning.id}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                },
                timestamp: new Date()
            });
            
            await interaction.reply({ embeds: [successEmbed] });
            
            // Log to log channel
            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = EmbedTemplates.createEmbed({
                        title: 'Warning Issued',
                        description: `${target} was warned by ${interaction.user}`,
                        color: Colors.WARNING,
                        fields: [
                            { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                            { name: 'Total Warnings', value: `${userData.warnings.length}`, inline: true },
                            { name: 'Reason', value: reason, inline: false }
                        ],
                        footer: {
                            text: `Case ID: ${modLog.caseId} | Warning ID: ${newWarning.id}`,
                            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                        },
                        timestamp: new Date()
                    });
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
        } catch (error) {
            console.error('Error warning member:', error);
            const errorEmbed = EmbedTemplates.createEmbed({
                title: 'Error',
                description: 'An error occurred while warning the member. Please try again.',
                color: Colors.ERROR
            });
            if (!interaction.replied) {
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
        }
    },

    // List warnings subcommand
    async listWarnings(interaction) {
        const target = interaction.options.getUser('target');
        
        try {
            const userData = await User.findOne({ userId: target.id, guildId: interaction.guild.id });
            
            if (!userData || !userData.warnings || userData.warnings.length === 0) {
                const noWarningsEmbed = EmbedTemplates.createEmbed({
                    title: 'No Warnings',
                    description: `${target.tag} has no warnings.`,
                    color: Colors.SUCCESS
                });
                return interaction.reply({ embeds: [noWarningsEmbed], flags: MessageFlags.Ephemeral });
            }
            
            const warnings = userData.warnings.slice(-10); // Show last 10 warnings
            
            const warningList = warnings.map((warning, index) => {
                const date = new Date(warning.timestamp).toLocaleDateString();
                const warningId = warning.id || `legacy_${index + 1}`;
                return `**${index + 1}.** ${warning.reason}\n   📋 **ID:** \`${warningId}\`\n   👤 **Moderator:** ${warning.moderator}\n   📅 **Date:** ${date}`;
            }).join('\n\n');
            
            const warningsEmbed = EmbedTemplates.createEmbed({
                title: `Warnings for ${target.tag}`,
                description: warningList,
                color: Colors.WARNING,
                fields: [
                    { name: 'Total Warnings', value: `${userData.warnings.length}`, inline: true },
                    { name: 'Last Warning', value: new Date(userData.warnings[userData.warnings.length - 1].timestamp).toLocaleDateString(), inline: true }
                ],
                footer: {
                    text: userData.warnings.length > 10 ? 'Showing last 10 warnings' : `Showing all ${userData.warnings.length} warnings`
                }
            });
            
            await interaction.reply({ embeds: [warningsEmbed], flags: MessageFlags.Ephemeral });
            
        } catch (error) {
            console.error('Error listing warnings:', error);
            const errorEmbed = EmbedTemplates.createEmbed({
                title: 'Error',
                description: 'An error occurred while fetching warnings. Please try again.',
                color: Colors.ERROR
            });
            if (!interaction.replied) {
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
        }
    },

    // Remove warning subcommand
    async removeWarning(interaction) {
        const target = interaction.options.getUser('target');
        const warningId = interaction.options.getString('warning_id');
        
        const member = await this.checkPermissions(interaction, target);
        if (!member) return;
        
        try {
            const userData = await User.findOne({ userId: target.id, guildId: interaction.guild.id });
            
            if (!userData || !userData.warnings || userData.warnings.length === 0) {
                const noWarningsEmbed = EmbedTemplates.createEmbed({
                    title: 'No Warnings',
                    description: `${target.tag} has no warnings to remove.`,
                    color: Colors.ERROR
                });
                return interaction.reply({ embeds: [noWarningsEmbed], flags: MessageFlags.Ephemeral });
            }
            
            const warningIndex = userData.warnings.findIndex(w => w.id === warningId);
            
            if (warningIndex === -1) {
                const notFoundEmbed = EmbedTemplates.createEmbed({
                    title: 'Warning Not Found',
                    description: `Warning with ID \`${warningId}\` not found.\n\nUse \`/warn list\` to see valid warning IDs.`,
                    color: Colors.ERROR
                });
                return interaction.reply({ embeds: [notFoundEmbed], flags: MessageFlags.Ephemeral });
            }
            
            const removedWarning = userData.warnings[warningIndex];
            userData.warnings.splice(warningIndex, 1);
            await userData.save();
            
            // Log the removal
            const modLog = new ModerationLog({
                userId: target.id,
                moderatorId: interaction.user.id,
                action: 'warn_remove',
                reason: `Removed warning: ${removedWarning.reason}`,
                additionalInfo: {
                    removedWarningId: warningId,
                    originalModerator: removedWarning.moderator,
                    remainingWarnings: userData.warnings.length
                }
            });
            await modLog.save();
            
            const successEmbed = EmbedTemplates.createEmbed({
                title: 'Warning Removed',
                description: `Successfully removed warning from ${target.tag}`,
                color: Colors.SUCCESS,
                fields: [
                    { name: 'Removed Warning', value: removedWarning.reason, inline: false },
                    { name: 'Remaining Warnings', value: `${userData.warnings.length}`, inline: true },
                    { name: 'Removed By', value: interaction.user.tag, inline: true }
                ],
                footer: {
                    text: `Case ID: ${modLog.caseId} | Warning ID: ${warningId}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                }
            });
            
            await interaction.reply({ embeds: [successEmbed] });
            
        } catch (error) {
            console.error('Error removing warning:', error);
            const errorEmbed = EmbedTemplates.createEmbed({
                title: 'Error',
                description: 'An error occurred while removing the warning. Please try again.',
                color: Colors.ERROR
            });
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
    },

    // Clear all warnings subcommand
    async clearWarnings(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');
        
        const member = await this.checkPermissions(interaction, target);
        if (!member) return;
        
        try {
            const userData = await User.findOne({ userId: target.id, guildId: interaction.guild.id });
            
            if (!userData || !userData.warnings || userData.warnings.length === 0) {
                const noWarningsEmbed = EmbedTemplates.createEmbed({
                    title: 'No Warnings',
                    description: `${target.tag} has no warnings to clear.`,
                    color: Colors.ERROR
                });
                return interaction.reply({ embeds: [noWarningsEmbed], flags: MessageFlags.Ephemeral });
            }
            
            const warningCount = userData.warnings.length;
            userData.warnings = [];
            await userData.save();
            
            // Log the clearing
            const modLog = new ModerationLog({
                userId: target.id,
                moderatorId: interaction.user.id,
                action: 'warn_clear',
                reason: reason,
                additionalInfo: {
                    clearedWarningCount: warningCount
                }
            });
            await modLog.save();
            
            const successEmbed = EmbedTemplates.createEmbed({
                title: 'Warnings Cleared',
                description: `Successfully cleared ${warningCount} warning(s) for ${target.tag}`,
                color: Colors.SUCCESS,
                fields: [
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Warnings Cleared', value: `${warningCount}`, inline: true },
                    { name: 'Cleared By', value: interaction.user.tag, inline: true }
                ],
                footer: {
                    text: `Case ID: ${modLog.caseId} | All Warnings Cleared`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                }
            });
            
            await interaction.reply({ embeds: [successEmbed] });
            
        } catch (error) {
            console.error('Error clearing warnings:', error);
            const errorEmbed = EmbedTemplates.createEmbed({
                title: 'Error',
                description: 'An error occurred while clearing warnings. Please try again.',
                color: Colors.ERROR
            });
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
    }
};
