const User = require('../models/User');
const VcActiveManager = require('./VcActiveManager');

class XPManager {
    constructor() {
        this.voiceUsers = new Map(); // Track users in voice channels
        this.xpInterval = 60000; // 1 minute in milliseconds
        this.minVoiceTime = 30000; // Minimum 30 seconds in voice to start earning XP
        this.minUsersForXP = 2; // Minimum users in voice channel to earn XP (changed to 2 for fairness)
        this.maxXPPerHour = 300; // Maximum XP per hour to prevent farming (increased for new rates)
        this.rateLimitWindow = 60000; // 1 minute rate limit window
        this.userRateLimits = new Map(); // Track user rate limits
        
        // Initialize VC active manager
        this.vcActiveManager = new VcActiveManager();
        
        // XP rates based on voice state
        this.xpRates = {
            muted: 1,      // 1 XP for muted users
            talking: 2,    // 2 XP for talking users (unmuted)
            streaming: 3,  // 3 XP for streaming users
            camera: 5      // 5 XP for users with camera on
        };
        
        // Start cleanup interval
        this.startCleanupInterval();
    }

    // Calculate level from XP (200 XP per level, matches chat XP)
    calculateLevel(xp) {
        return Math.floor(xp / 200);
    }

    // Calculate XP needed for next level
    calculateXPForLevel(level) {
        return 200 * level;
    }

    // Calculate XP needed for next level from current XP
    calculateXPToNextLevel(currentXP) {
        const currentLevel = this.calculateLevel(currentXP);
        const nextLevelXP = this.calculateXPForLevel(currentLevel + 1);
        return nextLevelXP - currentXP;
    }

    // Check if user is rate limited
    isRateLimited(userId, guildId) {
        const key = `${userId}_${guildId}`;
        const rateLimitData = this.userRateLimits.get(key);
        
        if (!rateLimitData) {
            return false;
        }

        const now = Date.now();
        const timeSinceLastReset = now - rateLimitData.lastReset;
        
        if (timeSinceLastReset >= 3600000) { // 1 hour
            // Reset hourly XP count
            rateLimitData.hourlyXP = 0;
            rateLimitData.lastReset = now;
        }

        return rateLimitData.hourlyXP >= this.maxXPPerHour;
    }

    // Update rate limit for user
    updateRateLimit(userId, guildId, xpAmount) {
        const key = `${userId}_${guildId}`;
        const now = Date.now();
        
        if (!this.userRateLimits.has(key)) {
            this.userRateLimits.set(key, {
                hourlyXP: 0,
                lastReset: now
            });
        }
        
        const rateLimitData = this.userRateLimits.get(key);
        rateLimitData.hourlyXP += xpAmount;
    }

    // Check if voice channel is valid for XP earning
    async isValidVoiceChannel(voiceChannel, userId) {
        if (!voiceChannel) return false;
        
        // Check if it's an AFK channel
        if (voiceChannel.guild.afkChannelId === voiceChannel.id) {
            // // // console.log(`User ${userId} is in AFK channel, not awarding XP`);
            return false;
        }
        
        // Check if user has speak permission
        const member = voiceChannel.guild.members.cache.get(userId);
        if (!member || !voiceChannel.permissionsFor(member).has('Speak')) {
            // // // console.log(`User ${userId} doesn't have speak permission in channel ${voiceChannel.name}`);
            return false;
        }
        
        // Check if there are enough users in the channel
        const nonBotMembers = voiceChannel.members.filter(member => !member.user.bot);
        if (nonBotMembers.size < this.minUsersForXP) {
            // // // console.log(`Not enough users in channel ${voiceChannel.name} (${nonBotMembers.size}/${this.minUsersForXP})`);
            return false;
        }
        
        return true;
    }

    // Calculate XP amount based on voice state
    calculateXPAmount(voiceState) {
        // No XP if deafened or self-muted
        if (voiceState && (voiceState.selfDeaf || voiceState.deaf || voiceState.selfMute)) {
            return 0;
        }
        // Highest priority: Camera on
        if (voiceState && voiceState.selfVideo) {
            return this.xpRates.camera;
        }
        // Second priority: Streaming
        if (voiceState && voiceState.streaming) {
            return this.xpRates.streaming;
        }
        // Third priority: Talking (unmuted)
        if (voiceState && !voiceState.mute && !voiceState.deaf && !voiceState.selfMute && !voiceState.selfDeaf) {
            return this.xpRates.talking;
        }
        // Default: Muted users (but not self-muted/deafened)
        return this.xpRates.muted;
    }

