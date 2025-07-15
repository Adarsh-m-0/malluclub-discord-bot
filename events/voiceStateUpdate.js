const { Events } = require('discord.js');
const VoiceActivity = require('../models/VoiceActivity');
const logger = require('../utils/logger');

// In-memory cache for active voice sessions
const activeVoiceSessions = new Map();

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const userId = newState.id || oldState.id;
        const guildId = newState.guild.id;
        const member = newState.member || oldState.member;
        
        // Skip if user is a bot
        if (member.user.bot) return;
        
        // Skip if user is deafened/muted (no XP for inactive users)
        const isDeafened = newState.deaf || newState.selfDeaf;
        const isMuted = newState.mute || newState.selfMute;
        
        try {
            // User joined a voice channel
            if (!oldState.channelId && newState.channelId) {
                await handleVoiceJoin(userId, guildId, newState.channelId, member);
            }
            
            // User left a voice channel
            else if (oldState.channelId && !newState.channelId) {
                await handleVoiceLeave(userId, guildId, oldState.channelId, member);
            }
            
            // User switched voice channels
            else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                await handleVoiceSwitch(userId, guildId, oldState.channelId, newState.channelId, member);
            }
            
            // User muted/unmuted or deafened/undeafened (update active session status)
            else if (oldState.channelId && newState.channelId && oldState.channelId === newState.channelId) {
                await handleVoiceStatusChange(userId, guildId, newState.channelId, member, isDeafened, isMuted);
            }
            
        } catch (error) {
            logger.logError(error, {
                context: 'Voice state update handler',
                userId: userId,
                guildId: guildId,
                oldChannelId: oldState.channelId,
                newChannelId: newState.channelId
            });
        }
    }
};

async function handleVoiceJoin(userId, guildId, channelId, member) {
    try {
        const sessionKey = `${userId}-${guildId}`;
        const startTime = new Date();
        
        // Cache the session start time
        activeVoiceSessions.set(sessionKey, {
            userId,
            guildId,
            channelId,
            startedAt: startTime,
            isActive: true
        });
        
        // Update or create user voice activity record
        await VoiceActivity.findOneAndUpdate(
            { userId, guildId },
            {
                $set: {
                    username: member.user.username,
                    'currentSession.joinTime': startTime,
                    'currentSession.channelId': channelId,
                    'currentSession.isActive': true
                }
            },
            { upsert: true, new: true }
        );
        
        logger.voice('User joined voice channel', {
            userId,
            guildId,
            channelId,
            username: member.user.tag
        });
        
    } catch (error) {
        logger.logError(error, {
            context: 'Voice join handler',
            userId,
            guildId,
            channelId
        });
    }
}

async function handleVoiceLeave(userId, guildId, channelId, member) {
    try {
        const sessionKey = `${userId}-${guildId}`;
        const cachedSession = activeVoiceSessions.get(sessionKey);
        
        if (cachedSession && cachedSession.isActive) {
            const endTime = new Date();
            const duration = endTime - cachedSession.startedAt; // Duration in milliseconds
            const minutesSpent = Math.floor(duration / (1000 * 60)); // Convert to minutes
            const xpEarned = Math.max(1, minutesSpent); // Minimum 1 XP, 1 XP per minute
            
            // Update user's voice activity
            const userActivity = await VoiceActivity.findOne({ userId, guildId });
            
            if (userActivity) {
                // Add session to history
                userActivity.sessions.push({
                    channelId: channelId,
                    channelName: member.guild.channels.cache.get(channelId)?.name || 'Unknown',
                    joinTime: cachedSession.startedAt,
                    leaveTime: endTime,
                    duration: duration,
                    xpEarned: xpEarned
                });
                
                // Update totals
                userActivity.totalVoiceTime += duration;
                userActivity.voiceXP += xpEarned;
                
                // Update daily stats
                const today = new Date().toDateString();
                if (!userActivity.dailyStats.lastActiveDate || 
                    userActivity.dailyStats.lastActiveDate.toDateString() !== today) {
                    userActivity.dailyStats.todayVoiceTime = duration;
                    userActivity.dailyStats.lastActiveDate = new Date();
                } else {
                    userActivity.dailyStats.todayVoiceTime += duration;
                }
                
                // Calculate new level
                const newLevel = calculateLevel(userActivity.voiceXP);
                if (newLevel > userActivity.level) {
                    userActivity.level = newLevel;
                    // Could emit level up event here
                }
                
                // Clear current session
                userActivity.currentSession = {
                    isActive: false
                };
                
                await userActivity.save();
                
                logger.voice('User left voice channel', {
                    userId,
                    guildId,
                    channelId,
                    username: member.user.tag,
                    duration: duration,
                    xpEarned: xpEarned,
                    newLevel: userActivity.level
                });
            }
            
            // Remove from cache
            activeVoiceSessions.delete(sessionKey);
        }
        
    } catch (error) {
        logger.logError(error, {
            context: 'Voice leave handler',
            userId,
            guildId,
            channelId
        });
    }
}

async function handleVoiceSwitch(userId, guildId, oldChannelId, newChannelId, member) {
    try {
        // End the old session
        await handleVoiceLeave(userId, guildId, oldChannelId, member);
        
        // Small delay to ensure database consistency
        setTimeout(async () => {
            // Start a new session in the new channel
            await handleVoiceJoin(userId, guildId, newChannelId, member);
        }, 100);
        
        logger.voice('User switched voice channels', {
            userId,
            guildId,
            oldChannelId,
            newChannelId,
            username: member.user.tag
        });
        
    } catch (error) {
        logger.logError(error, {
            context: 'Voice switch handler',
            userId,
            guildId,
            oldChannelId,
            newChannelId
        });
    }
}

async function handleVoiceStatusChange(userId, guildId, channelId, member, isDeafened, isMuted) {
    try {
        const sessionKey = `${userId}-${guildId}`;
        const cachedSession = activeVoiceSessions.get(sessionKey);
        
        if (cachedSession) {
            // Update session active status based on deaf/mute state
            const shouldBeActive = !isDeafened && !isMuted;
            
            if (cachedSession.isActive !== shouldBeActive) {
                cachedSession.isActive = shouldBeActive;
                activeVoiceSessions.set(sessionKey, cachedSession);
                
                // Update database
                await VoiceActivity.findOneAndUpdate(
                    { userId, guildId },
                    {
                        $set: {
                            'currentSession.isActive': shouldBeActive
                        }
                    }
                );
                
                logger.voice(`User ${shouldBeActive ? 'became active' : 'became inactive'} in voice`, {
                    userId,
                    guildId,
                    channelId,
                    username: member.user.tag,
                    isDeafened,
                    isMuted
                });
            }
        }
        
    } catch (error) {
        logger.logError(error, {
            context: 'Voice status change handler',
            userId,
            guildId,
            channelId
        });
    }
}

// Helper function to calculate level based on XP
function calculateLevel(xp) {
    // Level formula: level = floor(sqrt(xp / 100)) + 1
    // This means: Level 1: 0-99 XP, Level 2: 100-399 XP, Level 3: 400-899 XP, etc.
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

// Helper function to get XP required for next level
function getXPForNextLevel(level) {
    // Inverse of level formula: xp = (level - 1)^2 * 100
    return Math.pow(level - 1, 2) * 100;
}
