const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
    
    try {
        const guild = client.guilds.cache.first();
        if (!guild) {
            console.log('❌ No guild found');
            process.exit(1);
        }
        
        console.log(`🏰 Testing in guild: ${guild.name}`);
        
        const botMember = guild.members.me;
        console.log(`🎭 Bot highest role: ${botMember.roles.highest.name} (Position: ${botMember.roles.highest.position})`);
        
        // Check permissions
        const hasManageRoles = botMember.permissions.has(PermissionFlagsBits.ManageRoles);
        const hasModerateMembers = botMember.permissions.has(PermissionFlagsBits.ModerateMembers);
        
        console.log(`🔑 MANAGE_ROLES: ${hasManageRoles ? '✅' : '❌'}`);
        console.log(`🔑 MODERATE_MEMBERS: ${hasModerateMembers ? '✅' : '❌'}`);
        
        // Check important roles
        console.log('\\n🔍 Checking important roles:');
        
        // Auto role
        const autoRoleId = process.env.AUTO_ROLE_ID;
        if (autoRoleId) {
            const autoRole = guild.roles.cache.get(autoRoleId);
            if (autoRole) {
                const canManage = autoRole.position < botMember.roles.highest.position;
                console.log(`├─ Auto Role (${autoRole.name}): ${canManage ? '✅' : '❌'} - Position: ${autoRole.position}`);
            } else {
                console.log(`├─ Auto Role: ❌ - Role ID not found`);
            }
        } else {
            console.log(`├─ Auto Role: ⚠️ - Not configured`);
        }
        
        // Mute role
        const muteRole = guild.roles.cache.find(role => role.name === 'Muted');
        if (muteRole) {
            const canManage = muteRole.position < botMember.roles.highest.position;
            console.log(`├─ Mute Role: ${canManage ? '✅' : '❌'} - Position: ${muteRole.position}`);
        } else {
            console.log(`├─ Mute Role: ⚠️ - Not found`);
        }
        
        // Voice roles
        const voiceRoles = ['Voice Newcomer', 'Voice Regular', 'Voice Enthusiast', 'Voice Expert', 'Voice Master', 'Voice Legend'];
        console.log('└─ Voice Roles:');
        voiceRoles.forEach((roleName, index) => {
            const role = guild.roles.cache.find(r => r.name === roleName);
            if (role) {
                const canManage = role.position < botMember.roles.highest.position;
                const prefix = index === voiceRoles.length - 1 ? '   └─' : '   ├─';
                console.log(`${prefix} ${roleName}: ${canManage ? '✅' : '❌'} - Position: ${role.position}`);
            } else {
                const prefix = index === voiceRoles.length - 1 ? '   └─' : '   ├─';
                console.log(`${prefix} ${roleName}: ⚠️ - Not found`);
            }
        });
        
        // Check hierarchy issues
        const problematicRoles = guild.roles.cache
            .filter(role => role.name !== '@everyone' && role.position >= botMember.roles.highest.position)
            .sort((a, b) => b.position - a.position)
            .first(5);
            
        if (problematicRoles.size > 0) {
            console.log('\\n⚠️ ROLES HIGHER THAN BOT (cannot manage):');
            problematicRoles.forEach(role => {
                console.log(`   ❌ ${role.name} (Position: ${role.position})`);
            });
            console.log(`\\n💡 SOLUTION: Move the bot's role higher in the server settings`);
        } else {
            console.log('\\n✅ Role hierarchy looks good!');
        }
        
        console.log('\\n🎯 QUICK FIXES:');
        if (!hasManageRoles) {
            console.log('❌ Grant bot MANAGE_ROLES permission');
        }
        if (!hasModerateMembers) {
            console.log('❌ Grant bot MODERATE_MEMBERS permission');
        }
        if (problematicRoles.size > 0) {
            console.log('❌ Move bot role higher in server settings');
        }
        if (hasManageRoles && problematicRoles.size === 0) {
            console.log('✅ Bot should be able to assign/remove roles properly!');
        }
        
    } catch (error) {
        console.error('❌ Error during test:', error);
    }
    
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
