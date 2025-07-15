const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const XPManager = require('../../utils/XPManager');
const { EmbedTemplates, Colors } = require('../../utils/EmbedTemplates');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetxp')
        .setDescription('Reset a user\'s XP (Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose XP you want to reset')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false), // Disable in DMs
    
    async execute(interaction) {
        try {
            // Double-check permissions at runtime
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                const noPermEmbed = EmbedTemplates.createEmbed({
                    title: '❌ Access Denied',
                    description: 'You need Administrator permissions to use this command.',
                    color: Colors.ERROR
                });
                return await interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
            }

            const user = interaction.options.getUser('user');
            const guildId = interaction.guild.id;
            
            // Check if user exists in database
            const userData = await XPManager.getUserXP(user.id, guildId);
            if (!userData || userData.xp === 0) {
                const noDataEmbed = EmbedTemplates.createEmbed({
                    title: 'No XP Data',
                    description: `${user.username} doesn't have any XP to reset.`,
                    color: Colors.WARNING
                });
                
                return await interaction.reply({ embeds: [noDataEmbed], ephemeral: true });
            }
            
            // Reset user's XP
            const resetSuccess = await XPManager.resetUserXP(user.id, guildId);
            
            if (resetSuccess) {
                const successEmbed = EmbedTemplates.createEmbed({
                    title: 'XP Reset Successful',
                    description: `${user.username}'s XP has been reset to 0.`,
                    color: Colors.SUCCESS,
                    fields: [
                        { name: 'Previous Level', value: `${userData.level}`, inline: true },
                        { name: 'Previous XP', value: `${userData.xp}`, inline: true },
                        { name: 'Reset by', value: `${interaction.user.username}`, inline: true }
                    ],
                    footer: {
                        text: `${interaction.guild.name} • XP Reset Action`,
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    },
                    timestamp: new Date()
                });
                
                await interaction.reply({ embeds: [successEmbed] });
            } else {
                const errorEmbed = EmbedTemplates.createEmbed({
                    title: 'Reset Failed',
                    description: 'Failed to reset user\'s XP. Please try again.',
                    color: Colors.ERROR
                });
                
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

        } catch (error) {
            console.error('Error in resetxp command:', error);
            
            const errorEmbed = EmbedTemplates.createEmbed({
                title: 'Error',
                description: 'An error occurred while resetting XP.',
                color: Colors.ERROR
            });

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};