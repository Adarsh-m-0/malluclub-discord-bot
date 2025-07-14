const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Manage automatic role assignment')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set the auto-role for new members')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to automatically assign to new members')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove auto-role assignment'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check current auto-role settings'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('apply')
                .setDescription('Apply auto-role to all current members without roles')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to apply to members')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'set':
                await handleSetAutoRole(interaction);
                break;
            case 'remove':
                await handleRemoveAutoRole(interaction);
                break;
            case 'status':
                await handleStatusAutoRole(interaction);
                break;
            case 'apply':
                await handleApplyRole(interaction);
                break;
        }
    },
};

async function handleSetAutoRole(interaction) {
    const role = interaction.options.getRole('role');
    
    // Check if bot can assign this role
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({
            content: '❌ I cannot assign this role as it is higher than or equal to my highest role.',
            ephemeral: true
        });
    }
    
    // Check if the role is @everyone
    if (role.id === interaction.guild.id) {
        return interaction.reply({
            content: '❌ Cannot set @everyone as auto-role.',
            ephemeral: true
        });
    }
    
    try {
        // Store in environment variable or database (for this example, we'll use a simple approach)
        // In a production bot, you'd want to store this in your database
        process.env.AUTO_ROLE_ID = role.id;
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Auto-Role Set')
            .setDescription(`Auto-role has been set to ${role}`)
            .addFields(
                { name: 'Role Name', value: role.name, inline: true },
                { name: 'Role ID', value: role.id, inline: true },
                { name: 'Members with Role', value: role.members.size.toString(), inline: true }
            )
            .setFooter({ text: 'New members will automatically receive this role' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error setting auto-role:', error);
        await interaction.reply({
            content: '❌ An error occurred while setting the auto-role.',
            ephemeral: true
        });
    }
}

async function handleRemoveAutoRole(interaction) {
    if (!process.env.AUTO_ROLE_ID) {
        return interaction.reply({
            content: '❌ No auto-role is currently set.',
            ephemeral: true
        });
    }
    
    const oldRoleId = process.env.AUTO_ROLE_ID;
    const oldRole = interaction.guild.roles.cache.get(oldRoleId);
    
    process.env.AUTO_ROLE_ID = '';
    
    const embed = new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('🗑️ Auto-Role Removed')
        .setDescription('Auto-role assignment has been disabled')
        .addFields({
            name: 'Previous Auto-Role',
            value: oldRole ? oldRole.name : 'Unknown Role',
            inline: true
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleStatusAutoRole(interaction) {
    const autoRoleId = process.env.AUTO_ROLE_ID;
    
    if (!autoRoleId) {
        const embed = new EmbedBuilder()
            .setColor(0xFFAA00)
            .setTitle('📋 Auto-Role Status')
            .setDescription('**Status:** Disabled')
            .addFields({
                name: 'ℹ️ Information',
                value: 'No auto-role is currently set. Use `/autorole set` to configure one.',
                inline: false
            })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
    
    const autoRole = interaction.guild.roles.cache.get(autoRoleId);
    
    if (!autoRole) {
        process.env.AUTO_ROLE_ID = ''; // Clear invalid role
        return interaction.reply({
            content: '⚠️ Auto-role was set but the role no longer exists. Auto-role has been disabled.',
            ephemeral: true
        });
    }
    
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Auto-Role Status')
        .setDescription('**Status:** Enabled ✅')
        .addFields(
            { name: 'Current Auto-Role', value: `${autoRole} (${autoRole.name})`, inline: false },
            { name: 'Role ID', value: autoRole.id, inline: true },
            { name: 'Members with Role', value: autoRole.members.size.toString(), inline: true },
            { name: 'Role Position', value: autoRole.position.toString(), inline: true },
            { name: 'Role Color', value: autoRole.hexColor, inline: true },
            { name: 'Created', value: `<t:${Math.floor(autoRole.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'Mentionable', value: autoRole.mentionable ? 'Yes' : 'No', inline: true }
        )
        .setFooter({ text: 'This role will be automatically assigned to new members' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleApplyRole(interaction) {
    const role = interaction.options.getRole('role');
    
    // Check if bot can assign this role
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({
            content: '❌ I cannot assign this role as it is higher than or equal to my highest role.',
            ephemeral: true
        });
    }
    
    await interaction.deferReply();
    
    try {
        // Get all members without the role
        await interaction.guild.members.fetch();
        const membersToUpdate = interaction.guild.members.cache.filter(member => 
            !member.user.bot && !member.roles.cache.has(role.id)
        );
        
        if (membersToUpdate.size === 0) {
            return interaction.editReply({
                content: `✅ All members already have the ${role.name} role.`
            });
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        // Apply role to members in batches to avoid rate limits
        const batchSize = 10;
        const batches = [];
        const memberArray = Array.from(membersToUpdate.values());
        
        for (let i = 0; i < memberArray.length; i += batchSize) {
            batches.push(memberArray.slice(i, i + batchSize));
        }
        
        for (const batch of batches) {
            const promises = batch.map(async (member) => {
                try {
                    await member.roles.add(role, 'Bulk role application');
                    successCount++;
                } catch (error) {
                    console.error(`Failed to add role to ${member.user.tag}:`, error);
                    errorCount++;
                }
            });
            
            await Promise.all(promises);
            
            // Add a small delay between batches to respect rate limits
            if (batches.indexOf(batch) < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        const embed = new EmbedBuilder()
            .setColor(successCount > errorCount ? 0x00FF00 : 0xFFAA00)
            .setTitle('🎭 Bulk Role Application Complete')
            .setDescription(`Applied ${role} to eligible members`)
            .addFields(
                { name: '✅ Successful', value: successCount.toString(), inline: true },
                { name: '❌ Failed', value: errorCount.toString(), inline: true },
                { name: '📊 Total Processed', value: (successCount + errorCount).toString(), inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error applying roles:', error);
        await interaction.editReply({
            content: '❌ An error occurred while applying roles to members.'
        });
    }
}
