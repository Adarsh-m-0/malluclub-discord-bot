const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

console.log('🔍 Checking Discord bot connection...');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Set a timeout to prevent hanging
const timeout = setTimeout(() => {
    console.log('❌ Connection timeout - check your token or network');
    process.exit(1);
}, 10000);

client.once('ready', () => {
    clearTimeout(timeout);
    console.log('✅ Bot connected successfully!');
    console.log('🤖 Logged in as:', client.user.tag);
    console.log('🏰 Servers:', client.guilds.cache.size);
    
    const guild = client.guilds.cache.first();
    if (guild) {
        console.log('📍 Main server:', guild.name);
        console.log('👥 Members:', guild.memberCount);
        console.log('🎭 Roles:', guild.roles.cache.size);
        
        const botMember = guild.members.me;
        if (botMember) {
            console.log('🔝 Bot highest role:', botMember.roles.highest.name);
            console.log('📊 Bot role position:', botMember.roles.highest.position);
            console.log('🔑 Can manage roles:', botMember.permissions.has('ManageRoles') ? 'Yes' : 'No');
        }
    }
    
    console.log('✅ Bot status check complete!');
    process.exit(0);
});

client.on('error', (error) => {
    clearTimeout(timeout);
    console.error('❌ Bot error:', error.message);
    process.exit(1);
});

console.log('🔌 Attempting to connect...');
client.login(process.env.DISCORD_TOKEN).catch(error => {
    clearTimeout(timeout);
    console.error('❌ Login failed:', error.message);
    process.exit(1);
});
