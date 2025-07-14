const { Events } = require('discord.js');
const VoiceSession = require('../models/VoiceSession');
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
            startedAt: startTime
        });
        
        // Create database session
        const session = new VoiceSession({
            userId,
            guildId,
            channelId,
            startedAt: startTime
        });
        
        await session.save();
        
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
        
        if (cachedSession) {
            const endTime = new Date();
            const duration = endTime - cachedSession.startedAt;
            const xpEarned = Math.floor(duration / (1000 * 60)); // 1 XP per minute
            
            // Update the database session
            await VoiceSession.findOneAndUpdate(
                {
                    userId,
                    guildId,
                    startedAt: cachedSession.startedAt,
                    endedAt: null
                },
                {
                    endedAt: endTime,
                    duration: duration,
                    xpEarned: xpEarned
                }
            );
            
            // Remove from cache
            activeVoiceSessions.delete(sessionKey);
            
            logger.voice('User left voice channel', {
                userId,
                guildId,
                channelId,
                username: member.user.tag,
                duration: duration,
                xpEarned: xpEarned
            });
            
            // Update user's total XP
            await updateUserVoiceXP(userId, guildId, xpEarned);
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
        
        // Start a new session in the new channel
        await handleVoiceJoin(userId, guildId, newChannelId, member);
        
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

async function updateUserVoiceXP(userId, guildId, xpEarned) {
    try {
        const User = require('../models/User');
        
        await User.findOneAndUpdate(
            { userId, guildId },
            { 
                $inc: { 
                    'voice.totalXP': xpEarned,
                    'voice.totalMinutes': Math.floor(xpEarned) // Since 1 XP = 1 minute
                },
                $set: {
                    'voice.lastActivity': new Date()
                }
            },
            { upsert: true, new: true }
        );
        
    } catch (error) {
        logger.logError(error, {
            context: 'Update user voice XP',
            userId,
            guildId,
            xpEarned
        });
    }
}
