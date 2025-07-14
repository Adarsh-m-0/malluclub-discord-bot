const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Get information about the server'),
    
    async execute(interaction) {
        const { guild } = interaction;
        
        try {
            // Fetch guild data
            const owner = await guild.fetchOwner();
            const channels = guild.channels.cache;
            const members = guild.members.cache;
            
            const serverInfoEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`🏠 Server Information - ${guild.name}`)
                .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '🏷️ Server Name', value: guild.name, inline: true },
                    { name: '🆔 Server ID', value: guild.id, inline: true },
                    { name: '👑 Owner', value: owner.user.tag, inline: true },
                    { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '📊 Verification Level', value: getVerificationLevel(guild.verificationLevel), inline: true },
                    { name: '🔞 Explicit Filter', value: getExplicitFilter(guild.explicitContentFilter), inline: true },
                    { name: '👥 Members', value: `${members.size} total\n${members.filter(m => !m.user.bot).size} humans\n${members.filter(m => m.user.bot).size} bots`, inline: true },
                    { name: '📝 Channels', value: `${channels.size} total\n${channels.filter(c => c.type === 0).size} text\n${channels.filter(c => c.type === 2).size} voice\n${channels.filter(c => c.type === 4).size} categories`, inline: true },
                    { name: '🎭 Roles', value: guild.roles.cache.size.toString(), inline: true },
                    { name: '😀 Emojis', value: `${guild.emojis.cache.size} total\n${guild.emojis.cache.filter(e => !e.animated).size} static\n${guild.emojis.cache.filter(e => e.animated).size} animated`, inline: true },
                    { name: '📈 Boost Status', value: `Level ${guild.premiumTier}\n${guild.premiumSubscriptionCount} boosts`, inline: true },
                    { name: '🌍 Features', value: getServerFeatures(guild.features), inline: true }
                )
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag}`, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setTimestamp();
            
            // Add server banner if available
            if (guild.bannerURL()) {
                serverInfoEmbed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
            }
            
            await interaction.reply({ embeds: [serverInfoEmbed] });
            
        } catch (error) {
            console.error('Error fetching server info:', error);
            await interaction.reply({ content: '❌ An error occurred while fetching server information.', ephemeral: true });
        }
    },
};

function getVerificationLevel(level) {
    const levels = {
        0: 'None',
        1: 'Low',
        2: 'Medium',
        3: 'High',
        4: 'Very High'
    };
    return levels[level] || 'Unknown';
}

function getExplicitFilter(filter) {
    const filters = {
        0: 'Disabled',
        1: 'Members without roles',
        2: 'All members'
    };
    return filters[filter] || 'Unknown';
}

function getServerFeatures(features) {
    const featureNames = {
        ANIMATED_ICON: 'Animated Icon',
        BANNER: 'Banner',
        COMMERCE: 'Commerce',
        COMMUNITY: 'Community',
        DISCOVERABLE: 'Discoverable',
        FEATURABLE: 'Featurable',
        INVITE_SPLASH: 'Invite Splash',
        MEMBER_VERIFICATION_GATE_ENABLED: 'Member Verification Gate',
        NEWS: 'News',
        PARTNERED: 'Partnered',
        PREVIEW_ENABLED: 'Preview Enabled',
        VANITY_URL: 'Vanity URL',
        VERIFIED: 'Verified',
        VIP_REGIONS: 'VIP Regions',
        WELCOME_SCREEN_ENABLED: 'Welcome Screen'
    };
    
    if (features.length === 0) return 'None';
    
    const displayFeatures = features
        .map(feature => featureNames[feature] || feature)
        .slice(0, 5);
    
    return displayFeatures.join(', ') + (features.length > 5 ? '...' : '');
}
