const { EmbedBuilder } = require('discord.js');
const logger = require('./logger');

class InviteTracker {
    constructor() {
        this.inviteCache = new Map(); // Guild ID -> Map of invite codes -> invite data
    }

    // Initialize invite cache for a guild
    async initializeGuild(guild) {
        try {
            const invites = await guild.invites.fetch();
            const inviteMap = new Map();
            
            invites.forEach(invite => {
                inviteMap.set(invite.code, {
                    uses: invite.uses,
                    inviter: invite.inviter,
                    createdAt: invite.createdAt,
                    maxUses: invite.maxUses,
                    temporary: invite.temporary,
                    maxAge: invite.maxAge,
                    channel: invite.channel
                });
            });
            
            this.inviteCache.set(guild.id, inviteMap);
            
            logger.info(`Initialized invite tracking for guild: ${guild.name}`, {
                category: 'invite-tracking',
                guild: guild.id,
                inviteCount: invites.size
            });
        } catch (error) {
            logger.logError(error, {
                category: 'invite-tracking',
                context: 'Failed to initialize invite tracking',
                guild: guild.id
            });
        }
    }

    // Update invite cache when a new invite is created
    async onInviteCreate(invite) {
        try {
            const guildInvites = this.inviteCache.get(invite.guild.id) || new Map();
            
            guildInvites.set(invite.code, {
                uses: invite.uses,
                inviter: invite.inviter,
                createdAt: invite.createdAt,
                maxUses: invite.maxUses,
                temporary: invite.temporary,
                maxAge: invite.maxAge,
                channel: invite.channel
            });
            
            this.inviteCache.set(invite.guild.id, guildInvites);

            // Log invite creation
            const logChannelId = process.env.INVITE_LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = invite.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('📨 Invite Created')
                        .setDescription(`**Code:** \`${invite.code}\``)
                        .addFields(
                            { name: '👤 Created by', value: invite.inviter ? `${invite.inviter} (${invite.inviter.tag})` : 'Unknown', inline: true },
                            { name: '📍 Channel', value: `${invite.channel}`, inline: true },
                            { name: '🔢 Max Uses', value: invite.maxUses ? invite.maxUses.toString() : 'Unlimited', inline: true },
                            { name: '⏰ Expires', value: invite.maxAge ? `<t:${Math.floor((Date.now() + invite.maxAge * 1000) / 1000)}:R>` : 'Never', inline: true },
                            { name: '🚪 Temporary', value: invite.temporary ? 'Yes' : 'No', inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Invite Tracking' });

                    await logChannel.send({ embeds: [embed] });
                }
            }

            logger.info(`Invite created: ${invite.code}`, {
                category: 'invite-tracking',
                guild: invite.guild.id,
                inviter: invite.inviter?.id,
                channel: invite.channel.id
            });
        } catch (error) {
            logger.logError(error, {
                category: 'invite-tracking',
                context: 'Failed to handle invite creation',
                guild: invite.guild.id
            });
        }
    }

    // Update invite cache when an invite is deleted
    async onInviteDelete(invite) {
        try {
            const guildInvites = this.inviteCache.get(invite.guild.id);
            if (guildInvites) {
                const inviteData = guildInvites.get(invite.code);
                guildInvites.delete(invite.code);

                // Log invite deletion
                const logChannelId = process.env.INVITE_LOG_CHANNEL_ID;
                if (logChannelId) {
                    const logChannel = invite.guild.channels.cache.get(logChannelId);
                    if (logChannel) {
                        const embed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('🗑️ Invite Deleted')
                            .setDescription(`**Code:** \`${invite.code}\``)
                            .addFields(
                                { name: '👤 Originally created by', value: inviteData?.inviter ? `${inviteData.inviter.tag}` : 'Unknown', inline: true },
                                { name: '📍 Channel', value: `${invite.channel}`, inline: true },
                                { name: '🔢 Uses before deletion', value: inviteData?.uses?.toString() || '0', inline: true }
                            )
                            .setTimestamp()
                            .setFooter({ text: 'Invite Tracking' });

                        await logChannel.send({ embeds: [embed] });
                    }
                }

                logger.info(`Invite deleted: ${invite.code}`, {
                    category: 'invite-tracking',
                    guild: invite.guild.id,
                    originalInviter: inviteData?.inviter?.id
                });
            }
        } catch (error) {
            logger.logError(error, {
                category: 'invite-tracking',
                context: 'Failed to handle invite deletion',
                guild: invite.guild.id
            });
        }
    }

