const { Events } = require('discord.js');
const inviteTracker = require('../utils/InviteTracker');

module.exports = {
    name: Events.InviteCreate,
    async execute(invite) {
        await inviteTracker.onInviteCreate(invite);
    },
};
