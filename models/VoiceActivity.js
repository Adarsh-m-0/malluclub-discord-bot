const mongoose = require('mongoose');

const voiceActivitySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    guildId: {
        type: String,
        required: true,
        index: true
    },
    username: {
        type: String,
        required: true
    },
    totalVoiceTime: {
        type: Number,
        default: 0 // Total time in milliseconds
    },
    voiceXP: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 1
    },
    currentSession: {
        joinTime: Date,
        channelId: String,
        isActive: {
            type: Boolean,
            default: false
        }
    },
    sessions: [{
        channelId: String,
        channelName: String,
        joinTime: Date,
        leaveTime: Date,
        duration: Number, // in milliseconds
        xpEarned: Number
    }],
    dailyStats: {
        lastActiveDate: Date,
        todayVoiceTime: {
            type: Number,
            default: 0
        },
        streak: {
            type: Number,
            default: 0
        }
    },
    achievements: [{
        name: String,
        unlockedAt: Date,
        description: String
    }],
    lastXPUpdate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
voiceActivitySchema.index({ guildId: 1, voiceXP: -1 });
voiceActivitySchema.index({ guildId: 1, totalVoiceTime: -1 });

// Static method to calculate XP from time
voiceActivitySchema.statics.calculateXP = function(timeInMs) {
    // 1 XP per minute in voice channel
    const minutes = Math.floor(timeInMs / (1000 * 60));
    return minutes;
};

// Static method to calculate level from XP
voiceActivitySchema.statics.calculateLevel = function(xp) {
    // Level formula: level = floor(sqrt(xp/100)) + 1
    // Level 1: 0-99 XP, Level 2: 100-399 XP, Level 3: 400-899 XP, etc.
    return Math.floor(Math.sqrt(xp / 100)) + 1;
};

// Static method to get XP needed for next level
voiceActivitySchema.statics.getXPForNextLevel = function(currentLevel) {
    const nextLevel = currentLevel + 1;
    return Math.pow(nextLevel - 1, 2) * 100;
};

// Instance method to add voice session
voiceActivitySchema.methods.addVoiceSession = function(channelId, channelName, duration) {
    const xpEarned = this.constructor.calculateXP(duration);
    
    this.sessions.push({
        channelId,
        channelName,
        joinTime: new Date(Date.now() - duration),
        leaveTime: new Date(),
        duration,
        xpEarned
    });
    
    this.totalVoiceTime += duration;
    this.voiceXP += xpEarned;
    this.level = this.constructor.calculateLevel(this.voiceXP);
    this.lastXPUpdate = new Date();
    
    // Update daily stats
    const today = new Date().toDateString();
    const lastActive = this.dailyStats.lastActiveDate?.toDateString();
    
    if (today === lastActive) {
        this.dailyStats.todayVoiceTime += duration;
    } else {
        if (lastActive && new Date(lastActive).getTime() === new Date(today).getTime() - 86400000) {
            this.dailyStats.streak += 1;
        } else {
            this.dailyStats.streak = 1;
        }
        this.dailyStats.lastActiveDate = new Date();
        this.dailyStats.todayVoiceTime = duration;
    }
    
    return this.save();
};

module.exports = mongoose.model('VoiceActivity', voiceActivitySchema);
