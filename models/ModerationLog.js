const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema({
    caseId: {
        type: String,
        unique: true,
        default: function() {
            return `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
    },
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
        enum: ['kick', 'ban', 'mute', 'unmute', 'warn', 'warn_remove', 'warn_clear', 'clear', 'message_delete']
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
