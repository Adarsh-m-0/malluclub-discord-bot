const mongoose = require('mongoose');

const voiceSessionSchema = new mongoose.Schema({
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
    channelId: {
        type: String,
        required: true
    },
    startedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    endedAt: {
        type: Date,
        required: false
    },
    duration: {
        type: Number, // Duration in milliseconds
        required: false
    },
    xpEarned: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true,
    collection: 'voice_sessions'
});

// Compound indexes for efficient queries
voiceSessionSchema.index({ userId: 1, guildId: 1 });
voiceSessionSchema.index({ guildId: 1, startedAt: -1 });
voiceSessionSchema.index({ endedAt: -1 });

// Virtual for duration in minutes
voiceSessionSchema.virtual('durationMinutes').get(function() {
    return this.duration ? Math.floor(this.duration / 60000) : 0;
});

// Static method to get user voice stats
voiceSessionSchema.statics.getUserStats = async function(userId, guildId) {
    const pipeline = [
        {
            $match: {
                userId: userId,
                guildId: guildId,
                endedAt: { $exists: true }
            }
        },
        {
            $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                totalDuration: { $sum: '$duration' },
                totalXP: { $sum: '$xpEarned' },
                averageSession: { $avg: '$duration' }
            }
        }
    ];
    
    const result = await this.aggregate(pipeline);
    return result[0] || {
        totalSessions: 0,
        totalDuration: 0,
        totalXP: 0,
        averageSession: 0
    };
};

// Static method to get guild leaderboard
voiceSessionSchema.statics.getLeaderboard = async function(guildId, limit = 10) {
    const pipeline = [
        {
            $match: {
                guildId: guildId,
                endedAt: { $exists: true }
            }
        },
        {
            $group: {
                _id: '$userId',
                totalSessions: { $sum: 1 },
                totalDuration: { $sum: '$duration' },
                totalXP: { $sum: '$xpEarned' },
                lastActive: { $max: '$endedAt' }
            }
        },
        {
            $sort: { totalXP: -1 }
        },
        {
            $limit: limit
        }
    ];
    
    return await this.aggregate(pipeline);
};

// Method to calculate XP based on duration
voiceSessionSchema.methods.calculateXP = function() {
    if (!this.duration) return 0;
    
    const minutes = Math.floor(this.duration / 60000);
    const baseXP = process.env.VOICE_XP_RATE || 10;
    
    // Award XP per minute, with diminishing returns for very long sessions
    let xp = minutes * baseXP;
    
    // Bonus for longer sessions (up to 2 hours)
    if (minutes > 60) {
        xp += Math.min(minutes - 60, 60) * (baseXP * 0.5);
    }
    
    // Cap at reasonable amount
    return Math.min(xp, 2000);
};

// Pre-save middleware to calculate XP
voiceSessionSchema.pre('save', function(next) {
    if (this.duration && !this.xpEarned) {
        this.xpEarned = this.calculateXP();
    }
    next();
});

module.exports = mongoose.model('VoiceSession', voiceSessionSchema);