    // Find which invite was used when a member joins
    async trackMemberJoin(member) {
        try {
            const currentInvites = await member.guild.invites.fetch();
            const cachedInvites = this.inviteCache.get(member.guild.id) || new Map();
            
            let usedInvite = null;
            let inviterInfo = null;

            // Compare current invites with cached invites to find the one with increased uses
            for (const [code, currentInvite] of currentInvites) {
                const cachedInvite = cachedInvites.get(code);
                
                if (cachedInvite && currentInvite.uses > cachedInvite.uses) {
                    usedInvite = currentInvite;
                    inviterInfo = cachedInvite.inviter;
                    break;
                }
            }

            // Update the cache with current invites
            const newInviteMap = new Map();
            currentInvites.forEach(invite => {
                newInviteMap.set(invite.code, {
                    uses: invite.uses,
                    inviter: invite.inviter,
                    createdAt: invite.createdAt,
                    maxUses: invite.maxUses,
                    temporary: invite.temporary,
                    maxAge: invite.maxAge,
                    channel: invite.channel
                });
            });
            this.inviteCache.set(member.guild.id, newInviteMap);

            // Log the join with invite information
            const logChannelId = process.env.INVITE_LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = member.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor('#0099FF')
                        .setTitle('📥 Member Joined')
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: '👤 Member', value: `${member.user} (${member.user.tag})`, inline: false },
                            { name: '🆔 User ID', value: member.user.id, inline: true },
                            { name: '📅 Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Invite Tracking' });

                    if (usedInvite && inviterInfo) {
                        embed.addFields(
                            { name: '📨 Invite Used', value: `\`${usedInvite.code}\``, inline: true },
                            { name: '👤 Invited by', value: `${inviterInfo} (${inviterInfo.tag})`, inline: true },
                            { name: '🔢 Total Uses', value: usedInvite.uses.toString(), inline: true },
                            { name: '📍 Invite Channel', value: `${usedInvite.channel}`, inline: true }
                        );

                        // Add temporary member info if applicable
                        if (usedInvite.temporary) {
                            embed.addFields({ name: '⚠️ Temporary Member', value: 'This member will be kicked when they leave voice/stage channels', inline: false });
                        }
                    } else {
                        embed.addFields(
                            { name: '📨 Invite Used', value: 'Unknown/Vanity URL', inline: true },
                            { name: '👤 Invited by', value: 'Unknown', inline: true }
                        );
                    }

                    await logChannel.send({ embeds: [embed] });
                }
            }

            logger.info(`Member joined: ${member.user.tag}`, {
                category: 'invite-tracking',
                user: member.user.id,
                guild: member.guild.id,
                inviteCode: usedInvite?.code || 'unknown',
                inviter: inviterInfo?.id || 'unknown',
                totalUses: usedInvite?.uses || 0
            });

            return {
                usedInvite,
                inviterInfo,
                member
            };

        } catch (error) {
            logger.logError(error, {
                category: 'invite-tracking',
                context: 'Failed to track member join',
                user: member.user.id,
                guild: member.guild.id
            });
            
            return {
                usedInvite: null,
                inviterInfo: null,
                member
            };
        }
    }

    // Get invite statistics for a user
    async getInviteStats(guild, userId) {
        try {
            const invites = await guild.invites.fetch();
            const userInvites = invites.filter(invite => invite.inviter?.id === userId);
            
            let totalUses = 0;
            const inviteList = [];

            userInvites.forEach(invite => {
                totalUses += invite.uses;
                inviteList.push({
                    code: invite.code,
                    uses: invite.uses,
                    maxUses: invite.maxUses,
                    channel: invite.channel.name,
                    createdAt: invite.createdAt,
                    temporary: invite.temporary
                });
            });

            return {
                totalInvites: userInvites.size,
                totalUses,
                invites: inviteList
            };
        } catch (error) {
            logger.logError(error, {
                category: 'invite-tracking',
                context: 'Failed to get invite stats',
                user: userId,
                guild: guild.id
            });
            return null;
        }
    }
}

module.exports = new InviteTracker();
