const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');
const ModerationLog = require('../../models/ModerationLog');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmute a member in the server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to unmute')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for unmuting')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const member = await interaction.guild.members.fetch(target.id);
        
        if (!member) {
            return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
        }
        
        if (!member.isCommunicationDisabled()) {
            return interaction.reply({ content: '❌ This member is not muted.', ephemeral: true });
        }
        
        try {
            // Remove timeout
            await member.timeout(null, reason);
            
            // Remove mute role if it exists
            const muteRole = interaction.guild.roles.cache.find(role => role.name === 'Muted');
            if (muteRole && member.roles.cache.has(muteRole.id)) {
                await member.roles.remove(muteRole, `Unmuted by ${interaction.user.tag}: ${reason}`);
            }
            
            // Update database
            await User.findOneAndUpdate(
                { userId: target.id },
                { 
                    muteExpiration: null,
                    lastSeen: new Date()
                }
            );
            
            // Log to database
            const modLog = new ModerationLog({
                userId: target.id,
                moderatorId: interaction.user.id,
                action: 'unmute',
                reason: reason
            });
            await modLog.save();
            
            // DM the user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('🔊 You have been unmuted')
                    .setDescription(`You have been unmuted in **${interaction.guild.name}**`)
                    .addFields(
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Moderator', value: interaction.user.tag, inline: true }
                    )
                    .setTimestamp();
                
                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('Could not send DM to user');
            }
            
            // Success embed
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Member Unmuted')
                .setDescription(`${target.tag} has been unmuted`)
                .addFields(
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Reason', value: reason, inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [successEmbed] });
            
            // Log to log channel
            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('🔊 Member Unmuted')
                        .setDescription(`${target} was unmuted by ${interaction.user}`)
                        .addFields(
                            { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                            { name: 'Reason', value: reason, inline: false }
                        )
                        .setFooter({ text: 'Member Unmuted' })
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
        } catch (error) {
            console.error('Error unmuting member:', error);
            await interaction.reply({ content: '❌ An error occurred while unmuting the member.', ephemeral: true });
        }
    },
};
