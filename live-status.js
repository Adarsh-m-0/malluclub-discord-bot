const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

// Create a simple test client to check current bot status
const testClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

console.log('🔍 Live Bot Status Check');
console.log('=======================');

testClient.once('ready', async () => {
    try {
        const guild = testClient.guilds.cache.first();
        if (!guild) {
            console.log('❌ No guild found');
            process.exit(1);
        }
        
        console.log('🏰 Server:', guild.name);
        console.log('👥 Members:', guild.memberCount);
        
        // Get bot member info
        const bot = guild.members.me;
        console.log('\\n🤖 Bot Status:');
        console.log('- Name:', testClient.user.tag);
        console.log('- Status:', bot.presence?.status || 'Unknown');
        console.log('- Highest Role:', bot.roles.highest.name);
        console.log('- Role Position:', bot.roles.highest.position);
        
        // Check permissions
        const permissions = bot.permissions;
        console.log('\\n🔑 Key Permissions:');
        console.log('- MANAGE_ROLES:', permissions.has(PermissionFlagsBits.ManageRoles) ? '✅ Yes' : '❌ No');
        console.log('- MODERATE_MEMBERS:', permissions.has(PermissionFlagsBits.ModerateMembers) ? '✅ Yes' : '❌ No');
        console.log('- ADMINISTRATOR:', permissions.has(PermissionFlagsBits.Administrator) ? '✅ Yes' : '❌ No');
        console.log('- MANAGE_CHANNELS:', permissions.has(PermissionFlagsBits.ManageChannels) ? '✅ Yes' : '❌ No');
        
        // Test critical roles
        console.log('\\n🎭 Critical Roles Status:');
        
        // Auto role
        const autoRoleId = process.env.AUTO_ROLE_ID;
        if (autoRoleId) {
            const autoRole = guild.roles.cache.get(autoRoleId);
            if (autoRole) {
                const canManage = autoRole.position < bot.roles.highest.position;
                console.log(`✅ Auto Role: ${autoRole.name} (${canManage ? 'Manageable' : 'Too High'})`);
            } else {
                console.log('❌ Auto Role: Not found');
            }
        } else {
            console.log('⚠️ Auto Role: Not configured');
        }
        
        // Mute role
        const muteRole = guild.roles.cache.find(r => r.name === 'Muted');
        if (muteRole) {
            const canManage = muteRole.position < bot.roles.highest.position;
            console.log(`${canManage ? '✅' : '❌'} Mute Role: Found (${canManage ? 'Manageable' : 'Too High'})`);
        } else {
            console.log('⚠️ Mute Role: Not found - will be created when needed');
        }
        
        // Voice roles
        const voiceRoleNames = ['Voice Newcomer', 'Voice Regular', 'Voice Enthusiast', 'Voice Expert', 'Voice Master', 'Voice Legend'];
        const foundVoiceRoles = voiceRoleNames.filter(name => 
            guild.roles.cache.find(r => r.name === name)
        );
        
        console.log(`${foundVoiceRoles.length > 0 ? '✅' : '⚠️'} Voice Roles: ${foundVoiceRoles.length}/${voiceRoleNames.length} found`);
        
        if (foundVoiceRoles.length > 0) {
            foundVoiceRoles.forEach(name => {
                const role = guild.roles.cache.find(r => r.name === name);
                const canManage = role.position < bot.roles.highest.position;
                console.log(`  - ${name}: ${canManage ? '✅' : '❌'}`);
            });
        }
        
        // Overall assessment
        console.log('\\n🎯 Assessment:');
        const hasManageRoles = permissions.has(PermissionFlagsBits.ManageRoles);
        const hasModerateMembers = permissions.has(PermissionFlagsBits.ModerateMembers);
        
        if (hasManageRoles && hasModerateMembers) {
            console.log('✅ Bot has essential permissions');
        } else {
            console.log('❌ Bot missing critical permissions');
        }
        
        const higherRoles = guild.roles.cache.filter(r => 
            r.name !== '@everyone' && r.position >= bot.roles.highest.position
        ).size;
        
        if (higherRoles === 0) {
            console.log('✅ Bot can manage all server roles');
        } else {
            console.log(`⚠️ ${higherRoles} roles are higher than bot role`);
        }
        
        // Test role assignment capability
        console.log('\\n🧪 Quick Role Test:');
        try {
            // Find a test member (non-bot, not server owner)
            const testMember = guild.members.cache
                .filter(m => !m.user.bot && m.id !== guild.ownerId)
                .first();
                
            if (testMember && autoRoleId) {
                const autoRole = guild.roles.cache.get(autoRoleId);
                if (autoRole && !testMember.roles.cache.has(autoRole.id)) {
                    console.log(`✅ Can test role assignment on ${testMember.user.tag}`);
                } else {
                    console.log('ℹ️ Test member already has auto role');
                }
            } else {
                console.log('ℹ️ No suitable test member found');
            }
        } catch (error) {
            console.log('❌ Role test error:', error.message);
        }
        
        console.log('\\n🎉 Live status check complete!');
        
    } catch (error) {
        console.error('❌ Error during live check:', error);
    }
    
    process.exit(0);
});

testClient.on('error', error => {
    console.error('❌ Client error:', error.message);
    process.exit(1);
});

testClient.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Login error:', error.message);
    process.exit(1);
});
