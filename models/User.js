const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true
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
    }
});

module.exports = mongoose.model('User', userSchema);
