const XPManager = require('../utils/XPManager');
const logger = require('../utils/logger');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        try {
            const member = newState.member || oldState.member;
            const userId = member.id;
            const guildId = member.guild.id;

            // Ignore bot users
            if (member.user.bot) return;

            // Log the voice state change
            const oldChannel = oldState.channel;
            const newChannel = newState.channel;

            // User joined a voice channel
            if (!oldChannel && newChannel) {
                logger.info(`User ${member.user.tag} joined voice channel ${newChannel.name}`, {
                    category: 'voice',
                    userId: userId,
                    guildId: guildId,
                    channelId: newChannel.id,
                    channelType: newChannel.type,
                    isAFK: newChannel.id === newChannel.guild.afkChannelId,
                    mute: newState.mute,
                    deaf: newState.deaf,
                    selfMute: newState.selfMute,
                    selfDeaf: newState.selfDeaf,
                    streaming: newState.streaming,
                    video: newState.selfVideo,
                    action: 'join'
                });
                
                // Start tracking for all users (including muted ones)
                await XPManager.startVoiceTracking(userId, guildId, newChannel, newState);
            }
            // User left a voice channel
            else if (oldChannel && !newChannel) {
                logger.info(`User ${member.user.tag} left voice channel ${oldChannel.name}`, {
                    category: 'voice',
                    userId: userId,
                    guildId: guildId,
                    channelId: oldChannel.id,
                    action: 'leave'
                });
                
                await XPManager.stopVoiceTracking(userId, guildId);
            }
            // User switched voice channels
            else if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
                logger.info(`User ${member.user.tag} switched from ${oldChannel.name} to ${newChannel.name}`, {
                    category: 'voice',
                    userId: userId,
                    guildId: guildId,
                    oldChannelId: oldChannel.id,
                    newChannelId: newChannel.id,
                    oldChannelType: oldChannel.type,
                    newChannelType: newChannel.type,
                    isMovingToAFK: newChannel.id === newChannel.guild.afkChannelId,
                    action: 'switch'
                });
                
                // Always stop tracking in old channel
                await XPManager.stopVoiceTracking(userId, guildId);
                
                // Start tracking in new channel for all users
                await XPManager.startVoiceTracking(userId, guildId, newChannel, newState);
            }
            // User state changed (mute/unmute, deaf/undeaf, streaming, video)
            else if (oldChannel && newChannel && oldChannel.id === newChannel.id) {
                const wasMuted = oldState.mute || oldState.deaf || oldState.selfMute || oldState.selfDeaf;
                const isMuted = newState.mute || newState.deaf || newState.selfMute || newState.selfDeaf;
                
                // Check for any state changes that affect XP calculation
                const stateChanged = 
                    wasMuted !== isMuted ||
                    oldState.streaming !== newState.streaming ||
                    oldState.selfVideo !== newState.selfVideo;
                
                if (stateChanged) {
                    logger.info(`User ${member.user.tag} voice state changed, updating XP tracking`, {
                        category: 'voice',
                        userId: userId,
                        oldMute: wasMuted,
                        newMute: isMuted,
                        oldStreaming: oldState.streaming,
                        newStreaming: newState.streaming,
                        oldVideo: oldState.selfVideo,
                        newVideo: newState.selfVideo,
                        action: 'state_change'
                    });
                    
                    // Update voice state instead of restarting tracking
                    const updated = XPManager.updateVoiceState(userId, guildId, newState);
                    if (updated) {
                        const newRate = XPManager.getCurrentXPRate(userId, guildId);
                        logger.info(`Updated XP rate for ${member.user.tag}: ${newRate} XP/minute`, {
                            category: 'voice',
                            userId: userId,
                            newRate: newRate,
                            action: 'rate_updated'
                        });
                    } else {
                        // Fallback to restart tracking if update failed
                        logger.warn(`Failed to update voice state for ${member.user.tag}, restarting tracking`, {
                            category: 'voice',
                            userId: userId,
                            action: 'fallback_restart'
                        });
                        await XPManager.stopVoiceTracking(userId, guildId);
                        await XPManager.startVoiceTracking(userId, guildId, newChannel, newState);
                    }
                }
            }

            // Log current tracking status
            const trackedCount = XPManager.getTrackedUsersCount();
            logger.info(`Currently tracking ${trackedCount} users for XP`, {
                category: 'voice',
                trackedUsers: trackedCount,
                action: 'status_update'
            });

        } catch (error) {
            logger.logError(error, {
                category: 'voice',
                context: 'Error in voiceStateUpdate event',
                userId: oldState.member?.id || newState.member?.id,
                guildId: oldState.guild?.id || newState.guild?.id
            });
        }
    }
};
