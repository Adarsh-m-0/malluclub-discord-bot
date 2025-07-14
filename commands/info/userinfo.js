const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Get information about a user')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to get information about')
                .setRequired(false)),
    
    async execute(interaction) {
        const target = interaction.options.getUser('target') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id);
        
        try {
            // Get user data from database
            const userData = await User.findOne({ userId: target.id });
            
            const userInfoEmbed = new EmbedBuilder()
                .setColor(member.displayHexColor || 0x5865F2)
                .setAuthor({ 
                    name: `User Profile: ${target.tag}`, 
                    iconURL: target.displayAvatarURL({ dynamic: true })
                })
                .setDescription(`� **Detailed information about ${target.toString()}**`)
                .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { 
                        name: '👤 Basic Info', 
                        value: `🏷️ **Username:** ${target.tag}\n🆔 **User ID:** \`${target.id}\`\n🤖 **Bot Account:** ${target.bot ? 'Yes ✅' : 'No ❌'}`, 
                        inline: true 
                    },
                    { 
                        name: '📅 Timestamps', 
                        value: `**Account Created:**\n<t:${Math.floor(target.createdTimestamp / 1000)}:F>\n<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, 
                        inline: true 
                    },
                    { 
                        name: '🏠 Server Info', 
                        value: `**Joined Server:**\n${member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>\n<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : 'Unknown'}\n\n**Nickname:** ${member.nickname || 'None'}`, 
                        inline: true 
                    }
                )
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag} • MalluClub Bot`, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setTimestamp();
            
            // Add roles information
            const roles = member.roles.cache
                .filter(role => role.name !== '@everyone')
                .sort((a, b) => b.position - a.position)
                .map(role => role.toString())
                .slice(0, 10);
            
            if (roles.length > 0) {
                userInfoEmbed.addFields({ 
                    name: `🎭 Roles (${member.roles.cache.size - 1})`, 
                    value: roles.join(', ') + (member.roles.cache.size > 11 ? '...' : ''), 
                    inline: false 
                });
            }
            
            // Add permissions information
            const keyPermissions = member.permissions.toArray()
                .filter(perm => ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'KickMembers', 'BanMembers', 'ModerateMembers'].includes(perm))
                .map(perm => perm.replace(/([A-Z])/g, ' $1').trim())
                .slice(0, 5);
            
            if (keyPermissions.length > 0) {
                userInfoEmbed.addFields({ 
                    name: '🔑 Key Permissions', 
                    value: keyPermissions.join(', '), 
                    inline: false 
                });
            }
            
            // Add database information if available
            if (userData) {
                const warnings = userData.warnings.length;
                const lastSeen = userData.lastSeen ? `<t:${Math.floor(userData.lastSeen.getTime() / 1000)}:R>` : 'Unknown';
                
                userInfoEmbed.addFields(
                    { name: '⚠️ Warnings', value: warnings.toString(), inline: true },
                    { name: '👀 Last Seen', value: lastSeen, inline: true }
                );
                
                if (userData.muteExpiration && userData.muteExpiration > new Date()) {
                    userInfoEmbed.addFields({ 
                        name: '🔇 Muted Until', 
                        value: `<t:${Math.floor(userData.muteExpiration.getTime() / 1000)}:R>`, 
                        inline: true 
                    });
                }
            }
            
            // Add status information
            const presence = member.presence;
            if (presence) {
                const statusEmoji = {
                    online: '🟢',
                    idle: '🟡',
                    dnd: '🔴',
                    offline: '⚫'
                };
                
                userInfoEmbed.addFields({ 
                    name: '📊 Status', 
                    value: `${statusEmoji[presence.status]} ${presence.status.charAt(0).toUpperCase() + presence.status.slice(1)}`, 
                    inline: true 
                });
            }
            
            await interaction.reply({ embeds: [userInfoEmbed] });
            
        } catch (error) {
            console.error('Error fetching user info:', error);
            await interaction.reply({ content: '❌ An error occurred while fetching user information.', ephemeral: true });
        }
    },
};
