const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ModerationLog = require('../../models/ModerationLog');
const { EmbedTemplates, Colors } = require('../../utils/EmbedTemplates');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for banning')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('delete-days')
                .setDescription('Number of days of messages to delete (0-7)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const deleteDays = interaction.options.getInteger('delete-days') ?? 0;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        
        if (member) {
            if (member.id === interaction.user.id) {
                return interaction.reply({ content: '❌ You cannot ban yourself.', ephemeral: true });
            }
            
            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.reply({ content: '❌ You cannot ban this member due to role hierarchy.', ephemeral: true });
            }
            
            if (!member.bannable) {
                return interaction.reply({ content: '❌ I cannot ban this member.', ephemeral: true });
            }
        }
        
        try {
            // Log to database
            const modLog = new ModerationLog({
                userId: target.id,
                moderatorId: interaction.user.id,
                action: 'ban',
                reason: reason,
                additionalInfo: { deleteDays }
            });
            await modLog.save();
            
            // DM the user (if they're in the server)
            if (member) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setColor(Colors.ERROR)
                        .setAuthor({ 
                            name: '🔨 Moderation Action: Ban', 
                            iconURL: interaction.guild.iconURL()
                        })
                        .setDescription(`You have been **banned** from **${interaction.guild.name}**`)
                        .addFields(
                            { name: '📋 Reason', value: `\`\`\`${reason}\`\`\``, inline: false },
                            { name: '👮 Moderator', value: interaction.user.tag, inline: true },
                            { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                        )
                        .setFooter({ text: 'If you believe this was an error, contact server administrators' })
                        .setTimestamp();
                    
                    await target.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.log('Could not send DM to user');
                }
            }
            
            // Ban the member
            await interaction.guild.members.ban(target.id, { 
                reason: reason,
                deleteMessageDays: deleteDays 
            });
            
            // Success embed
            const successEmbed = new EmbedBuilder()
                .setColor(Colors.SUCCESS)
                .setAuthor({ 
                    name: '✅ Moderation Action Completed', 
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setDescription(`🔨 **${target.tag}** has been successfully banned from the server`)
                .addFields(
                    { name: '👮 Moderator', value: interaction.user.toString(), inline: true },
                    { name: '📋 Reason', value: `\`${reason}\``, inline: true },
                    { name: '🗑️ Messages Deleted', value: `${deleteDays} days`, inline: true },
                    { name: '👤 Banned User', value: `${target.tag}\n\`${target.id}\``, inline: true },
                    { name: '📅 Action Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '📊 Status', value: '✅ Ban Applied Successfully', inline: true }
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
                            name: '🔨 Ban Action Logged', 
                            iconURL: interaction.guild.iconURL()
                        })
                        .setDescription(`**Moderation Action:** User Ban`)
                        .addFields(
                            { name: '👤 Banned User', value: `${target.tag}\n\`${target.id}\``, inline: true },
                            { name: '👮 Moderator', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                            { name: '📋 Reason', value: `\`\`\`${reason}\`\`\``, inline: false },
                            { name: '🗑️ Messages Deleted', value: `${deleteDays} days of messages`, inline: true },
                            { name: '📅 Action Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                            { name: '🔗 Channel', value: interaction.channel.toString(), inline: true }
                        )
                        .setFooter({ text: 'Moderation Log • MalluClub Bot' })
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
        } catch (error) {
            console.error('Error banning member:', error);
            await interaction.reply({ content: '❌ An error occurred while banning the member.', ephemeral: true });
        }
    },
};
