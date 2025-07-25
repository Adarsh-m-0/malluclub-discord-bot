const { Events } = require('discord.js');
const User = require('../models/User');
const XPManager = require('../utils/XPManager');
const DailyChatActivity = require('../models/DailyChatActivity');

// Chat XP configuration
const CHAT_XP_AMOUNT = 5; // XP per valid message
const CHAT_XP_COOLDOWN = 30 * 1000; // 30 seconds cooldown per user
const MIN_MESSAGE_LENGTH = 5; // Minimum length for a message to count
const DAILY_XP_CAP = 1000; // Max XP a user can earn per day
const LINK_REGEX = /https?:\/\//i;
const EMOJI_REGEX = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}|\p{Emoji_Component})+$/u;
const RECENT_MSG_WINDOW = 10 * 60 * 1000; // 10 minutes
const RECENT_MSG_LIMIT = 10; // Max XP for 10 messages per 10 min

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bots, DMs, and system messages
        if (message.author.bot || !message.guild || message.system) return;

        // Ignore short messages or messages with only emojis
        const content = message.content.trim();
        if (content.length < MIN_MESSAGE_LENGTH || /^\p{Emoji}+$/u.test(content)) return;

        try {
            // Fetch or create user profile
            let userData = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
            if (!userData) {
                userData = new User({
                    userId: message.author.id,
                    guildId: message.guild.id,
                    username: message.author.username
                });
            }

            // Daily XP cap logic
            const now = Date.now();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (!userData.dailyXPReset || userData.dailyXPReset < today) {
                userData.dailyXP = 0;
                userData.dailyXPReset = today;
            }
            if (userData.dailyXP >= DAILY_XP_CAP) return; // Cap reached

            // Anti-spam: cooldown between XP gains
            if (userData.lastMessageXP && now - userData.lastMessageXP < CHAT_XP_COOLDOWN) return;

            // Advanced spam detection
            // 1. Ignore repeated messages
            if (userData.lastMessageContent && userData.lastMessageContent === content) return;
            // 2. Ignore mostly emojis or links
            const emojiRatio = (content.match(/\p{Emoji}/gu) || []).length / content.length;
            if (emojiRatio > 0.5 || LINK_REGEX.test(content)) return;
            // 3. Rolling window: only award XP for up to 10 messages per 10 minutes
            if (!userData.recentMessageTimestamps) userData.recentMessageTimestamps = [];
            userData.recentMessageTimestamps = userData.recentMessageTimestamps.filter(ts => now - ts < RECENT_MSG_WINDOW);
            if (userData.recentMessageTimestamps.length >= RECENT_MSG_LIMIT) return;
            userData.recentMessageTimestamps.push(now);

            // Award XP (but not above cap)
            const xpToAward = Math.min(CHAT_XP_AMOUNT, DAILY_XP_CAP - userData.dailyXP);
            userData.chatXP += xpToAward;
            userData.xp += xpToAward;
            userData.dailyXP += xpToAward;
            userData.lastMessageXP = now;
            userData.lastXPTimestamp = now;
            userData.lastMessageContent = content;
            // Log to DailyChatActivity for time-based leaderboards
            await DailyChatActivity.updateDailyActivity(
                message.author.id,
                message.guild.id,
                message.author.username,
                xpToAward
            );

            // Level up logic (progressive XP per level)
            const XPManager = require('../utils/XPManager');
            const newLevel = XPManager.calculateLevel(userData.xp);
            if (newLevel > userData.level) {
                userData.level = newLevel;
                // Announce level up with milestone message
                let milestoneMsg = '';
                if ([5, 10, 25, 50, 100].includes(userData.level)) {
                    milestoneMsg = `\n**Milestone!** You reached level ${userData.level} and unlocked a new badge!`;
                }
                try {
                    await message.channel.send({
                        content: `${message.author}, congrats! You reached level ${userData.level}! 🎉${milestoneMsg}`
                    });
                } catch {}
            }

            await userData.save();
        } catch (error) {
            console.error('Error awarding chat XP:', error);
        }
    }
};