const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ModerationLog = require('../../models/ModerationLog');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Manage server roles')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new role')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name of the role')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Hex color code (e.g., #FF0000)')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('mentionable')
                        .setDescription('Whether the role can be mentioned')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('hoist')
                        .setDescription('Whether to display role separately in member list')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to delete')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a role to a member')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to add role to')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a role from a member')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to remove role from')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get information about a role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to get information about')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all roles in the server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('members')
                .setDescription('List members with a specific role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to check members for')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create':
                    await handleCreateRole(interaction);
                    break;
                case 'delete':
                    await handleDeleteRole(interaction);
                    break;
                case 'add':
                    await handleAddRole(interaction);
                    break;
                case 'remove':
                    await handleRemoveRole(interaction);
                    break;
                case 'info':
                    await handleRoleInfo(interaction);
                    break;
                case 'list':
                    await handleListRoles(interaction);
                    break;
                case 'members':
                    await handleRoleMembers(interaction);
                    break;
            }
        } catch (error) {
            console.error('Role command error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while executing the role command.',
                    ephemeral: true
                });
            }
        }
    },
};

async function handleCreateRole(interaction) {
    const name = interaction.options.getString('name');
    const color = interaction.options.getString('color') || '#99AAB5';
    const mentionable = interaction.options.getBoolean('mentionable') ?? false;
    const hoist = interaction.options.getBoolean('hoist') ?? false;

    // Validate color format
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorRegex.test(color)) {
        return interaction.reply({
            content: '❌ Invalid color format. Please use hex format like #FF0000',
            ephemeral: true
        });
    }

    try {
        const role = await interaction.guild.roles.create({
            name: name,
            color: color,
            mentionable: mentionable,
            hoist: hoist,
            reason: `Role created by ${interaction.user.tag}`
        });

        const embed = new EmbedBuilder()
            .setColor(role.color)
            .setTitle('✅ Role Created')
            .setDescription(`Successfully created role ${role}`)
            .addFields(
                { name: 'Name', value: role.name, inline: true },
                { name: 'ID', value: role.id, inline: true },
                { name: 'Color', value: role.hexColor, inline: true },
                { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
                { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
                { name: 'Position', value: role.position.toString(), inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Error creating role:', error);
        await interaction.reply({
            content: '❌ Failed to create role. Check my permissions and try again.',
            ephemeral: true
        });
    }
}

async function handleDeleteRole(interaction) {
    const role = interaction.options.getRole('role');

    // Safety checks
    if (role.id === interaction.guild.id) {
        return interaction.reply({
            content: '❌ Cannot delete the @everyone role.',
            ephemeral: true
        });
    }

    if (role.managed) {
        return interaction.reply({
            content: '❌ Cannot delete managed roles (bot roles, boost roles, etc.).',
            ephemeral: true
        });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({
            content: '❌ Cannot delete roles higher than or equal to my highest role.',
            ephemeral: true
        });
    }

    const memberCount = role.members.size;

    try {
        const roleName = role.name;
        await role.delete(`Role deleted by ${interaction.user.tag}`);

        const embed = new EmbedBuilder()
            .setColor(0xFF6B6B)
            .setTitle('🗑️ Role Deleted')
            .setDescription(`Successfully deleted role **${roleName}**`)
            .addFields(
                { name: 'Members Affected', value: memberCount.toString(), inline: true },
                { name: 'Deleted by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Error deleting role:', error);
        await interaction.reply({
            content: '❌ Failed to delete role. Check my permissions and try again.',
            ephemeral: true
        });
    }
}

async function handleAddRole(interaction) {
    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    
    // Fetch member with error handling
    let member;
    try {
        member = await interaction.guild.members.fetch(user.id);
    } catch (fetchError) {
        return interaction.reply({
            content: '❌ User not found in this server or failed to fetch member data.',
            ephemeral: true
        });
    }

    if (!member) {
        return interaction.reply({
            content: '❌ User not found in this server.',
            ephemeral: true
        });
    }

    if (member.roles.cache.has(role.id)) {
        return interaction.reply({
            content: `❌ ${user.username} already has the ${role.name} role.`,
            ephemeral: true
        });
    }

    // Check if role is @everyone
    if (role.id === interaction.guild.id) {
        return interaction.reply({
            content: '❌ Cannot assign the @everyone role.',
            ephemeral: true
        });
    }

    // Check if role is managed
    if (role.managed) {
        return interaction.reply({
            content: '❌ Cannot assign managed roles (bot roles, boost roles, etc.).',
            ephemeral: true
        });
    }

    // Check bot permissions
    const botMember = interaction.guild.members.me;
    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({
            content: '❌ I don\'t have permission to manage roles.',
            ephemeral: true
        });
    }

    // Check role hierarchy
    if (role.position >= botMember.roles.highest.position) {
        return interaction.reply({
            content: `❌ Cannot assign roles higher than or equal to my highest role.\nMy highest role: **${botMember.roles.highest.name}** (Position: ${botMember.roles.highest.position})\nTarget role: **${role.name}** (Position: ${role.position})`,
            ephemeral: true
        });
    }

    try {
        await member.roles.add(role, `Role added by ${interaction.user.tag}`);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Role Added')
            .setDescription(`Successfully added ${role} to ${user}`)
            .addFields(
                { name: 'User', value: `${user.tag}`, inline: true },
                { name: 'Role', value: role.name, inline: true },
                { name: 'Added by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Error adding role:', error);
        
        // Provide more specific error messages
        let errorMessage = '❌ Failed to add role.';
        if (error.code === 50013) {
            errorMessage = '❌ Missing permissions to assign this role.';
        } else if (error.code === 50001) {
            errorMessage = '❌ Access denied - cannot assign this role.';
        } else if (error.code === 50034) {
            errorMessage = '❌ Cannot assign roles to users who have left the server.';
        }
        
        await interaction.reply({
            content: errorMessage + ' Check my permissions and role hierarchy.',
            ephemeral: true
        });
    }
}

async function handleRemoveRole(interaction) {
    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const member = await interaction.guild.members.fetch(user.id);

    if (!member) {
        return interaction.reply({
            content: '❌ User not found in this server.',
            ephemeral: true
        });
    }

    if (!member.roles.cache.has(role.id)) {
        return interaction.reply({
            content: `❌ ${user.username} doesn't have the ${role.name} role.`,
            ephemeral: true
        });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({
            content: '❌ Cannot manage roles higher than or equal to my highest role.',
            ephemeral: true
        });
    }

    try {
        await member.roles.remove(role, `Role removed by ${interaction.user.tag}`);

        const embed = new EmbedBuilder()
            .setColor(0xFF6B6B)
            .setTitle('➖ Role Removed')
            .setDescription(`Successfully removed ${role} from ${user}`)
            .addFields(
                { name: 'User', value: `${user.tag}`, inline: true },
                { name: 'Role', value: role.name, inline: true },
                { name: 'Removed by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Error removing role:', error);
        await interaction.reply({
            content: '❌ Failed to remove role. Check my permissions and try again.',
            ephemeral: true
        });
    }
}

async function handleRoleInfo(interaction) {
    const role = interaction.options.getRole('role');

    const permissions = role.permissions.toArray();
    const permissionsList = permissions.length > 0 
        ? permissions.slice(0, 10).join(', ') + (permissions.length > 10 ? '...' : '')
        : 'None';

    const embed = new EmbedBuilder()
        .setColor(role.color)
        .setTitle(`📋 Role Information: ${role.name}`)
        .addFields(
            { name: 'Name', value: role.name, inline: true },
            { name: 'ID', value: role.id, inline: true },
            { name: 'Color', value: role.hexColor, inline: true },
            { name: 'Position', value: role.position.toString(), inline: true },
            { name: 'Members', value: role.members.size.toString(), inline: true },
            { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
            { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
            { name: 'Managed', value: role.managed ? 'Yes' : 'No', inline: true },
            { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'Permissions', value: permissionsList, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleListRoles(interaction) {
    const roles = interaction.guild.roles.cache
        .filter(role => role.id !== interaction.guild.id) // Exclude @everyone
        .sort((a, b) => b.position - a.position)
        .map((role, index) => `${index + 1}. ${role} (${role.members.size} members)`)
        .slice(0, 20); // Limit to 20 roles to avoid embed limits

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📋 Server Roles (${interaction.guild.roles.cache.size - 1} total)`)
        .setDescription(roles.join('\n') || 'No roles found')
        .setFooter({ text: roles.length >= 20 ? 'Showing first 20 roles' : `Showing all ${roles.length} roles` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleRoleMembers(interaction) {
    const role = interaction.options.getRole('role');
    
    if (role.members.size === 0) {
        return interaction.reply({
            content: `❌ No members have the ${role.name} role.`,
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const members = role.members
        .map(member => `${member.user.tag} (${member.id})`)
        .slice(0, 50); // Limit to 50 members

    const embed = new EmbedBuilder()
        .setColor(role.color)
        .setTitle(`👥 Members with ${role.name} role`)
        .setDescription(members.join('\n') || 'No members found')
        .addFields({
            name: 'Statistics',
            value: `**Total Members:** ${role.members.size}\n**Showing:** ${members.length}`,
            inline: true
        })
        .setFooter({ text: members.length >= 50 ? 'Showing first 50 members' : `Showing all ${members.length} members` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

function getVoiceLevelFromRole(roleName) {
    const voiceLevels = {
        'Voice Newcomer': 5,
        'Voice Regular': 10,
        'Voice Enthusiast': 20,
        'Voice Expert': 35,
        'Voice Master': 50,
        'Voice Legend': 75
    };
    return voiceLevels[roleName] || null;
}