    // Start tracking user in voice channel
    async startVoiceTracking(userId, guildId, voiceChannel = null, voiceState = null) {
        try {
            const key = `${userId}_${guildId}`;
            
            // Don't start if already tracking
            if (this.voiceUsers.has(key)) {
                // // console.log(`Already tracking user ${userId} in guild ${guildId}`);
                return;
            }

            // Validate voice channel
            if (voiceChannel && !(await this.isValidVoiceChannel(voiceChannel, userId))) {
                // // console.log(`Voice channel ${voiceChannel.name} is not valid for XP earning`);
                return;
            }

            // // console.log(`Starting XP tracking for user ${userId} in guild ${guildId}`);

            // Calculate initial XP amount
            const xpAmount = this.calculateXPAmount(voiceState);

            // Start tracking
            this.voiceUsers.set(key, {
                userId,
                guildId,
                startTime: Date.now(),
                lastXPTime: Date.now(),
                channelId: voiceChannel?.id,
                currentXPAmount: xpAmount,
                voiceState: voiceState,
                interval: setInterval(async () => {
                    // Get current voice state from the tracker (updated by updateVoiceState)
                    const currentTracker = this.voiceUsers.get(key);
                    if (currentTracker) {
                        await this.awardVoiceXP(userId, guildId, 1, voiceChannel, currentTracker.voiceState);
                    }
                }, this.xpInterval)
            });

        } catch (error) {
            console.error('Error starting voice tracking:', error);
        }
    }

    // Stop tracking user in voice channel
    async stopVoiceTracking(userId, guildId) {
        try {
            const key = `${userId}_${guildId}`;
            const tracker = this.voiceUsers.get(key);

            if (tracker) {
                // // console.log(`Stopping XP tracking for user ${userId} in guild ${guildId}`);
                
                clearInterval(tracker.interval);
                this.voiceUsers.delete(key);

                // Calculate total time spent and award final XP
                const timeSpent = Date.now() - tracker.startTime;
                
                // Only award XP if they were in voice for at least minimum time
                if (timeSpent >= this.minVoiceTime) {
                    const minutesSpent = Math.floor(timeSpent / this.xpInterval);
                    
                    if (minutesSpent > 0) {
                        // // console.log(`Awarding ${minutesSpent} XP for ${timeSpent}ms voice time`);
                        await this.awardVoiceXP(userId, guildId, minutesSpent);
                    }
                }
            } else {
                // // console.log(`No tracker found for user ${userId} in guild ${guildId}`);
            }
        } catch (error) {
            console.error('Error stopping voice tracking:', error);
        }
    }

    // Update voice state for a tracked user
    updateVoiceState(userId, guildId, newVoiceState) {
        try {
            const key = `${userId}_${guildId}`;
            const tracker = this.voiceUsers.get(key);

            if (tracker) {
                // // console.log(`Updating voice state for user ${userId} in guild ${guildId}`);
                
                // Update the voice state in the tracker
                tracker.voiceState = newVoiceState;
                
                // Recalculate XP amount based on new state
                const newXPAmount = this.calculateXPAmount(newVoiceState);
                tracker.currentXPAmount = newXPAmount;
                
                // // console.log(`Updated XP rate for user ${userId}: ${newXPAmount} XP/minute`);
                
                // Update the tracker
                this.voiceUsers.set(key, tracker);
                
                return true;
            } else {
                // // console.log(`No tracker found for user ${userId} in guild ${guildId} to update voice state`);
                return false;
            }
        } catch (error) {
            console.error('Error updating voice state:', error);
            return false;
        }
    }

    // Get current XP rate for a user
    getCurrentXPRate(userId, guildId) {
        const key = `${userId}_${guildId}`;
        const tracker = this.voiceUsers.get(key);
        return tracker ? tracker.currentXPAmount : 0;
    }

