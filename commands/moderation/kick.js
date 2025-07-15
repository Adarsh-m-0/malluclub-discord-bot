const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ModerationLog = require('../../models/ModerationLog');
const { EmbedTemplates, Colors } = require('../../utils/EmbedTemplates');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for kicking')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const member = await interaction.guild.members.fetch(target.id);
        
        if (!member) {
            return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
        }
        
        if (member.id === interaction.user.id) {
            return interaction.reply({ content: '❌ You cannot kick yourself.', ephemeral: true });
        }
        
        if (member.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: '❌ You cannot kick this member due to role hierarchy.', ephemeral: true });
        }
        
        if (!member.kickable) {
            return interaction.reply({ content: '❌ I cannot kick this member.', ephemeral: true });
        }
        
        try {
            // Log to database
            const modLog = new ModerationLog({
                userId: target.id,
                moderatorId: interaction.user.id,
                action: 'kick',
                reason: reason
            });
            await modLog.save();
            
            // DM the user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(Colors.WARNING)
                    .setAuthor({ 
                        name: '👢 Moderation Action: Kick', 
                        iconURL: interaction.guild.iconURL()
                    })
                    .setDescription(`You have been **kicked** from **${interaction.guild.name}**`)
                    .addFields(
                        { name: '📋 Reason', value: `\`\`\`${reason}\`\`\``, inline: false },
                        { name: '👮 Moderator', value: interaction.user.tag, inline: true },
                        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setFooter({ text: 'You can rejoin the server if you have an invite link' })
                    .setTimestamp();
                
                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('Could not send DM to user');
            }
            
            // Kick the member
            await member.kick(reason);
            
            // Success embed
            const successEmbed = new EmbedBuilder()
                .setColor(Colors.SUCCESS)
                .setAuthor({ 
                    name: '✅ Moderation Action Completed', 
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setDescription(`👢 **${target.tag}** has been successfully kicked from the server`)
                .addFields(
                    { name: '👮 Moderator', value: interaction.user.toString(), inline: true },
                    { name: '📋 Reason', value: `\`${reason}\``, inline: true },
                    { name: '👤 Kicked User', value: `${target.tag}\n\`${target.id}\``, inline: true },
                    { name: '📅 Action Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '📊 Status', value: '✅ Kick Applied Successfully', inline: true }
                )
                .setFooter({ 
                    text: `Action performed by ${interaction.user.tag} • ${interaction.guild.name}`, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setTimestamp();
            
            await interaction.reply({ embeds: [successEmbed] });
            
            // Log to log channel
            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(Colors.MODERATION)
                        .setAuthor({ 
                            name: '👢 Kick Action Logged', 
                            iconURL: interaction.guild.iconURL()
                        })
                        .setDescription(`**Moderation Action:** User Kick`)
                        .addFields(
                            { name: '👤 User', value: `${target.tag}\n\`${target.id}\``, inline: true },
                            { name: '👮 Moderator', value: `${interaction.user.tag}`, inline: true },
                            { name: '📋 Reason', value: `\`${reason}\``, inline: false }
                        )
                        .setFooter({ text: `${interaction.guild.name} Moderation Log` })
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
        } catch (error) {
            console.error('Error kicking member:', error);
            await interaction.reply({ content: '❌ An error occurred while kicking the member.', ephemeral: true });
        }
    },
};
