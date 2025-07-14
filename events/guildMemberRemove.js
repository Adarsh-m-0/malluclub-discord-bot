const { Events, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const UserRoles = require('../models/UserRoles');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        const { guild, user } = member;
        
        try {
            // Save user roles before they leave
            await saveUserRoles(member);
            
            // Update user database
            await User.findOneAndUpdate(
                { userId: user.id },
                { 
                    lastSeen: new Date(),
                    leftServer: new Date()
                }
            );
            
            // Log to logging channel
            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('📤 Member Left')
                        .setDescription(`${user} has left the server`)
                        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: 'User', value: `${user.tag}`, inline: true },
                            { name: 'ID', value: user.id, inline: true },
                            { name: 'Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : 'Unknown', inline: true },
                            { name: 'Member Count', value: `${guild.memberCount}`, inline: true },
                            { name: 'Roles Saved', value: `${member.roles.cache.size - 1} roles`, inline: true }
                        )
                        .setFooter({ text: 'Member Left • Roles saved for return' })
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
        } catch (error) {
            console.error('Error in guildMemberRemove event:', error);
        }
    },
};

async function saveUserRoles(member) {
    try {
        const { user, guild } = member;
        
        // Get current roles (exclude @everyone)
        const userRoles = member.roles.cache
            .filter(role => role.id !== guild.id)
            .map(role => ({
                roleId: role.id,
                roleName: role.name,
                assignedAt: new Date(),
                assignedBy: 'System',
                isAutoRole: role.id === process.env.AUTO_ROLE_ID,
                isVoiceRole: ['Voice Newcomer', 'Voice Regular', 'Voice Enthusiast', 'Voice Expert', 'Voice Master', 'Voice Legend'].includes(role.name),
                level: getVoiceLevelFromRole(role.name)
            }));
        
        if (userRoles.length === 0) {
            console.log(`No roles to save for ${user.tag}`);
            return;
        }
        
        // Save or update user roles
        await UserRoles.findOneAndUpdate(
            { userId: user.id, guildId: guild.id },
            {
                userId: user.id,
                guildId: guild.id,
                username: user.username,
                roles: userRoles,
                lastSeen: new Date(),
                leftServer: new Date(),
                $inc: { rejoinCount: 0 } // Don't increment on leave, only on rejoin
            },
            { upsert: true, new: true }
        );
        
        console.log(`✅ Saved ${userRoles.length} roles for ${user.tag}`);
        
    } catch (error) {
        console.error('Error saving user roles:', error);
    }
}

function getVoiceLevelFromRole(roleName) {
    const voiceLevels = {
        'Voice Newcomer': 5,
        'Voice Regular': 10,
        'Voice Enthusiast': 20,
        'Voice Expert': 35,
        'Voice Master': 50,
        'Voice Legend': 75
    };
    return voiceLevels[roleName] || null;
}