    // Award XP for voice activity
    async awardVoiceXP(userId, guildId, minutes = 1, voiceChannel = null, voiceState = null) {
        try {
            // Check rate limiting
            if (this.isRateLimited(userId, guildId)) {
                // // console.log(`User ${userId} is rate limited, not awarding XP`);
                return null;
            }

            // Re-validate voice channel if provided
            if (voiceChannel && !(await this.isValidVoiceChannel(voiceChannel, userId))) {
                // // console.log(`Voice channel no longer valid for XP earning, stopping tracking`);
                await this.stopVoiceTracking(userId, guildId);
                return null;
            }

            // Get current XP amount from tracker or calculate new one
            const key = `${userId}_${guildId}`;
            const tracker = this.voiceUsers.get(key);
            
            let xpAmount;
            if (tracker && tracker.voiceState) {
                xpAmount = this.calculateXPAmount(tracker.voiceState);
            } else if (voiceState) {
                xpAmount = this.calculateXPAmount(voiceState);
            } else {
                xpAmount = this.xpRates.muted; // Default to muted rate
            }

            const totalXP = xpAmount * minutes;
            
            // // console.log(`Awarding ${totalXP} XP to user ${userId} for ${minutes} minutes of voice activity`);
            
            // Update rate limit
            this.updateRateLimit(userId, guildId, totalXP);
            
            const result = await this.addXP(userId, guildId, totalXP, minutes);
            
            if (result && result.leveledUp) {
                // // console.log(`User ${userId} leveled up from ${result.oldLevel} to ${result.newLevel}!`);
            }
            
            return result;
        } catch (error) {
            console.error('Error awarding voice XP:', error);
            return null;
        }
    }

    // Add XP to user
    async addXP(userId, guildId, xpAmount, voiceMinutes = 0) {
        try {
            // Use findOneAndUpdate with upsert to handle duplicates safely
            let result = await User.findOne({ userId, guildId });
            const now = Date.now();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (!result) {
                result = new User({
                    userId,
                    guildId,
                    username: 'Unknown User',
                    level: 0,
                    joinedAt: new Date(),
                    dailyXP: 0,
                    dailyXPReset: today
                });
            }
            if (!result.dailyXPReset || result.dailyXPReset < today) {
                result.dailyXP = 0;
                result.dailyXPReset = today;
            }
            const DAILY_XP_CAP = 1000;
            if (voiceMinutes > 0 && result.dailyXP >= DAILY_XP_CAP) return null; // Cap reached for VC
            // Cap XP to not exceed daily limit
            let xpToAward = xpAmount;
            if (voiceMinutes > 0) {
                xpToAward = Math.min(xpAmount, DAILY_XP_CAP - result.dailyXP);
            }
            result.xp += xpToAward;
            if (voiceMinutes > 0) {
                result.vcXP = (result.vcXP || 0) + xpToAward;
                result.voiceTime += voiceMinutes;
                result.dailyXP += xpToAward;
                result.lastVCXP = now;
                result.lastXPTimestamp = now;
            }
            result.lastSeen = new Date();

            // Calculate and update level
            const newLevel = this.calculateLevel(result.xp);
            const oldLevel = result.level;

            if (newLevel !== oldLevel) {
                result.level = newLevel;
                await result.save();
            } else {
                await result.save();
            }

            // Update daily voice activity for VC active system
            if (voiceMinutes > 0) {
                try {
                    await this.vcActiveManager.updateUserActivity(
                        userId,
                        guildId,
                        result.username,
                        voiceMinutes,
                        xpAmount
                    );
                } catch (error) {
                    console.error('Error updating VC active system:', error);
                }
            }

            // Return level up info
            return {
                xpGained: xpToAward,
                totalXP: result.xp,
                oldLevel,
                newLevel: result.level,
                leveledUp: result.level > oldLevel
            };

        } catch (error) {
            console.error('Error adding XP:', error);
            
            // If it's still a duplicate key error, try to find and update the existing user
            if (error.code === 11000) {
                try {
                    // // console.log(`Attempting to update existing user ${userId} in guild ${guildId}`);
                    const existingUser = await User.findOne({ userId, guildId });
                    
                    if (existingUser) {
                        const oldLevel = existingUser.level;
                        const oldXP = existingUser.xp;
                        
                        existingUser.xp += xpAmount;
                        existingUser.level = this.calculateLevel(existingUser.xp);
                        existingUser.voiceTime += voiceMinutes;
                        existingUser.lastSeen = new Date();
                        
                        await existingUser.save();
                        
                        // // console.log(`User ${userId}: XP ${oldXP} -> ${existingUser.xp}, Level ${oldLevel} -> ${existingUser.level}`);
                        
                        return {
                            xpGained: xpAmount,
                            totalXP: existingUser.xp,
                            oldLevel,
                            newLevel: existingUser.level,
                            leveledUp: existingUser.level > oldLevel
                        };
                    }
                } catch (retryError) {
                    console.error('Error in retry attempt:', retryError);
                }
            }
            
            return null;
        }
    }

