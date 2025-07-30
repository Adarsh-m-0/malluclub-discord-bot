const cron = require('node-cron');
const Conversation = require('../models/Conversation');

class AIScheduler {
    static start() {
        console.log('Starting AI maintenance scheduler...');
        
        // Clean up old conversations daily at 3 AM
        cron.schedule('0 3 * * *', async () => {
            try {
                console.log('Running AI conversation cleanup...');
                const deletedCount = await Conversation.cleanupOldConversations();
                console.log(`Cleaned up ${deletedCount} old AI conversations`);
            } catch (error) {
                console.error('Error during AI conversation cleanup:', error);
            }
        }, {
            timezone: 'UTC'
        });

        console.log('AI maintenance scheduler initialized');
    }
}

module.exports = AIScheduler;
