const mongoose = require('mongoose');

const userRolesSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    guildId: {
        type: String,
        required: true,
        index: true
    },
    username: {
        type: String,
        required: true
    },
    roles: [{
        roleId: String,
        roleName: String,
        assignedAt: Date,
        assignedBy: String, // Who assigned the role
        isAutoRole: Boolean, // If it's an auto-role
        isVoiceRole: Boolean, // If it's a voice XP role
        level: Number // For voice roles, what level it was earned at
    }],
    lastSeen: {
        type: Date,
        default: Date.now
    },
    leftServer: {
        type: Date,
        default: null
    },
    rejoinCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
userRolesSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Method to add a role
userRolesSchema.methods.addRole = function(roleId, roleName, assignedBy = 'System', isAutoRole = false, isVoiceRole = false, level = null) {
    // Check if role already exists
    const existingRole = this.roles.find(r => r.roleId === roleId);
    if (existingRole) {
        return false; // Role already exists
    }
    
    this.roles.push({
        roleId,
        roleName,
        assignedAt: new Date(),
        assignedBy,
        isAutoRole,
        isVoiceRole,
        level
    });
    
    return true;
};

// Method to remove a role
userRolesSchema.methods.removeRole = function(roleId) {
    this.roles = this.roles.filter(r => r.roleId !== roleId);
};

// Method to get roles that should be restored (excluding managed roles)
userRolesSchema.methods.getRolesToRestore = function() {
    return this.roles.filter(role => {
        // Don't restore these types of roles automatically
        const skipRoles = ['Muted', 'everyone'];
        return !skipRoles.includes(role.roleName);
    });
};

module.exports = mongoose.model('UserRoles', userRolesSchema);
