const mongoose = require('mongoose');

const dailyVoiceActivitySchema = new mongoose.Schema({
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
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    voiceMinutes: {
        type: Number,
        default: 0,
        min: 0
    },
    xpEarned: {
        type: Number,
        default: 0,
        min: 0
    },
    sessionsCount: {
        type: Number,
        default: 0,
        min: 0
    },
    averageSessionLength: {
        type: Number,
        default: 0,
        min: 0
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    streak: {
        type: Number,
        default: 0,
        min: 0
    },
    hadVcActiveRole: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
dailyVoiceActivitySchema.index({ userId: 1, guildId: 1, date: 1 });
dailyVoiceActivitySchema.index({ guildId: 1, date: 1, voiceMinutes: -1 });
dailyVoiceActivitySchema.index({ guildId: 1, date: 1, xpEarned: -1 });

// Method to get today's date in YYYY-MM-DD format
dailyVoiceActivitySchema.statics.getTodayDate = function() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

// Method to get yesterday's date
dailyVoiceActivitySchema.statics.getYesterdayDate = function() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return yesterday;
};

// Method to update daily activity
dailyVoiceActivitySchema.statics.updateDailyActivity = async function(userId, guildId, username, voiceMinutes, xpEarned) {
    const today = this.getTodayDate();
    
    const activity = await this.findOneAndUpdate(
        { userId, guildId, date: today },
        {
            $set: {
                username,
                lastActivity: new Date()
            },
            $inc: {
                voiceMinutes: voiceMinutes,
                xpEarned: xpEarned,
                sessionsCount: 1
            }
        },
        { 
            upsert: true, 
            new: true,
            setDefaultsOnInsert: true
        }
    );

    // Update average session length
    if (activity.sessionsCount > 0) {
        activity.averageSessionLength = activity.voiceMinutes / activity.sessionsCount;
        await activity.save();
    }

    return activity;
};

// Method to get top users for a specific date
dailyVoiceActivitySchema.statics.getTopUsers = async function(guildId, date, limit = 3) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    return await this.find({
        guildId,
        date: { $gte: startDate, $lte: endDate }
    })
    .sort({ voiceMinutes: -1, xpEarned: -1 })
    .limit(limit)
    .exec();
};

// Method to calculate streak
dailyVoiceActivitySchema.statics.calculateStreak = async function(userId, guildId) {
    const today = this.getTodayDate();
    let streak = 0;
    let currentDate = new Date(today);
    
    while (true) {
        const activity = await this.findOne({
            userId,
            guildId,
            date: currentDate,
            voiceMinutes: { $gte: 30 } // Minimum 30 minutes to count as active
        });
        
        if (!activity) break;
        
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
        
        // Prevent infinite loop
        if (streak > 365) break;
    }
    
    return streak;
};

module.exports = mongoose.model('DailyVoiceActivity', dailyVoiceActivitySchema);
