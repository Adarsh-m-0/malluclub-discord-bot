const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');
const ModerationLog = require('../../models/ModerationLog');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a member in the server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to mute')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration of the mute (e.g., 10m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for muting')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const member = await interaction.guild.members.fetch(target.id);
        
        if (!member) {
            return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
        }
        
        if (member.id === interaction.user.id) {
            return interaction.reply({ content: '❌ You cannot mute yourself.', ephemeral: true });
        }
        
        if (member.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: '❌ You cannot mute this member due to role hierarchy.', ephemeral: true });
        }
        
        if (!member.moderatable) {
            return interaction.reply({ content: '❌ I cannot mute this member.', ephemeral: true });
        }
        
        // Check if member is already muted
        const existingMuteRole = interaction.guild.roles.cache.find(role => role.name === 'Muted');
        const hasTimeout = member.isCommunicationDisabled();
        const hasMuteRole = existingMuteRole && member.roles.cache.has(existingMuteRole.id);
        
        if (hasTimeout || hasMuteRole) {
            return interaction.reply({ content: '❌ This member is already muted.', ephemeral: true });
        }
        
        // Parse duration
        const durationMs = parseDuration(duration);
        if (!durationMs) {
            return interaction.reply({ content: '❌ Invalid duration format. Use formats like: 10m, 1h, 1d', ephemeral: true });
        }
        
        if (durationMs > 2419200000) { // 28 days in milliseconds
            return interaction.reply({ content: '❌ Duration cannot exceed 28 days.', ephemeral: true });
        }
        
        try {
            const muteUntil = new Date(Date.now() + durationMs);
            
            // Primary method: Use Discord's built-in timeout (more reliable)
            await member.timeout(durationMs, reason);
            
            // Backup method: Also apply mute role for additional control and longer durations
            let muteRole = interaction.guild.roles.cache.find(role => role.name === 'Muted');
            if (!muteRole) {
                try {
                    muteRole = await createMuteRole(interaction.guild);
                } catch (roleError) {
                    console.log('Could not create mute role, using timeout only');
                }
            }
            
            // Add mute role as backup (especially useful for longer mutes)
            if (muteRole && !member.roles.cache.has(muteRole.id)) {
                try {
                    await member.roles.add(muteRole, `Muted by ${interaction.user.tag}: ${reason}`);
                } catch (roleError) {
                    console.log('Could not add mute role, timeout still active');
                }
            }
            
            // Update database
            await User.findOneAndUpdate(
                { userId: target.id },
                { 
                    userId: target.id,
                    username: target.username,
                    muteExpiration: muteUntil,
                    lastSeen: new Date()
                },
                { upsert: true }
            );
            
            // Log to database
            const modLog = new ModerationLog({
                userId: target.id,
                moderatorId: interaction.user.id,
                action: 'mute',
                reason: reason,
                duration: duration
            });
            await modLog.save();
            
            // DM the user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#ff6600')
                    .setTitle('🔇 You have been muted')
                    .setDescription(`You have been muted in **${interaction.guild.name}**`)
                    .addFields(
                        { name: 'Duration', value: duration, inline: true },
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Moderator', value: interaction.user.tag, inline: true },
                        { name: 'Expires', value: `<t:${Math.floor(muteUntil.getTime() / 1000)}:R>`, inline: true }
                    )
                    .setTimestamp();
                
                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('Could not send DM to user');
            }
            
            // Success embed with better status indication
            const muteMethodsUsed = [];
            if (member.isCommunicationDisabled()) muteMethodsUsed.push('Discord Timeout');
            if (muteRole && member.roles.cache.has(muteRole.id)) muteMethodsUsed.push('Mute Role');
            
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Member Muted')
                .setDescription(`${target.tag} has been muted`)
                .addFields(
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Duration', value: duration, inline: true },
                    { name: 'Methods', value: muteMethodsUsed.join(', ') || 'Timeout', inline: true },
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Expires', value: `<t:${Math.floor(muteUntil.getTime() / 1000)}:R>`, inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [successEmbed] });
            
            // Log to log channel
            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#ff6600')
                        .setTitle('🔇 Member Muted')
                        .setDescription(`${target} was muted by ${interaction.user}`)
                        .addFields(
                            { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                            { name: 'Duration', value: duration, inline: true },
                            { name: 'Reason', value: reason, inline: false },
                            { name: 'Expires', value: `<t:${Math.floor(muteUntil.getTime() / 1000)}:R>`, inline: true }
                        )
                        .setFooter({ text: 'Member Muted' })
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
        } catch (error) {
            console.error('Error muting member:', error);
            await interaction.reply({ content: '❌ An error occurred while muting the member.', ephemeral: true });
        }
    },
};

function parseDuration(duration) {
    const regex = /^(\d+)([smhd])$/;
    const match = duration.match(regex);
    
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

async function createMuteRole(guild) {
    try {
        console.log('Creating mute role...');
        
        // Create the mute role
        const muteRole = await guild.roles.create({
            name: 'Muted',
            color: '#6B6B6B',
            reason: 'Mute role for moderation',
            permissions: []
        });
        
        console.log(`Created mute role: ${muteRole.name}`);
        
        // Set permissions for all channels
        const channels = guild.channels.cache;
        
        for (const [channelId, channel] of channels) {
            try {
                if (channel.isTextBased()) {
                    // Text channels - deny sending messages, adding reactions, creating threads
                    await channel.permissionOverwrites.create(muteRole, {
                        SendMessages: false,
                        AddReactions: false,
                        CreatePublicThreads: false,
                        CreatePrivateThreads: false,
                        SendMessagesInThreads: false,
                        UseApplicationCommands: false
                    });
                } else if (channel.isVoiceBased()) {
                    // Voice channels - deny speaking and video
                    await channel.permissionOverwrites.create(muteRole, {
                        Speak: false,
                        Stream: false,
                        UseVAD: false
                    });
                }
                console.log(`Set permissions for ${channel.name}`);
            } catch (error) {
                console.error(`Error setting permissions for channel ${channel.name}:`, error);
            }
        }
        
        return muteRole;
    } catch (error) {
        console.error('Error creating mute role:', error);
        throw error;
    }
}
