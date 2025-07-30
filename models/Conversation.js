const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        default: 'User'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const conversationSchema = new mongoose.Schema({
    channelId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    messages: [messageSchema],
    lastActivity: {
        type: Date,
        default: Date.now
    },
    tokensUsed: {
        type: Number,
        default: 0
    },
    messageCount: {
        type: Number,
        default: 0
    },
    participants: [{
        userId: String,
        userName: String,
        lastMessage: Date
    }]
}, {
    timestamps: true
});

// Index for efficient queries
conversationSchema.index({ channelId: 1 });

// Clean up old conversations (auto-expire after 7 days of inactivity)
conversationSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// Methods
conversationSchema.methods.addMessage = function(role, content, userName = 'User', userId = null) {
    this.messages.push({ role, content, userName });
    this.lastActivity = new Date();
    this.messageCount += 1;
    
    // Update participant info for user messages
    if (role === 'user' && userId) {
        const participant = this.participants.find(p => p.userId === userId);
        if (participant) {
            participant.userName = userName;
            participant.lastMessage = new Date();
        } else {
            this.participants.push({
                userId,
                userName,
                lastMessage: new Date()
            });
        }
    }
    
    // Keep only last 10 messages to manage memory and token usage (reduced from 25)
    if (this.messages.length > 10) {
        this.messages = this.messages.slice(-10);
    }
    
    return this.save();
};

conversationSchema.methods.getRecentMessages = function(limit = 10) {
    return this.messages.slice(-limit);
};

conversationSchema.methods.clearHistory = function() {
    this.messages = [];
    this.tokensUsed = 0;
    this.messageCount = 0;
    this.lastActivity = new Date();
    return this.save();
};

// Static methods
conversationSchema.statics.findOrCreateConversation = async function(channelId, guildId) {
    let conversation = await this.findOne({ channelId });
    
    if (!conversation) {
        conversation = new this({
            channelId,
            guildId,
            messages: [],
            lastActivity: new Date(),
            participants: []
        });
        await conversation.save();
    } else {
        // Update last activity
        conversation.lastActivity = new Date();
        await conversation.save();
    }
    
    return conversation;
};

conversationSchema.statics.cleanupOldConversations = async function() {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const result = await this.deleteMany({ lastActivity: { $lt: cutoffDate } });
    return result.deletedCount;
};

module.exports = mongoose.model('Conversation', conversationSchema);
