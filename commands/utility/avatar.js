const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { EmbedTemplates, Colors } = require('../../utils/EmbedTemplates');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Display a user\'s avatar')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose avatar you want to see')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user') || interaction.user;
            
            const avatarEmbed = EmbedTemplates.createEmbed({
                title: `${user.username}'s Avatar`,
                description: `Click [here](${user.displayAvatarURL({ size: 1024 })}) to download`,
                color: Colors.UTILITY,
                image: user.displayAvatarURL({ dynamic: true, size: 512 }),
                footer: {
                    text: `${interaction.guild.name} • Avatar Display`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                },
                timestamp: new Date()
            });

            await interaction.reply({ embeds: [avatarEmbed] });

        } catch (error) {
            console.error('Error in avatar command:', error);
            
            const errorEmbed = EmbedTemplates.createEmbed({
                title: 'Error',
                description: 'An error occurred while fetching the avatar.',
                color: Colors.ERROR
            });

            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
    }
};