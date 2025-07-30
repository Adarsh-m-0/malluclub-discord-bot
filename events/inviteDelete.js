const { Events } = require('discord.js');
const inviteTracker = require('../utils/InviteTracker');

module.exports = {
    name: Events.InviteDelete,
    async execute(invite) {
        await inviteTracker.onInviteDelete(invite);
    },
};
