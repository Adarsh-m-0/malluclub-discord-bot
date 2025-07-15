const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../models/User');
const UserRoles = require('../models/UserRoles');

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
            
            // Restore roles for returning members
            await handleReturningMember(member);
            
            // Auto-assign voice level roles based on existing data
            await handleVoiceLevelRoles(member);
            
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

async function handleVoiceLevelRoles(member) {
    try {
        const VoiceActivity = require('../models/VoiceActivity');
        
        // Check if user has existing voice activity data
        const voiceData = await VoiceActivity.findOne({
            userId: member.id,
            guildId: member.guild.id
        });
        
        if (voiceData && voiceData.level > 1) {
            // Define level-based roles
            const levelRoles = {
                5: 'Voice Newcomer',
                10: 'Voice Regular',
                20: 'Voice Enthusiast',
                35: 'Voice Expert',
                50: 'Voice Master',
                75: 'Voice Legend'
            };
            
            // Assign appropriate roles based on level
            for (const [requiredLevel, roleName] of Object.entries(levelRoles)) {
                if (voiceData.level >= requiredLevel) {
                    const role = member.guild.roles.cache.find(r => r.name === roleName);
                    if (role && !member.roles.cache.has(role.id)) {
                        try {
                            // Check bot permissions
                            const botMember = member.guild.members.me;
                            if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                                console.error('❌ Bot missing MANAGE_ROLES permission for voice roles');
                                continue;
                            }

                            // Check role hierarchy
                            if (role.position >= botMember.roles.highest.position) {
                                console.error(`❌ Cannot assign voice role ${roleName} - role position too high`);
                                continue;
                            }

                            await member.roles.add(role, `Voice level ${voiceData.level} role assignment`);
                            console.log(`✅ Assigned voice role ${roleName} to returning member ${member.user.tag}`);
                        } catch (error) {
                            console.error(`❌ Failed to assign voice role ${roleName}:`, error);
                            if (error.code === 50013) {
                                console.error('Missing permissions for voice role assignment');
                            } else if (error.code === 50001) {
                                console.error('Access denied for voice role assignment');
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error handling voice level roles:', error);
    }
}

async function handleReturningMember(member) {
    try {
        // Check if this user has saved roles
        const savedRoles = await UserRoles.findOne({
            userId: member.id,
            guildId: member.guild.id
        });
        
        if (!savedRoles || savedRoles.roles.length === 0) {
            console.log(`No saved roles found for ${member.user.tag}`);
            return;
        }
        
        // Update rejoin count
        savedRoles.rejoinCount += 1;
        savedRoles.lastSeen = new Date();
        savedRoles.leftServer = null;
        await savedRoles.save();
        
        console.log(`🔄 Restoring roles for returning member ${member.user.tag} (rejoin #${savedRoles.rejoinCount})`);
        
        let restoredCount = 0;
        let failedCount = 0;
        const restoredRoles = [];
        
        // Restore each role
        for (const savedRole of savedRoles.getRolesToRestore()) {
            try {
                const role = member.guild.roles.cache.get(savedRole.roleId);
                
                if (!role) {
                    console.log(`Role ${savedRole.roleName} no longer exists, skipping`);
                    continue;
                }
                
                // Check if user already has the role
                if (member.roles.cache.has(role.id)) {
                    continue;
                }
                
                // Check bot permissions and role hierarchy
                const botMember = member.guild.members.me;
                if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    console.log(`❌ Bot missing MANAGE_ROLES permission for role restoration`);
                    failedCount++;
                    continue;
                }

                if (role.position >= botMember.roles.highest.position) {
                    console.log(`❌ Cannot assign role ${role.name} - role position (${role.position}) >= bot highest (${botMember.roles.highest.position})`);
                    failedCount++;
                    continue;
                }

                if (role.managed) {
                    console.log(`❌ Cannot assign managed role ${role.name}`);
                    failedCount++;
                    continue;
                }
                
                // Assign the role
                try {
                    await member.roles.add(role, `Restored role for returning member (rejoin #${savedRoles.rejoinCount})`);
                    restoredRoles.push(role.name);
                    restoredCount++;
                    console.log(`✅ Restored role ${role.name} to ${member.user.tag}`);
                } catch (assignError) {
                    console.error(`❌ Failed to assign role ${role.name}:`, assignError);
                    if (assignError.code === 50013) {
                        console.error('Missing permissions for role assignment');
                    } else if (assignError.code === 50001) {
                        console.error('Access denied for role assignment');
                    }
                    failedCount++;
                }
                
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (error) {
                console.error(`Failed to restore role ${savedRole.roleName}:`, error);
                failedCount++;
            }
        }
        
        if (restoredCount > 0) {
            console.log(`✅ Restored ${restoredCount} roles for ${member.user.tag}: ${restoredRoles.join(', ')}`);
            
            // Send notification to log channel
            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = member.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const restoreEmbed = new EmbedBuilder()
                        .setColor(0x00AA00)
                        .setTitle('🔄 Roles Restored')
                        .setDescription(`Restored roles for returning member ${member.user}`)
                        .addFields(
                            { name: 'Member', value: `${member.user.tag}`, inline: true },
                            { name: 'Rejoin Count', value: `#${savedRoles.rejoinCount}`, inline: true },
                            { name: 'Roles Restored', value: `${restoredCount}`, inline: true },
                            { name: 'Restored Roles', value: restoredRoles.length > 0 ? restoredRoles.join(', ') : 'None', inline: false }
                        )
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [restoreEmbed] });
                }
            }
        }
        
    } catch (error) {
        console.error('Error handling returning member:', error);
    }
}
