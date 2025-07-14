const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    moderatorId: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['kick', 'ban', 'mute', 'unmute', 'warn', 'clear']
    },
    reason: {
        type: String,
        default: 'No reason provided'
    },
    duration: {
        type: String,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    additionalInfo: {
        type: Object,
        default: {}
    }
});

module.exports = mongoose.model('ModerationLog', moderationLogSchema);
