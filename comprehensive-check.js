const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
require('dotenv').config();

console.log('🚀 Starting comprehensive bot check...');
console.log('=====================================');

// Test environment variables
console.log('📋 Environment Check:');
console.log('- DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? '✅ Set' : '❌ Missing');
console.log('- CLIENT_ID:', process.env.CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('- GUILD_ID:', process.env.GUILD_ID ? '✅ Set' : '❌ Missing');
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');

// Test command loading
console.log('\\n📂 Command Loading Check:');
try {
    const commandFolders = readdirSync(join(__dirname, 'commands'));
    let totalCommands = 0;
    
    commandFolders.forEach(folder => {
        const commandFiles = readdirSync(join(__dirname, 'commands', folder))
            .filter(file => file.endsWith('.js'));
        totalCommands += commandFiles.length;
        console.log(`- ${folder}: ${commandFiles.length} commands`);
    });
    
    console.log(`✅ Total commands found: ${totalCommands}`);
} catch (error) {
    console.log('❌ Command loading error:', error.message);
}

// Test Discord connection
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const timeout = setTimeout(() => {
    console.log('\\n❌ Connection timeout (10 seconds)');
    console.log('💡 Possible issues:');
    console.log('  - Invalid Discord token');
    console.log('  - Network connectivity issues');
    console.log('  - Bot not invited to server');
    process.exit(1);
}, 10000);

client.once('ready', async () => {
    clearTimeout(timeout);
    
    console.log('\\n🤖 Bot Connection Check:');
    console.log('✅ Successfully connected to Discord!');
    console.log('- Bot Tag:', client.user.tag);
    console.log('- Bot ID:', client.user.id);
    console.log('- Guilds:', client.guilds.cache.size);
    
    const guild = client.guilds.cache.first();
    if (!guild) {
        console.log('\\n❌ No guild found! Bot needs to be invited to a server.');
        process.exit(1);
    }
    
    console.log('\\n🏰 Guild Information:');
    console.log('- Name:', guild.name);
    console.log('- ID:', guild.id);
    console.log('- Members:', guild.memberCount);
    console.log('- Roles:', guild.roles.cache.size);
    console.log('- Channels:', guild.channels.cache.size);
    
    const bot = guild.members.me;
    console.log('\\n🎭 Bot Permissions:');
    console.log('- Highest Role:', bot.roles.highest.name);
    console.log('- Role Position:', bot.roles.highest.position);
    console.log('- MANAGE_ROLES:', bot.permissions.has(PermissionFlagsBits.ManageRoles) ? '✅' : '❌');
    console.log('- MODERATE_MEMBERS:', bot.permissions.has(PermissionFlagsBits.ModerateMembers) ? '✅' : '❌');
    console.log('- ADMINISTRATOR:', bot.permissions.has(PermissionFlagsBits.Administrator) ? '✅' : '❌');
    
    console.log('\\n🔍 Role Analysis:');
    
    // Check auto role
    const autoRoleId = process.env.AUTO_ROLE_ID;
    if (autoRoleId) {
        const autoRole = guild.roles.cache.get(autoRoleId);
        if (autoRole) {
            const canManage = autoRole.position < bot.roles.highest.position;
            console.log(`- Auto Role: ${autoRole.name} ${canManage ? '✅' : '❌'} (Pos: ${autoRole.position})`);
        } else {
            console.log('- Auto Role: ❌ Role ID not found in guild');
        }
    } else {
        console.log('- Auto Role: ⚠️ Not configured');
    }
    
    // Check mute role
    const muteRole = guild.roles.cache.find(role => role.name === 'Muted');
    if (muteRole) {
        const canManage = muteRole.position < bot.roles.highest.position;
        console.log(`- Mute Role: ${canManage ? '✅' : '❌'} (Pos: ${muteRole.position})`);
    } else {
        console.log('- Mute Role: ⚠️ Not found');
    }
    
    // Check voice roles
    const voiceRoles = ['Voice Newcomer', 'Voice Regular', 'Voice Enthusiast', 'Voice Expert', 'Voice Master', 'Voice Legend'];
    let voiceRoleIssues = 0;
    
    console.log('\\n🎤 Voice Roles:');
    voiceRoles.forEach(roleName => {
        const role = guild.roles.cache.find(r => r.name === roleName);
        if (role) {
            const canManage = role.position < bot.roles.highest.position;
            console.log(`- ${roleName}: ${canManage ? '✅' : '❌'} (Pos: ${role.position})`);
            if (!canManage) voiceRoleIssues++;
        } else {
            console.log(`- ${roleName}: ⚠️ Not found`);
            voiceRoleIssues++;
        }
    });
    
    // Final assessment
    console.log('\\n🎯 Final Assessment:');
    
    const hasManageRoles = bot.permissions.has(PermissionFlagsBits.ManageRoles);
    const hasModerateMembers = bot.permissions.has(PermissionFlagsBits.ModerateMembers);
    const rolePosition = bot.roles.highest.position;
    
    if (!hasManageRoles) {
        console.log('❌ CRITICAL: Bot missing MANAGE_ROLES permission');
    }
    
    if (!hasModerateMembers) {
        console.log('❌ WARNING: Bot missing MODERATE_MEMBERS permission (needed for timeouts)');
    }
    
    if (rolePosition < 2) {
        console.log('❌ CRITICAL: Bot role position too low - move it higher in server settings');
    }
    
    if (voiceRoleIssues > 0) {
        console.log(`⚠️ WARNING: ${voiceRoleIssues} voice role issues detected`);
    }
    
    const problematicRoles = guild.roles.cache
        .filter(role => role.name !== '@everyone' && role.position >= rolePosition)
        .size;
        
    if (problematicRoles > 0) {
        console.log(`⚠️ WARNING: ${problematicRoles} roles are higher than bot role`);
    }
    
    if (hasManageRoles && hasModerateMembers && rolePosition >= 2 && problematicRoles === 0) {
        console.log('\\n🎉 EXCELLENT: Bot setup looks perfect!');
        console.log('✅ All role assignments should work properly');
    } else {
        console.log('\\n🔧 NEEDS FIXES: Some issues detected above');
        console.log('💡 Fix these issues for proper role functionality');
    }
    
    console.log('\\n✅ Bot check completed successfully!');
    process.exit(0);
});

client.on('error', error => {
    clearTimeout(timeout);
    console.error('\\n❌ Discord Client Error:', error.message);
    console.log('💡 This usually indicates:');
    console.log('  - Invalid token');
    console.log('  - Missing bot permissions');
    console.log('  - Rate limiting issues');
    process.exit(1);
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
    clearTimeout(timeout);
    console.error('\\n❌ Login Error:', error.message);
    console.log('💡 Check your DISCORD_TOKEN in .env file');
    process.exit(1);
});
