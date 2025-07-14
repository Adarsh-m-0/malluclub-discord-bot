const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Get a user\'s avatar')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user whose avatar you want to see')
                .setRequired(false)),
    
    async execute(interaction) {
        const target = interaction.options.getUser('target') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id);
        
        const avatarEmbed = new EmbedBuilder()
            .setColor(member.displayHexColor || '#0099ff')
            .setTitle(`🖼️ ${target.tag}'s Avatar`)
            .setDescription(`[Download Original](${target.displayAvatarURL({ dynamic: true, size: 4096 })})`)
            .setImage(target.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '👤 User', value: target.tag, inline: true },
                { name: '🆔 ID', value: target.id, inline: true },
                { name: '🤖 Bot', value: target.bot ? 'Yes' : 'No', inline: true }
            )
            .setFooter({ 
                text: `Requested by ${interaction.user.tag} • Mallu Club`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();
        
        // Add server-specific avatar if different from global avatar
        if (member.avatar && member.avatar !== target.avatar) {
            avatarEmbed.addFields({
                name: '🏠 Server Avatar',
                value: `[Download Server Avatar](${member.displayAvatarURL({ dynamic: true, size: 4096 })})`,
                inline: false
            });
        }
        
        await interaction.reply({ embeds: [avatarEmbed] });
    },
};
