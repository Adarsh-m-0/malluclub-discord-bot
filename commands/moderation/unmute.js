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
        
        // Check if member is muted (either timeout or mute role)
        const muteRole = interaction.guild.roles.cache.find(role => role.name === 'Muted');
        const hasTimeout = member.isCommunicationDisabled();
        const hasMuteRole = muteRole && member.roles.cache.has(muteRole.id);
        
        if (!hasTimeout && !hasMuteRole) {
            return interaction.reply({ content: '❌ This member is not muted.', ephemeral: true });
        }
        
        try {
            let timeoutRemoved = false;
            let roleRemoved = false;
            
            // Step 1: Remove timeout if present
            if (hasTimeout) {
                await member.timeout(null, reason);
                timeoutRemoved = true;
                console.log(`Removed Discord timeout from ${target.tag}`);
            }
            
            // Step 2: Remove mute role if it exists
            if (hasMuteRole) {
                await member.roles.remove(muteRole, `Unmuted by ${interaction.user.tag}: ${reason}`);
                roleRemoved = true;
                console.log(`Removed mute role from ${target.tag}`);
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
            
            // Success embed with detailed status indication
            const statusIndicators = [];
            if (timeoutRemoved) statusIndicators.push('⏱️ Discord Timeout Removed');
            if (roleRemoved) statusIndicators.push('🔇 Mute Role Removed');
            
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Member Unmuted Successfully')
                .setDescription(`**${target}** has been unmuted`)
                .addFields(
                    { 
                        name: '👤 Member', 
                        value: `${target.tag}\n\`${target.id}\``, 
                        inline: true 
                    },
                    { 
                        name: '👮 Moderator', 
                        value: `${interaction.user.tag}\n\`${interaction.user.id}\``, 
                        inline: true 
                    },
                    { 
                        name: '📝 Reason', 
                        value: reason, 
                        inline: false 
                    },
                    {
                        name: '🔧 Actions Performed',
                        value: statusIndicators.length > 0 ? statusIndicators.join('\n') : 'No mute found to remove',
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: `Unmuted by ${interaction.user.tag}`, 
                    iconURL: interaction.user.displayAvatarURL() 
                });
            
            await interaction.editReply({ embeds: [successEmbed] });
            
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