    // Get user's XP data
    async getUserXP(userId, guildId) {
        try {
            const user = await User.findOne({ userId, guildId });
            
            if (!user) {
                return {
                    xp: 0,
                    level: 0,
                    voiceTime: 0,
                    xpToNextLevel: 100
                };
            }

            return {
                xp: user.xp,
                level: user.level,
                voiceTime: user.voiceTime,
                xpToNextLevel: this.calculateXPToNextLevel(user.xp)
            };

        } catch (error) {
            console.error('Error getting user XP:', error);
            return {
                xp: 0,
                level: 0,
                voiceTime: 0,
                xpToNextLevel: 100
            };
        }
    }

    // Get leaderboard
    async getLeaderboard(guildId, limit = 10) {
        try {
            const users = await User.find({ guildId })
                .sort({ xp: -1 })
                .limit(limit);

            return users.map((user, index) => ({
                rank: index + 1,
                userId: user.userId,
                xp: user.xp,
                level: user.level,
                voiceTime: user.voiceTime,
                chatXP: user.chatXP || 0,
                vcXP: user.vcXP || 0
            }));

        } catch (error) {
            console.error('Error getting leaderboard:', error);
            return [];
        }
    }

    // Reset user's XP
    async resetUserXP(userId, guildId) {
        try {
            const user = await User.findOne({ userId, guildId });
            
            if (!user) {
                return false;
            }

            user.xp = 0;
            user.level = 0;
            await user.save();

            return true;

        } catch (error) {
            console.error('Error resetting user XP:', error);
            return false;
        }
    }

    // Get user's rank in guild
    async getUserRank(userId, guildId) {
        try {
            const user = await User.findOne({ userId, guildId });
            
            if (!user) {
                return null;
            }

            const rank = await User.countDocuments({ 
                guildId, 
                xp: { $gt: user.xp } 
            }) + 1;

            return {
                rank,
                xp: user.xp,
                level: user.level
            };

        } catch (error) {
            console.error('Error getting user rank:', error);
            return null;
        }
    }

    // Format time for display
    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    }

    // Get user's detailed stats including tracking status
    async getUserStats(userId, guildId) {
        try {
            const user = await User.findOne({ userId, guildId });
            
            if (!user) {
                return {
                    xp: 0,
                    level: 0,
                    voiceTime: 0,
                    xpToNextLevel: 100,
                    rank: null,
                    isTracked: this.isUserTracked(userId, guildId)
                };
            }

            // Get user's rank
            const rank = await User.countDocuments({ 
                guildId, 
                xp: { $gt: user.xp } 
            }) + 1;

            return {
                xp: user.xp,
                level: user.level,
                voiceTime: user.voiceTime,
                chatXP: user.chatXP || 0,
                vcXP: user.vcXP || 0,
                xpToNextLevel: this.calculateXPToNextLevel(user.xp),
                rank: rank,
                isTracked: this.isUserTracked(userId, guildId)
            };

        } catch (error) {
            console.error('Error getting user stats:', error);
            return {
                xp: 0,
                level: 0,
                voiceTime: 0,
                xpToNextLevel: 100,
                rank: null,
                isTracked: false
            };
        }
    }

    // Check if user is currently being tracked
    isUserTracked(userId, guildId) {
        const key = `${userId}_${guildId}`;
        return this.voiceUsers.has(key);
    }

    // Get count of currently tracked users
    getTrackedUsersCount() {
        return this.voiceUsers.size;
    }

    // Get all tracked users info
    getTrackedUsers() {
        const users = [];
        for (const [key, tracker] of this.voiceUsers) {
            users.push({
                userId: tracker.userId,
                guildId: tracker.guildId,
                channelId: tracker.channelId,
                currentXPRate: tracker.currentXPAmount,
                startTime: tracker.startTime,
                trackingDuration: Date.now() - tracker.startTime
            });
        }
        return users;
    }

    // Clear all tracking (for shutdown)
    clearAllTracking() {
        // // console.log('Clearing all voice tracking...');
        for (const [key, tracker] of this.voiceUsers) {
            clearInterval(tracker.interval);
        }
        this.voiceUsers.clear();
        // // console.log('All voice tracking cleared');
    }

    // Clean up old rate limit data
    cleanupRateLimits() {
        const now = Date.now();
        for (const [key, data] of this.userRateLimits) {
            if (now - data.lastReset > 24 * 60 * 60 * 1000) { // 24 hours
                this.userRateLimits.delete(key);
            }
        }
    }

    // Initialize cleanup interval
    startCleanupInterval() {
        setInterval(() => {
            this.cleanupRateLimits();
        }, 60 * 60 * 1000); // Clean up every hour
    }
}

module.exports = new XPManager();
