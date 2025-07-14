const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');
const ModerationLog = require('../../models/ModerationLog');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a member')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for warning')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');
        const member = await interaction.guild.members.fetch(target.id);
        
        if (!member) {
            return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
        }
        
        if (member.id === interaction.user.id) {
            return interaction.reply({ content: '❌ You cannot warn yourself.', ephemeral: true });
        }
        
        if (member.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: '❌ You cannot warn this member due to role hierarchy.', ephemeral: true });
        }
        
        try {
            // Update user in database
            const userData = await User.findOneAndUpdate(
                { userId: target.id },
                { 
                    userId: target.id,
                    username: target.username,
                    lastSeen: new Date(),
                    $push: {
                        warnings: {
                            reason: reason,
                            moderator: interaction.user.tag,
                            timestamp: new Date()
                        }
                    }
                },
                { upsert: true, new: true }
            );
            
            // Log to database
            const modLog = new ModerationLog({
                userId: target.id,
                moderatorId: interaction.user.id,
                action: 'warn',
                reason: reason
            });
            await modLog.save();
            
            // DM the user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#ffff00')
                    .setTitle('⚠️ You have been warned')
                    .setDescription(`You have been warned in **${interaction.guild.name}**`)
                    .addFields(
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Moderator', value: interaction.user.tag, inline: true },
                        { name: 'Total Warnings', value: `${userData.warnings.length}`, inline: true }
                    )
                    .setTimestamp();
                
                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('Could not send DM to user');
            }
            
            // Success embed
            const successEmbed = new EmbedBuilder()
                .setColor('#ffff00')
                .setTitle('⚠️ Member Warned')
                .setDescription(`${target.tag} has been warned`)
                .addFields(
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Total Warnings', value: `${userData.warnings.length}`, inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [successEmbed] });
            
            // Log to log channel
            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#ffff00')
                        .setTitle('⚠️ Member Warned')
                        .setDescription(`${target} was warned by ${interaction.user}`)
                        .addFields(
                            { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                            { name: 'Reason', value: reason, inline: false },
                            { name: 'Total Warnings', value: `${userData.warnings.length}`, inline: true }
                        )
                        .setFooter({ text: 'Member Warned' })
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
        } catch (error) {
            console.error('Error warning member:', error);
            await interaction.reply({ content: '❌ An error occurred while warning the member.', ephemeral: true });
        }
    },
};
