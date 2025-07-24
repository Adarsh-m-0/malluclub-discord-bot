const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        default: 'Unknown User'
    },
    xp: {
        type: Number,
        default: 0,
        min: 0
    },
    chatXP: {
        type: Number,
        default: 0,
        min: 0
    },
    vcXP: {
        type: Number,
        default: 0,
        min: 0
    },
    level: {
        type: Number,
        default: 0,
        min: 0
    },
    voiceTime: {
        type: Number,
        default: 0,
        min: 0
    },
    warnings: [{
        reason: String,
        moderator: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    muteExpiration: {
        type: Date,
        default: null
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    lastMessageXP: {
        type: Date,
        default: null
    },
    lastVCXP: {
        type: Date,
        default: null
    },
    dailyXP: {
        type: Number,
        default: 0,
        min: 0
    },
    dailyXPReset: {
        type: Date,
        default: null
    },
    lastXPTimestamp: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Create compound index for userId and guildId (unique combination)
userSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Additional indexes for performance
userSchema.index({ guildId: 1, xp: -1 }); // For leaderboards
userSchema.index({ guildId: 1, level: -1 }); // For level-based queries

module.exports = mongoose.model('User', userSchema);
