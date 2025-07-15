const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once('ready', async () => {
    try {
        console.log('✅ Bot Status Check');
        console.log('===================');
        console.log('Bot:', client.user.tag);
        
        const guild = client.guilds.cache.first();
        if (!guild) {
            console.log('❌ No guild found');
            process.exit(1);
        }
        
        console.log('Guild:', guild.name);
        console.log('Members:', guild.memberCount);
        
        const bot = guild.members.me;
        console.log('\\nBot Role Information:');
        console.log('- Highest Role:', bot.roles.highest.name);
        console.log('- Role Position:', bot.roles.highest.position);
        console.log('- Can Manage Roles:', bot.permissions.has(PermissionFlagsBits.ManageRoles));
        console.log('- Can Moderate:', bot.permissions.has(PermissionFlagsBits.ModerateMembers));
        
        // Check critical roles
        const autoRoleId = process.env.AUTO_ROLE_ID;
        const autoRole = autoRoleId ? guild.roles.cache.get(autoRoleId) : null;
        const muteRole = guild.roles.cache.find(r => r.name === 'Muted');
        
        console.log('\\nRole Status:');
        if (autoRole) {
            const canManage = autoRole.position < bot.roles.highest.position;
            console.log(`- Auto Role (${autoRole.name}): ${canManage ? '✅' : '❌'} Pos: ${autoRole.position}`);
        } else {
            console.log('- Auto Role: ⚠️ Not found');
        }
        
        if (muteRole) {
            const canManage = muteRole.position < bot.roles.highest.position;
            console.log(`- Mute Role: ${canManage ? '✅' : '❌'} Pos: ${muteRole.position}`);
        } else {
            console.log('- Mute Role: ⚠️ Not found');
        }
        
        // Voice roles check
        const voiceRoles = ['Voice Newcomer', 'Voice Regular', 'Voice Enthusiast'];
        console.log('\\nVoice Roles:');
        voiceRoles.forEach(name => {
            const role = guild.roles.cache.find(r => r.name === name);
            if (role) {
                const canManage = role.position < bot.roles.highest.position;
                console.log(`- ${name}: ${canManage ? '✅' : '❌'} Pos: ${role.position}`);
            } else {
                console.log(`- ${name}: ⚠️ Not found`);
            }
        });
        
        console.log('\\n🎯 Summary:');
        const hasPerms = bot.permissions.has(PermissionFlagsBits.ManageRoles);
        const highestPos = bot.roles.highest.position;
        
        if (!hasPerms) {
            console.log('❌ Bot needs MANAGE_ROLES permission');
        } else if (highestPos < 2) {
            console.log('❌ Bot role position too low - move higher');
        } else {
            console.log('✅ Bot role permissions look good!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    process.exit(0);
});

client.on('error', error => {
    console.error('❌ Discord Error:', error.message);
    process.exit(1);
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Login Error:', error.message);
    process.exit(1);
});
