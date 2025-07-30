const axios = require('axios');
const Conversation = require('../models/Conversation');

class AIManager {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseURL = 'https://openrouter.ai/api/v1';
        // List of free models to try in order - prioritizing fastest models first
        this.freeModels = [
            'google/gemini-2.0-flash-exp:free',         // Latest fast Gemini model
            'google/gemma-3-4b-it:free',                // Small and fast (4B params)
            'qwen/qwen3-4b:free',                       // Fast newer Qwen model (4B params)
            'meta-llama/llama-3.2-3b-instruct:free',   // Small fast model (3B params)
            'mistralai/mistral-7b-instruct:free',       // Reliable 7B model
            'google/gemma-2-9b-it:free',                // Good balance (9B params)
            'mistralai/mistral-nemo:free',              // Reliable newer Mistral
            'qwen/qwen3-8b:free',                       // Balanced performance (8B params)
            'google/gemma-3-12b-it:free',               // More capable (12B params)
            'deepseek/deepseek-chat-v3-0324:free'       // Good fallback option
        ];
        this.currentModelIndex = 0;
        this.maxTokens = 150; // Reduced for faster responses
        this.rateLimits = new Map(); // User rate limiting
        this.systemPrompt = this.getSystemPrompt();
        this.maxRetries = 2; // Reduced from 3 to 2 for faster failover
        this.requestCount = 0; // Track total requests for debugging
        
