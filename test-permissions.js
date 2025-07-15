const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', async () => {
    try {
        const guild = client.guilds.cache.first();
        if (!guild) {
            console.log('No guild found');
            process.exit(1);
        }
        
        const botMember = guild.members.me;
        console.log('Bot User:', client.user.tag);
        console.log('Guild:', guild.name);
        console.log('Bot Highest Role:', botMember.roles.highest.name, '(Position:', botMember.roles.highest.position + ')');
        console.log('Bot Permissions:', botMember.permissions.toArray().join(', '));
        
        const hasManageRoles = botMember.permissions.has(PermissionFlagsBits.ManageRoles);
        const hasModerateMembers = botMember.permissions.has(PermissionFlagsBits.ModerateMembers);
        
        console.log('Has MANAGE_ROLES:', hasManageRoles);
        console.log('Has MODERATE_MEMBERS:', hasModerateMembers);
        
        const roles = guild.roles.cache
            .filter(role => role.name !== '@everyone')
            .sort((a, b) => b.position - a.position)
            .first(10);
            
        console.log('\nTop 10 roles in server:');
        roles.forEach(role => {
            const canManage = role.position < botMember.roles.highest.position;
            console.log(`- ${role.name} (Position: ${role.position}) - Can manage: ${canManage}`);
        });
        
        // Test creating a role
        console.log('\nTesting role creation...');
        try {
            const testRole = await guild.roles.create({
                name: 'Test-Role-' + Date.now(),
                color: '#FF0000',
                reason: 'Testing role creation'
            });
            console.log('✅ Successfully created test role:', testRole.name);
            
            // Try to delete it
            await testRole.delete('Cleaning up test role');
            console.log('✅ Successfully deleted test role');
        } catch (error) {
            console.log('❌ Failed to create/delete test role:', error.message);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
