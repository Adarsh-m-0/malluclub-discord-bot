const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../models/User');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const { guild, user } = member;
        
        try {
            // Save or update user to database
            await User.findOneAndUpdate(
                { userId: user.id },
                {
                    userId: user.id,
                    username: user.username,
                    joinedAt: new Date(),
                    lastSeen: new Date()
                },
                { upsert: true, new: true }
            );
            
            // Auto-assign role if configured
            await handleAutoRoleAssignment(member);
            
            // Send welcome message
            const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
            if (welcomeChannelId) {
                const welcomeChannel = guild.channels.cache.get(welcomeChannelId);
                if (welcomeChannel) {
                    const welcomeEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('🎉 Welcome to Mallu Club!')
                        .setDescription(`Hello ${user}! Welcome to our community! 🌟\n\nWe're excited to have you join our family. Feel free to explore the channels and connect with fellow members!`)
                        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: '👥 Member Count', value: `${guild.memberCount}`, inline: true },
                            { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                            { name: '🎯 What to do next?', value: '• Check out the rules\n• Introduce yourself\n• Join conversations\n• Have fun! 🎊', inline: false }
                        )
                        .setFooter({ text: 'Mallu Club', iconURL: guild.iconURL() })
                        .setTimestamp();
                    
                    await welcomeChannel.send({ embeds: [welcomeEmbed] });
                }
            }
            
            // Log to logging channel
            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('📥 Member Joined')
                        .setDescription(`${user} has joined the server`)
                        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: 'User', value: `${user.tag}`, inline: true },
                            { name: 'ID', value: user.id, inline: true },
                            { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                            { name: 'Member Count', value: `${guild.memberCount}`, inline: true }
                        )
                        .setFooter({ text: 'Member Joined' })
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
        }
    },
};

async function handleAutoRoleAssignment(member) {
    try {
        if (process.env.AUTO_ROLE_ID) {
            const autoRole = member.guild.roles.cache.get(process.env.AUTO_ROLE_ID);
            if (autoRole) {
                // Check bot permissions
                const botMember = member.guild.members.me;
                if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    console.error('❌ Bot missing MANAGE_ROLES permission for auto-role');
                    return;
                }

                // Check if bot can assign this role (hierarchy check)
                if (autoRole.position < botMember.roles.highest.position) {
                    // Check if role is managed
                    if (autoRole.managed) {
                        console.error(`❌ Cannot assign managed auto-role ${autoRole.name}`);
                        return;
                    }

                    await member.roles.add(autoRole, 'Auto-role assignment for new member');
                    console.log(`✅ Assigned auto-role ${autoRole.name} to ${member.user.tag}`);
                } else {
                    console.error(`❌ Cannot assign auto-role ${autoRole.name} - role position (${autoRole.position}) >= bot highest role position (${botMember.roles.highest.position})`);
                }
            } else {
                console.error('❌ Auto-role ID set but role not found');
                process.env.AUTO_ROLE_ID = ''; // Clear invalid role ID
            }
        }
    } catch (error) {
        console.error('❌ Error assigning auto-role:', error);
        if (error.code === 50013) {
            console.error('Missing permissions to assign auto-role');
        } else if (error.code === 50001) {
            console.error('Access denied for auto-role assignment');
        }
    }
}