        // Validate API key on startup
        if (!this.apiKey || this.apiKey.trim() === '') {
            console.error('OPENROUTER_API_KEY is missing or empty!');
        }
    }

    getSystemPrompt() {
        return `You are Kuttan. Reply in exactly ONE short sentence. Never start with colons or punctuation.

Examples:
- "nothing" → "Just chilling then! �"
- "haha" → "Glad you're laughing! 😄"
- "chumma" → "Ah, just like that! �"
- "bruhhh" → "Bruh moment! 😅"

ONE sentence. Direct. No colons. No extra text.`;
    }

    getSystemPrompt() {
        return `You are Kuttan, a friendly AI assistant in the MalluClub Discord server.

**CRITICAL RULES:**
1. **Always complete your sentences** - Never end with commas or incomplete thoughts
2. **Keep responses SHORT** - 1-2 sentences maximum
3. **Be casual and friendly** - like chatting with friends
4. **Answer questions directly** - don't ask unnecessary follow-up questions
5. **Use simple language** - avoid complex explanations

**Examples:**
- User: "helloo" → "Hello! 👋 How's it going?"
- User: "im toki" → "Nice to meet you, Toki! 😊"
- User: "what is my name" → "Your name is Adarsh! 😄"
- User: "empty" → "Ah, one of those days? �"

**Remember:** Complete sentences only. No trailing commas. Short and sweet responses.`;
    }

    async generateResponse(channelId, userId, guildId, userMessage, userName = 'User') {
        try {
            // Validate inputs
            if (!channelId || !userId || !guildId) {
                return {
                    success: false,
                    error: 'Missing required parameters for AI response generation.'
                };
            }

            if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
                return {
                    success: false,
                    error: 'Invalid or empty message content.'
                };
            }

            // Validate API key
            if (!this.apiKey || this.apiKey.trim() === '') {
                return {
                    success: false,
                    error: 'AI service is not configured properly. Please contact the bot administrator.'
                };
            }

            // Sanitize message content
            const sanitizedMessage = userMessage.trim().substring(0, 2000); // Discord limit
            const sanitizedUserName = userName ? userName.substring(0, 32) : 'User'; // Reasonable username limit

            // Check rate limiting (max 10 messages per user per 5 minutes)
            if (this.isRateLimited(userId)) {
                return {
                    success: false,
                    error: 'You\'re sending messages too quickly! Please wait a moment before trying again.',
                    isRateLimit: true
                };
            }

            // Get or create channel conversation (shared by all users in channel)
            let conversation;
            try {
                conversation = await Conversation.findOrCreateConversation(channelId, guildId);
            } catch (dbError) {
                console.error('Database error in AI conversation:', dbError);
                return {
                    success: false,
                    error: 'Database connection issue. Please try again later.'
                };
            }
            
            // Add user message to conversation with username
            try {
                await conversation.addMessage('user', sanitizedMessage, sanitizedUserName, userId);
            } catch (dbError) {
                console.error('Error saving user message:', dbError);
                // Continue without saving - better to respond than fail completely
            }
            
            // Prepare messages for API (limit history for faster processing)
            const messages = this.prepareMessages(conversation, sanitizedUserName);
            
            // Reset to first model if the current one consistently fails
            if (this.currentModelIndex >= this.freeModels.length) {
                this.currentModelIndex = 0;
            }
            
            // Make API request starting with the current working model
            this.requestCount++;
            const response = await this.callOpenRouter(messages, this.currentModelIndex, 0);
            
            if (response.success) {
                // Validate response content before saving to prevent Mongoose validation errors
                if (!response.content || response.content.trim().length === 0) {
                    console.log('AI returned empty content, skipping save');
                    return {
                        success: false,
                        error: 'AI returned empty response. Please try again.'
                    };
                }
                
                // Add assistant response to conversation
                try {
                    await conversation.addMessage('assistant', response.content, 'Kuttan');
                } catch (dbError) {
                    console.error('Error saving AI response:', dbError);
                    // Still return the response even if we can't save it
                }
                
                // Update rate limiting
                this.updateRateLimit(userId);
                
                console.log(`AI response generated using model: ${response.model} (Request #${this.requestCount})`);
                
                return {
                    success: true,
                    content: response.content,
                    tokensUsed: response.tokensUsed
                };
            } else {
                return response;
            }
            
        } catch (error) {
            console.error('Error generating AI response:', error);
            return {
                success: false,
                error: 'Sorry, I encountered an error while processing your message. Please try again later.'
            };
        }
    }

    prepareMessages(conversation, currentUserName) {
        const messages = [
            { role: 'system', content: this.systemPrompt }
        ];
        
        // Safely get recent conversation history (reduced for faster processing)
        let recentMessages = [];
        try {
            if (conversation && typeof conversation.getRecentMessages === 'function') {
                recentMessages = conversation.getRecentMessages(3); // Reduced from 5 to 3 for speed
            }
        } catch (error) {
            console.error('Error getting recent messages:', error);
            // Continue with empty history rather than fail
        }
        
        // Validate and add recent messages
        if (Array.isArray(recentMessages)) {
            for (const msg of recentMessages) {
                try {
                    if (msg && msg.role && msg.content) {
                        if (msg.role === 'user') {
                            // Include username in user messages for multi-user conversations
                            const displayName = (msg.userName && msg.userName.trim()) ? msg.userName.substring(0, 32) : 'User';
                            const content = msg.content.substring(0, 800); // Reduced from 1500 for faster processing
                            messages.push({
                                role: 'user',
                                content: `${displayName}: ${content}`
                            });
                        } else if (msg.role === 'assistant') {
                            const content = msg.content.substring(0, 800); // Reduced from 1500 for faster processing
                            messages.push({
                                role: 'assistant',
                                content: content
                            });
                        }
                    }
                } catch (msgError) {
                    console.error('Error processing message:', msgError);
                    // Skip invalid messages but continue
                }
            }
        }
        
        return messages;
    }

    async callOpenRouter(messages, modelIndex = 0, retryCount = 0) {
        // Prevent infinite recursion
        if (retryCount >= this.maxRetries) {
            console.log(`Max retries (${this.maxRetries}) reached, giving up.`);
            return {
                success: false,
                error: 'AI service is temporarily unavailable. Please try again later.'
            };
        }

        // If we've tried all models, reset to first but increment retry count
        if (modelIndex >= this.freeModels.length) {
            modelIndex = 0;
            retryCount++;
            if (retryCount >= this.maxRetries) {
                return {
                    success: false,
                    error: 'All AI models are currently unavailable. Please try again later.'
                };
            }
        }
        
        const model = this.freeModels[modelIndex];
        
        // Validate messages array
        if (!Array.isArray(messages) || messages.length === 0) {
            return {
                success: false,
                error: 'Invalid message format for AI processing.'
            };
        }
        
        try {
            console.log(`Trying AI model: ${model} (attempt ${retryCount + 1}/${this.maxRetries})`);
            
            const response = await axios.post(`${this.baseURL}/chat/completions`, {
                model: model,
                messages: messages,
                max_tokens: this.maxTokens,
                temperature: 0.9, // Slightly higher for more creative but faster responses
                top_p: 0.95,      // Increased for faster sampling
                frequency_penalty: 0.2, // Reduced for faster processing
                presence_penalty: 0.2,  // Reduced for faster processing
                stream: false
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'X-Title': 'MalluClub Discord Bot'
                },
                timeout: 15000 // Reduced from 30s to 15s for faster timeouts
            });

            if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
                let content = response.data.choices[0].message.content?.trim() || '';
                const tokensUsed = response.data.usage?.total_tokens || 0;
                
                // Clean the response: remove leading colons, spaces, punctuation
                content = content.replace(/^[:;,.\-\s]+/, '');
                
                // Take only the first sentence for ultra-concise responses
                const firstSentence = content.split(/[.!?]+/)[0];
                
                // Use the first sentence if it's reasonable, otherwise use first 100 chars
                if (firstSentence.length > 0 && firstSentence.length <= 100) {
                    content = firstSentence;
                } else if (content.length > 100) {
                    content = content.substring(0, 97) + '...';
                }
                
                // Final cleanup: ensure no leading unwanted characters
                content = content.replace(/^[:;,.\-\s]+/, '').trim();
                
                // Check if content is not empty and doesn't end with incomplete punctuation
                if (!content) {
                    console.log(`Model ${model} returned empty content, trying next model...`);
                    return this.callOpenRouter(messages, modelIndex + 1, retryCount);
                }
                
                // Simplified incomplete response detection for speed
                const isIncomplete = content.length < 3 || 
                                   content.endsWith(',') ||
                                   content.endsWith('-') ||
                                   content.endsWith(':') ||
                                   content.split(' ').length < 2;
                
                if (isIncomplete) {
                    console.log(`Model ${model} returned incomplete response: "${content}", trying next model...`);
                    return this.callOpenRouter(messages, modelIndex + 1, retryCount);
                }
                
                // Model worked, update current model index
                this.currentModelIndex = modelIndex;
                
                return {
                    success: true,
                    content: content,
                    tokensUsed: tokensUsed,
                    model: model
                };
            } else {
                throw new Error('Invalid response format from API');
            }
            
        } catch (error) {
            console.error(`OpenRouter API error with model ${model}:`, error.response?.data || error.message);
            
            // Handle network/timeout errors
            if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
                console.log(`Network error with model ${model}, trying next model...`);
                return this.callOpenRouter(messages, modelIndex + 1, retryCount);
            }
            
            // Handle specific error cases
            if (error.response?.status === 429) {
                console.log(`Model ${model} hit rate limit, trying next model...`);
                return this.callOpenRouter(messages, modelIndex + 1, retryCount);
            }
            
            if (error.response?.status === 401) {
                return {
                    success: false,
                    error: 'API authentication failed. Please contact the bot administrator.'
                };
            }
            
            if (error.response?.status === 402) {
                return {
                    success: false,
                    error: 'API quota exceeded. Please try again later.'
                };
            }
            
            // Model not available (404) or invalid (400) - try next model
            if (error.response?.status === 404 || error.response?.status === 400) {
                console.log(`Model ${model} not available, trying next model...`);
                return this.callOpenRouter(messages, modelIndex + 1, retryCount);
            }
            
            // For any other error, also try next model
            console.log(`Model ${model} failed with error, trying next model...`);
            return this.callOpenRouter(messages, modelIndex + 1, retryCount);
        }
    }

    isRateLimited(userId) {
        if (!userId) return false; // Don't rate limit if no userId provided
        
        const now = Date.now();
        const userLimits = this.rateLimits.get(userId) || { count: 0, resetTime: now + 5 * 60 * 1000 };
        
        // Reset if time window has passed
        if (now > userLimits.resetTime) {
            userLimits.count = 0;
            userLimits.resetTime = now + 5 * 60 * 1000;
            this.rateLimits.set(userId, userLimits);
        }
        
        return userLimits.count >= 10; // Max 10 messages per 5 minutes
    }

    updateRateLimit(userId) {
        if (!userId) return; // Don't update if no userId provided
        
        const now = Date.now();
        const userLimits = this.rateLimits.get(userId) || { count: 0, resetTime: now + 5 * 60 * 1000 };
        
        // Reset if time window has passed
        if (now > userLimits.resetTime) {
            userLimits.count = 1;
            userLimits.resetTime = now + 5 * 60 * 1000;
        } else {
            userLimits.count += 1;
        }
        
        this.rateLimits.set(userId, userLimits);
        
        // Clean up old entries periodically to prevent memory leaks
        if (this.rateLimits.size > 1000) {
            this.cleanupRateLimits();
        }
    }

    cleanupRateLimits() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [userId, limits] of this.rateLimits.entries()) {
            // Remove entries that are older than 10 minutes
            if (now > limits.resetTime + 5 * 60 * 1000) {
                this.rateLimits.delete(userId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`Cleaned up ${cleanedCount} old rate limit entries`);
        }
    }

    async clearConversation(channelId, userId = null) {
        try {
            // Clear channel conversation (affects all users in that channel)
            const conversation = await Conversation.findOne({ channelId });
            if (conversation) {
                await conversation.clearHistory();
                return { success: true };
            }
            return { success: true, message: 'No conversation found to clear.' };
        } catch (error) {
            console.error('Error clearing conversation:', error);
            return { success: false, error: 'Failed to clear conversation history.' };
        }
    }

    async getConversationStats(channelId, userId = null) {
        try {
            const conversation = await Conversation.findOne({ channelId });
            if (!conversation) {
                return { success: true, stats: { messageCount: 0, tokensUsed: 0, participants: 0 } };
            }
            
            return {
                success: true,
                stats: {
                    messageCount: conversation.messageCount,
                    tokensUsed: conversation.tokensUsed,
                    lastActivity: conversation.lastActivity,
                    participants: conversation.participants.length
                }
            };
        } catch (error) {
            console.error('Error getting conversation stats:', error);
            return { success: false, error: 'Failed to get conversation statistics.' };
        }
    }

    // Utility method to check if message mentions the bot
    static shouldRespond(message, botUser) {
        const content = message.content.toLowerCase();
        const botMention = `<@${botUser.id}>`;
        const botMentionNick = `<@!${botUser.id}>`;
        
        // Respond if:
        // 1. Bot is mentioned
        // 2. Message starts with common AI triggers
        // 3. Message is a reply to the bot
        return message.mentions.users.has(botUser.id) ||
               content.includes(botMention.toLowerCase()) ||
               content.includes(botMentionNick.toLowerCase()) ||
               (message.reference && message.reference.userId === botUser.id) ||
               content.startsWith('ai ') ||
               content.startsWith('hey ai') ||
               content.startsWith('ai,');
    }

    // Utility to clean message content for AI processing
    static cleanMessageContent(content, botUser) {
        // Remove bot mentions
        content = content.replace(new RegExp(`<@!?${botUser.id}>`, 'g'), '').trim();
        
        // Remove common prefixes
        content = content.replace(/^(ai[,:\s]+|hey ai[,:\s]*)/i, '').trim();
        
        return content;
    }
}

module.exports = AIManager;
