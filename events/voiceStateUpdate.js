const { Events } = require('discord.js');
const VoiceActivity = require('../models/VoiceActivity');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const userId = newState.id || oldState.id;
        const guildId = newState.guild.id;
        const member = newState.member || oldState.member;
        
        // Skip if user is a bot
        if (member.user.bot) return;
        
        try {
            let userActivity = await VoiceActivity.findOne({ userId, guildId });
            
            // Create new activity record if doesn't exist
            if (!userActivity) {
                userActivity = new VoiceActivity({
                    userId,
                    guildId,
                    username: member.user.username
                });
                await userActivity.save();
            }
            
            // User joined a voice channel
            if (!oldState.channelId && newState.channelId) {
                await handleVoiceJoin(userActivity, newState);
            }
            
            // User left a voice channel
            else if (oldState.channelId && !newState.channelId) {
                await handleVoiceLeave(userActivity, oldState);
            }
            
            // User switched voice channels
            else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                await handleVoiceSwitch(userActivity, oldState, newState);
            }
            
        } catch (error) {
            console.error('Voice state update error:', error);
        }
    }
};

async function handleVoiceJoin(userActivity, voiceState) {
    // Update current session
    userActivity.currentSession = {
        joinTime: new Date(),
        channelId: voiceState.channelId,
        isActive: true
    };
    
    await userActivity.save();
    
    // Log join activity
    console.log(`🎤 ${userActivity.username} joined voice channel: ${voiceState.channel.name}`);
}

async function handleVoiceLeave(userActivity, voiceState) {
    if (!userActivity.currentSession.isActive) return;
    
    const joinTime = userActivity.currentSession.joinTime;
    const leaveTime = new Date();
    const duration = leaveTime - joinTime;
    
    // Only award XP if user was in voice for at least 30 seconds
    if (duration >= 30000) {
        await userActivity.addVoiceSession(
            voiceState.channelId,
            voiceState.channel.name,
            duration
        );
        
        // Check for level up and achievements
        await checkLevelUp(userActivity, voiceState);
        await checkAchievements(userActivity, voiceState);
        
        console.log(`🎤 ${userActivity.username} left voice channel after ${Math.floor(duration / 60000)} minutes (+${VoiceActivity.calculateXP(duration)} XP)`);
    }
    
    // Clear current session
    userActivity.currentSession.isActive = false;
    await userActivity.save();
}

async function handleVoiceSwitch(userActivity, oldState, newState) {
    // End current session and start new one
    await handleVoiceLeave(userActivity, oldState);
    await handleVoiceJoin(userActivity, newState);
}

async function checkLevelUp(userActivity, voiceState) {
    const oldLevel = userActivity.level;
    const newLevel = VoiceActivity.calculateLevel(userActivity.voiceXP);
    
    if (newLevel > oldLevel) {
        // Send level up message
        const channel = voiceState.guild.channels.cache.find(
            ch => ch.name.includes('general') || ch.name.includes('chat')
        );
        
        if (channel) {
            const { EmbedBuilder } = require('discord.js');
            
            const levelUpEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎉 Level Up!')
                .setDescription(`<@${userActivity.userId}> reached **Level ${newLevel}**!`)
                .addFields(
                    { name: '🎤 Voice XP', value: `${userActivity.voiceXP}`, inline: true },
                    { name: '⏱️ Total Voice Time', value: formatTime(userActivity.totalVoiceTime), inline: true },
                    { name: '🔥 Daily Streak', value: `${userActivity.dailyStats.streak} days`, inline: true }
                )
                .setThumbnail(voiceState.member.user.displayAvatarURL())
                .setTimestamp();
            
            await channel.send({ embeds: [levelUpEmbed] });
        }
        
        // Check for role rewards
        await assignLevelRoles(userActivity, voiceState);
    }
}

async function checkAchievements(userActivity, voiceState) {
    const achievements = [];
    
    // First voice session
    if (userActivity.sessions.length === 1) {
        achievements.push({
            name: 'First Steps',
            description: 'Joined your first voice channel!',
            unlockedAt: new Date()
        });
    }
    
    // 1 hour total voice time
    if (userActivity.totalVoiceTime >= 3600000 && !userActivity.achievements.some(a => a.name === 'Chatterbox')) {
        achievements.push({
            name: 'Chatterbox',
            description: 'Spent 1 hour total in voice channels!',
            unlockedAt: new Date()
        });
    }
    
    // 10 hour total voice time
    if (userActivity.totalVoiceTime >= 36000000 && !userActivity.achievements.some(a => a.name === 'Voice Veteran')) {
        achievements.push({
            name: 'Voice Veteran',
            description: 'Spent 10 hours total in voice channels!',
            unlockedAt: new Date()
        });
    }
    
    // 7-day streak
    if (userActivity.dailyStats.streak >= 7 && !userActivity.achievements.some(a => a.name === 'Dedicated')) {
        achievements.push({
            name: 'Dedicated',
            description: 'Maintained a 7-day voice activity streak!',
            unlockedAt: new Date()
        });
    }
    
    if (achievements.length > 0) {
        userActivity.achievements.push(...achievements);
        await userActivity.save();
        
        // Send achievement notification
        const channel = voiceState.guild.channels.cache.find(
            ch => ch.name.includes('general') || ch.name.includes('chat')
        );
        
        if (channel) {
            for (const achievement of achievements) {
                const { EmbedBuilder } = require('discord.js');
                
                const achievementEmbed = new EmbedBuilder()
                    .setColor(0xFFD700)
                    .setTitle('🏆 Achievement Unlocked!')
                    .setDescription(`<@${userActivity.userId}> earned: **${achievement.name}**`)
                    .addFields({ name: 'Description', value: achievement.description })
                    .setThumbnail(voiceState.member.user.displayAvatarURL())
                    .setTimestamp();
                
                await channel.send({ embeds: [achievementEmbed] });
            }
        }
    }
}

async function assignLevelRoles(userActivity, voiceState) {
    const guild = voiceState.guild;
    const member = voiceState.member;
    const level = userActivity.level;
    
    // Define level-based roles (you can customize these)
    const levelRoles = {
        5: 'Voice Newcomer',
        10: 'Voice Regular',
        20: 'Voice Enthusiast',
        35: 'Voice Expert',
        50: 'Voice Master',
        75: 'Voice Legend'
    };
    
    for (const [requiredLevel, roleName] of Object.entries(levelRoles)) {
        if (level >= requiredLevel) {
            const role = guild.roles.cache.find(r => r.name === roleName);
            if (role && !member.roles.cache.has(role.id)) {
                try {
                    await member.roles.add(role);
                    console.log(`🎭 Assigned role ${roleName} to ${userActivity.username}`);
                } catch (error) {
                    console.error(`Failed to assign role ${roleName}:`, error);
                }
            }
        }
    }
}

function formatTime(milliseconds) {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}
