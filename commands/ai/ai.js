const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const AIManager = require('../../utils/AIManager');

const aiManager = new AIManager();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('AI chatbot commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ask')
                .setDescription('Ask the AI a question')
                .addStringOption(option =>
                    option.setName('question')
                        .setDescription('Your question for the AI')
                        .setRequired(true)
                        .setMaxLength(1000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear your conversation history with the AI'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Show your AI conversation statistics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup AI chat channel (Admin only)')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'ask':
                await handleAsk(interaction);
                break;
            case 'clear':
                await handleClear(interaction);
                break;
            case 'stats':
                await handleStats(interaction);
                break;
            case 'setup':
                await handleSetup(interaction);
                break;
        }
    },
};

async function handleAsk(interaction) {
    try {
        await interaction.deferReply();

        const question = interaction.options.getString('question');
        const userName = interaction.member?.displayName || interaction.user.username;

        // Show typing indicator
        const typingInterval = setInterval(() => {
            interaction.channel.sendTyping().catch(() => {});
        }, 5000);

        try {
            const result = await aiManager.generateResponse(
                interaction.channel.id,
                interaction.user.id,
                interaction.guild.id,
                question,
                userName
            );

            clearInterval(typingInterval);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor(0x00AE86)
                    .setAuthor({
                        name: `${userName} asked:`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setDescription(`**Question:** ${question}\n\n**AI Response:**\n${result.content}`)
                    .setFooter({
                        text: `Tokens used: ${result.tokensUsed || 'Unknown'}`,
                        iconURL: interaction.client.user.displayAvatarURL()
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🤖 AI Error')
                    .setDescription(result.error)
                    .setTimestamp();

                await interaction.editReply({ embeds: [errorEmbed] });
            }
        } catch (error) {
            clearInterval(typingInterval);
            throw error;
        }

    } catch (error) {
        console.error('Error in AI ask command:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🤖 Error')
            .setDescription('Sorry, I encountered an error while processing your question. Please try again later.')
            .setTimestamp();

        if (interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}

async function handleClear(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const result = await aiManager.clearConversation(
            interaction.channel.id
        );

        const embed = new EmbedBuilder()
            .setColor(result.success ? 0x00AE86 : 0xFF0000)
            .setTitle(result.success ? '🧹 Channel Conversation Cleared' : '❌ Error')
            .setDescription(result.success ? 
                'The conversation history for this channel has been cleared! This affects all users in this channel.' : 
                result.error)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error in AI clear command:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Error')
            .setDescription('Failed to clear conversation history.')
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleStats(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const result = await aiManager.getConversationStats(
            interaction.channel.id
        );

        if (result.success) {
            const stats = result.stats;
            const embed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle('📊 Channel AI Conversation Stats')
                .setAuthor({
                    name: 'Channel: #' + interaction.channel.name,
                    iconURL: interaction.guild.iconURL()
                })
                .addFields(
                    {
                        name: '💬 Total Messages',
                        value: stats.messageCount.toString(),
                        inline: true
                    },
                    {
                        name: '🔢 Tokens Used',
                        value: stats.tokensUsed.toString(),
                        inline: true
                    },
                    {
                        name: '👥 Participants',
                        value: stats.participants.toString(),
                        inline: true
                    },
                    {
                        name: '⏰ Last Activity',
                        value: stats.lastActivity ? 
                            `<t:${Math.floor(new Date(stats.lastActivity).getTime() / 1000)}:R>` : 
                            'Never',
                        inline: true
                    }
                )
                .setFooter({
                    text: 'Stats for this channel only',
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error in AI stats command:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Error')
            .setDescription('Failed to get conversation statistics.')
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleSetup(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        // Check if user has permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Permission Denied')
                .setDescription('You need the "Manage Channels" permission to use this command.')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Check if AI chat channel already exists
        const existingChannel = interaction.guild.channels.cache.find(
            ch => ch.name === 'ai-chat' && ch.type === 0
        );

        if (existingChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xFFAA00)
                .setTitle('⚠️ Channel Already Exists')
                .setDescription(`The AI chat channel ${existingChannel} already exists!`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Create the AI chat channel
        const aiChannel = await interaction.guild.channels.create({
            name: 'ai-chat',
            type: 0, // GuildText
            topic: '🤖 Chat with our AI assistant! Ask questions, have conversations, or just say hello.',
            reason: 'AI Chat channel setup by ' + interaction.user.tag,
        });

        // Send welcome message to the new channel
        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle('🤖 Welcome to AI Chat!')
            .setDescription(`Hello everyone! I'm **Kuttan**, your friendly AI assistant here in MalluClub! 🌴

**🎯 How to Chat:**
• Simply type your message here - I'll respond automatically!
• Mention me anywhere: ${interaction.client.user} to get my attention
• Use \`/ai ask\` command for quick questions
• I can handle multiple people chatting at once!

**💡 What I Can Help With:**
• General questions and discussions
• Malayalam culture, food, movies, and traditions
• Explanations and information
• Fun conversations and more!

**📋 Commands:**
• \`/ai ask\` - Ask me a question
• \`/ai clear\` - Clear channel conversation history
• \`/ai stats\` - View channel conversation statistics

**🚫 Please Note:**
• Be respectful and follow server rules
• I can't provide medical, legal, or financial advice
• Rate limited to 10 messages per 5 minutes per user
• Conversation is shared among all users in this channel

Let's have a great conversation! Welcome to the MalluClub family! 🎉`)
            .setFooter({
                text: 'AI powered by OpenRouter • Made with ❤️ for MalluClub',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        await aiChannel.send({ embeds: [welcomeEmbed] });

        // Confirm setup
        const successEmbed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle('✅ AI Chat Setup Complete!')
            .setDescription(`Successfully created ${aiChannel} for AI interactions!\n\nThe channel has been set up with a welcome message explaining how to use the AI features.`)
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error in AI setup command:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Setup Failed')
            .setDescription('Failed to setup AI chat channel. Please check bot permissions and try again.')
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}
