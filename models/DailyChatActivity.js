const mongoose = require('mongoose');

const dailyChatActivitySchema = new mongoose.Schema({
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
    chatXP: {
        type: Number,
        default: 0,
        min: 0
    },
    messages: {
        type: Number,
        default: 0,
        min: 0
    },
    lastActivity: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

dailyChatActivitySchema.index({ userId: 1, guildId: 1, date: 1 });
dailyChatActivitySchema.index({ guildId: 1, date: 1, chatXP: -1 });

dailyChatActivitySchema.statics.getTodayDate = function() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

dailyChatActivitySchema.statics.updateDailyActivity = async function(userId, guildId, username, chatXP) {
    const today = this.getTodayDate();
    const activity = await this.findOneAndUpdate(
        { userId, guildId, date: today },
        {
            $set: {
                username,
                lastActivity: new Date()
            },
            $inc: {
                chatXP: chatXP,
                messages: 1
            }
        },
        {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }
    );
    return activity;
};

const DailyChatActivity = mongoose.model('DailyChatActivity', dailyChatActivitySchema);
module.exports = DailyChatActivity; 