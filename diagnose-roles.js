const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const UserRoles = require('./models/UserRoles');
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

async function testRoleOperations() {
    try {
        const guild = client.guilds.cache.first();
        if (!guild) {
            console.log('❌ No guild found');
            return;
        }

        console.log('🏰 Guild:', guild.name);
        console.log('🤖 Bot:', client.user.tag);
        
        const botMember = guild.members.me;
        console.log('🎭 Bot Highest Role:', botMember.roles.highest.name, '(Position:', botMember.roles.highest.position + ')');
        
        // Check permissions
        const hasManageRoles = botMember.permissions.has(PermissionFlagsBits.ManageRoles);
        const hasModerateMembers = botMember.permissions.has(PermissionFlagsBits.ModerateMembers);
        const hasAdmin = botMember.permissions.has(PermissionFlagsBits.Administrator);
        
        console.log('\\n🔑 PERMISSIONS:');
        console.log('├─ MANAGE_ROLES:', hasManageRoles ? '✅' : '❌');
        console.log('├─ MODERATE_MEMBERS:', hasModerateMembers ? '✅' : '❌');
        console.log('└─ ADMINISTRATOR:', hasAdmin ? '✅' : '❌');

        // List role hierarchy
        console.log('\\n📋 ROLE HIERARCHY:');
        const roles = guild.roles.cache
            .filter(role => role.name !== '@everyone')
            .sort((a, b) => b.position - a.position)
            .first(15);
            
        roles.forEach((role, index) => {
            const canManage = role.position < botMember.roles.highest.position;
            const indicator = canManage ? '✅' : '❌';
            console.log(`${index === roles.size - 1 ? '└─' : '├─'} ${indicator} ${role.name} (Pos: ${role.position})`);
        });

        // Test role creation
        console.log('\\n🧪 TESTING ROLE CREATION:');
        try {
            const testRole = await guild.roles.create({
                name: 'DiagnosticTest-' + Date.now(),
                color: '#FF0000',
                reason: 'Role management diagnostic test'
            });
            console.log('✅ Role creation: SUCCESS');
            
            // Test role assignment
            console.log('\\n🧪 TESTING ROLE ASSIGNMENT:');
            const testMember = guild.members.cache
                .filter(m => !m.user.bot && m.id !== guild.ownerId)
                .first();
                
            if (testMember) {
                try {
                    await testMember.roles.add(testRole, 'Diagnostic test');
                    console.log('✅ Role assignment: SUCCESS');
                    
                    // Test role removal
                    await testMember.roles.remove(testRole, 'Diagnostic test cleanup');
                    console.log('✅ Role removal: SUCCESS');
                } catch (assignError) {
                    console.log('❌ Role assignment: FAILED -', assignError.message);
                }
            } else {
                console.log('⚠️ No suitable member found for testing');
            }
            
            // Clean up test role
            await testRole.delete('Cleaning up diagnostic test');
            console.log('✅ Role deletion: SUCCESS');
            
        } catch (createError) {
            console.log('❌ Role creation: FAILED -', createError.message);
        }

        // Test database operations
        console.log('\\n🧪 TESTING DATABASE OPERATIONS:');
        try {
            const testUserId = '123456789012345678';
            const testUserRoles = new UserRoles({
                userId: testUserId,
                guildId: guild.id,
                username: 'TestUser',
                roles: [{
                    roleId: '987654321098765432',
                    roleName: 'TestRole',
                    assignedAt: new Date(),
                    assignedBy: 'DiagnosticTest'
                }]
            });
            
            await testUserRoles.save();
            console.log('✅ Database save: SUCCESS');
            
            const retrieved = await UserRoles.findOne({ userId: testUserId });
            if (retrieved) {
                console.log('✅ Database retrieve: SUCCESS');
                
                await UserRoles.deleteOne({ userId: testUserId });
                console.log('✅ Database delete: SUCCESS');
            } else {
                console.log('❌ Database retrieve: FAILED');
            }
            
        } catch (dbError) {
            console.log('❌ Database operation: FAILED -', dbError.message);
        }

        // Check for common role issues
        console.log('\\n🔍 CHECKING FOR COMMON ISSUES:');
        
        // Check for Muted role
        const muteRole = guild.roles.cache.find(role => role.name === 'Muted');
        if (muteRole) {
            const canManageMute = muteRole.position < botMember.roles.highest.position;
            console.log(`├─ Muted role: ${canManageMute ? '✅' : '❌'} (Position: ${muteRole.position})`);
        } else {
            console.log('├─ Muted role: ⚠️ NOT FOUND');
        }
        
        // Check auto role
        const autoRoleId = process.env.AUTO_ROLE_ID;
        if (autoRoleId) {
            const autoRole = guild.roles.cache.get(autoRoleId);
            if (autoRole) {
                const canManageAuto = autoRole.position < botMember.roles.highest.position;
                console.log(`├─ Auto role (${autoRole.name}): ${canManageAuto ? '✅' : '❌'} (Position: ${autoRole.position})`);
            } else {
                console.log('├─ Auto role: ❌ ID NOT FOUND IN GUILD');
            }
        } else {
            console.log('├─ Auto role: ⚠️ NOT CONFIGURED');
        }
        
        // Check voice roles
        const voiceRoleNames = ['Voice Newcomer', 'Voice Regular', 'Voice Enthusiast', 'Voice Expert', 'Voice Master', 'Voice Legend'];
        console.log('└─ Voice roles:');
        voiceRoleNames.forEach((roleName, index) => {
            const role = guild.roles.cache.find(r => r.name === roleName);
            if (role) {
                const canManage = role.position < botMember.roles.highest.position;
                console.log(`   ${index === voiceRoleNames.length - 1 ? '└─' : '├─'} ${roleName}: ${canManage ? '✅' : '❌'} (Pos: ${role.position})`);
            } else {
                console.log(`   ${index === voiceRoleNames.length - 1 ? '└─' : '├─'} ${roleName}: ⚠️ NOT FOUND`);
            }
        });

        console.log('\\n🎯 RECOMMENDATIONS:');
        if (!hasManageRoles) {
            console.log('❌ Bot missing MANAGE_ROLES permission - Grant this permission');
        }
        if (!hasModerateMembers) {
            console.log('❌ Bot missing MODERATE_MEMBERS permission - Grant this permission for timeouts');
        }
        
        const problematicRoles = guild.roles.cache
            .filter(role => role.name !== '@everyone' && role.position >= botMember.roles.highest.position)
            .size;
            
        if (problematicRoles > 0) {
            console.log(`❌ ${problematicRoles} roles are higher than bot's highest role - Move bot role higher`);
        }
        
        if (problematicRoles === 0 && hasManageRoles) {
            console.log('✅ Role hierarchy looks good!');
        }

    } catch (error) {
        console.error('❌ Diagnostic error:', error);
    }
}

client.once('ready', async () => {
    await testRoleOperations();
    await mongoose.disconnect();
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
