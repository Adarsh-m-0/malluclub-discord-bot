const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Get a random meme')
        .addStringOption(option =>
            option.setName('subreddit')
                .setDescription('Specify a subreddit for memes')
                .setRequired(false)
                .addChoices(
                    { name: 'General Memes', value: 'memes' },
                    { name: 'Dank Memes', value: 'dankmemes' },
                    { name: 'Wholesome Memes', value: 'wholesomememes' },
                    { name: 'Programming Memes', value: 'ProgrammerHumor' },
                    { name: 'Indian Memes', value: 'IndianMemes' }
                )),
    
    cooldown: 3,
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const subreddit = interaction.options.getString('subreddit') || 'memes';
        
        try {
            // Fetch meme from Reddit API
            const response = await axios.get(`https://www.reddit.com/r/${subreddit}/random.json`, {
                headers: {
                    'User-Agent': 'MalluClub-Bot/1.0'
                }
            });
            
            const post = response.data[0].data.children[0].data;
            
            // Check if post is appropriate
            if (post.over_18) {
                return interaction.editReply({ content: '❌ NSFW content is not allowed. Please try again.' });
            }
            
            // Check if post has an image
            if (!post.url.match(/\.(jpeg|jpg|gif|png)$/i) && !post.url.includes('i.redd.it')) {
                return interaction.editReply({ content: '❌ Could not find an image meme. Please try again.' });
            }
            
            const memeEmbed = new EmbedBuilder()
                .setColor(0xFF6600) // Reddit orange
                .setAuthor({ 
                    name: `🎭 Meme from r/${post.subreddit}`, 
                    iconURL: 'https://www.redditstatic.com/desktop2x/img/favicon/favicon-96x96.png',
                    url: `https://reddit.com/r/${post.subreddit}`
                })
                .setTitle(post.title.length > 256 ? post.title.substring(0, 253) + '...' : post.title)
                .setImage(post.url)
                .setURL(`https://reddit.com${post.permalink}`)
                .addFields(
                    { name: '👍 Upvotes', value: `\`${post.ups.toLocaleString()}\``, inline: true },
                    { name: '💬 Comments', value: `\`${post.num_comments.toLocaleString()}\``, inline: true },
                    { name: '⭐ Awards', value: `\`${post.total_awards_received || 0}\``, inline: true },
                    { name: '📊 Upvote Ratio', value: `\`${Math.round(post.upvote_ratio * 100)}%\``, inline: true },
                    { name: '📅 Posted', value: `<t:${post.created_utc}:R>`, inline: true },
                    { name: '👤 Author', value: `u/${post.author}`, inline: true }
                )
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag} • MalluClub Bot`, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [memeEmbed] });
            
        } catch (error) {
            console.error('Error fetching meme:', error);
            
            // Fallback memes
            const fallbackMemes = [
                'https://i.imgur.com/7kUgKLb.jpg',
                'https://i.imgur.com/X5tD7M5.jpg',
                'https://i.imgur.com/OUMJt5g.jpg',
                'https://i.imgur.com/tGQYFQG.jpg',
                'https://i.imgur.com/3XmE9sC.jpg'
            ];
            
            const randomMeme = fallbackMemes[Math.floor(Math.random() * fallbackMemes.length)];
            
            const fallbackEmbed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle('🎭 Here\'s a meme for you!')
                .setImage(randomMeme)
                .setFooter({ 
                    text: 'Mallu Club • Fallback Meme', 
                    iconURL: interaction.client.user.displayAvatarURL() 
                })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [fallbackEmbed] });
        }
    },
};
