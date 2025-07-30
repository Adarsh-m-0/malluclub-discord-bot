const { Events } = require('discord.js');
const User = require('../models/User');
const XPManager = require('../utils/XPManager');
const DailyChatActivity = require('../models/DailyChatActivity');
const AIManager = require('../utils/AIManager');

// Chat XP configuration
const CHAT_XP_AMOUNT = 5; // XP per valid message
const CHAT_XP_COOLDOWN = 30 * 1000; // 30 seconds cooldown per user
const MIN_MESSAGE_LENGTH = 5; // Minimum length for a message to count
const DAILY_XP_CAP = 1000; // Max XP a user can earn per day
const LINK_REGEX = /https?:\/\//i;
const EMOJI_REGEX = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}|\p{Emoji_Component})+$/u;
const RECENT_MSG_WINDOW = 10 * 60 * 1000; // 10 minutes
const RECENT_MSG_LIMIT = 10; // Max XP for 10 messages per 10 min

// AI Chat configuration
const AI_CHAT_CHANNEL_ID = process.env.AI_CHAT_CHANNEL_ID; // Channel ID for AI interactions
const aiManager = new AIManager();

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bots, DMs, and system messages
        if (message.author.bot || !message.guild || message.system) return;

        // Check for AI chat functionality first
        await handleAIChat(message);

        // Regular XP processing
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

async function handleAIChat(message) {
    try {
        // Only respond in the designated AI chat channel
        if (!AI_CHAT_CHANNEL_ID || message.channel.id !== AI_CHAT_CHANNEL_ID) return;
        
        // Validate message and user
        if (!message.author || !message.guild || !message.content) return;
        
        // Clean the message content (remove any mentions if present)
        let cleanContent = message.content.trim();
        
        // Remove bot mentions if present and client user exists
        if (message.client && message.client.user) {
            cleanContent = cleanContent.replace(new RegExp(`<@!?${message.client.user.id}>`, 'g'), '').trim();
        }
        
        // Remove common AI prefixes if present
        cleanContent = cleanContent.replace(/^(ai[,:\s]+|hey ai[,:\s]*)/i, '').trim();
        
        // Ignore very short messages after cleaning or messages that are too long
        if (cleanContent.length < 2 || cleanContent.length > 2000) return;
        
        // Show typing indicator with error handling (but don't wait)
        message.channel.sendTyping().catch(typingError => {
            console.error('Failed to show typing indicator:', typingError);
            // Continue without typing indicator - don't block for this
        });

        // Generate AI response with proper error handling
        const result = await aiManager.generateResponse(
            message.channel.id,
            message.author.id,
            message.guild.id,
            cleanContent,
            message.member?.displayName || message.author.username
        );

        if (result.success && result.content) {
            // Ensure content is not empty after all processing
            const content = result.content.trim();
            if (!content) return;
            
            // Split long responses if needed (Discord has 2000 char limit)
            if (content.length <= 2000) {
                try {
                    await message.channel.send(content);
                } catch (sendError) {
                    console.error('Failed to send AI response:', sendError);
                    try {
                        await message.channel.send('🤖 Sorry, I had trouble sending my response.');
                    } catch (fallbackError) {
                        console.error('Failed to send fallback message:', fallbackError);
                    }
                }
            } else {
                // Split into chunks
                const chunks = splitMessage(content, 2000);
                for (let i = 0; i < chunks.length; i++) {
                    try {
                        await message.channel.send(chunks[i]);
                        // Reduced delay between chunks for faster responses
                        if (i < chunks.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 500)); // Reduced from 1000ms to 500ms
                        }
                    } catch (chunkError) {
                        console.error(`Failed to send chunk ${i + 1}:`, chunkError);
                        break; // Stop sending chunks if one fails
                    }
                }
            }
        } else if (result.isRateLimit) {
            // Show rate limit message with error handling
            try {
                await message.channel.send('⚠️ ' + result.error);
            } catch (sendError) {
                console.error('Failed to send rate limit message:', sendError);
            }
        } else if (result.error) {
            // Show error message with error handling
            try {
                await message.channel.send('🤖 ' + result.error);
            } catch (sendError) {
                console.error('Failed to send error message:', sendError);
            }
        }

    } catch (error) {
        console.error('Error in AI chat handling:', error);
        
        // Send error message only in the AI channel with comprehensive error handling
        if (AI_CHAT_CHANNEL_ID && message.channel && message.channel.id === AI_CHAT_CHANNEL_ID) {
            try {
                await message.channel.send('🤖 Sorry, I encountered an unexpected error. Please try again later.');
            } catch (replyError) {
                console.error('Failed to send error reply:', replyError);
            }
        }
    }
}

function splitMessage(text, maxLength) {
    const chunks = [];
    let currentChunk = '';
    
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= maxLength) {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = sentence;
            } else {
                // Sentence is too long, split it by words
                const words = sentence.split(' ');
                for (const word of words) {
                    if ((currentChunk + word).length <= maxLength) {
                        currentChunk += (currentChunk ? ' ' : '') + word;
                    } else {
                        if (currentChunk) {
                            chunks.push(currentChunk);
                            currentChunk = word;
                        } else {
                            // Word is too long, force split
                            chunks.push(word.substring(0, maxLength));
                            currentChunk = word.substring(maxLength);
                        }
                    }
                }
            }
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    
    return chunks.length ? chunks : ['Message too long to send'];
}