const { EmbedBuilder, AuditLogEvent } = require('discord.js');
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

    // Update invite cache when a new invite is created (enhanced with audit log verification)
    async onInviteCreate(invite) {
        try {
            const guildInvites = this.inviteCache.get(invite.guild.id) || new Map();
            
            // Get inviter info from invite object or audit logs
            let actualInviter = invite.inviter;
            
            if (!actualInviter) {
                try {
                    const auditLogs = await invite.guild.fetchAuditLogs({
                        type: AuditLogEvent.InviteCreate,
                        limit: 5
                    });

                    const matchingEntry = auditLogs.entries.find(entry => 
                        Math.abs(entry.createdTimestamp - invite.createdTimestamp) < 5000 && // Within 5 seconds
                        entry.target?.code === invite.code
                    );

                    if (matchingEntry) {
                        actualInviter = matchingEntry.executor;
                    }
                } catch (auditError) {
                    logger.warn('Could not fetch audit logs for invite creation', {
                        category: 'invite-tracking',
                        guild: invite.guild.id,
                        inviteCode: invite.code
                    });
                }
            }
            
            guildInvites.set(invite.code, {
                uses: invite.uses,
                inviter: actualInviter,
                createdAt: invite.createdAt,
                maxUses: invite.maxUses,
                temporary: invite.temporary,
                maxAge: invite.maxAge,
                channel: invite.channel
            });
            
            this.inviteCache.set(invite.guild.id, guildInvites);

            // Log invite creation with enhanced information
            const logChannelId = process.env.INVITE_LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = invite.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('📨 Invite Created')
                        .setDescription(`**Code:** \`${invite.code}\`\n**URL:** https://discord.gg/${invite.code}`)
                        .addFields(
                            { name: '👤 Created By', value: actualInviter ? `${actualInviter} (${actualInviter.tag})` : '❓ Unknown', inline: true },
                            { name: '📍 Channel', value: `${invite.channel}`, inline: true },
                            { name: '🔢 Max Uses', value: invite.maxUses ? invite.maxUses.toString() : '∞ Unlimited', inline: true },
                            { name: '⏰ Expires', value: invite.maxAge ? `<t:${Math.floor((Date.now() + invite.maxAge * 1000) / 1000)}:R>` : '❌ Never', inline: true },
                            { name: '🚪 Temporary', value: invite.temporary ? '✅ Yes' : '❌ No', inline: true },
                            { name: '📊 Current Uses', value: '0', inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Invite Creation • Tracking System' });

                    await logChannel.send({ embeds: [embed] });
                }
            }

            logger.info(`Invite created: ${invite.code}`, {
                category: 'invite-tracking',
                guild: invite.guild.id,
                inviter: actualInviter?.id || 'unknown',
                inviterTag: actualInviter?.tag || 'unknown',
                channel: invite.channel.id,
                channelName: invite.channel.name,
                maxUses: invite.maxUses,
                temporary: invite.temporary
            });
        } catch (error) {
            logger.logError(error, {
                category: 'invite-tracking',
                context: 'Failed to handle invite creation',
                guild: invite.guild.id,
                inviteCode: invite.code
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

    // Find which invite was used when a member joins (enhanced with audit log support)
    async trackMemberJoin(member) {
        try {
            const currentInvites = await member.guild.invites.fetch();
            const cachedInvites = this.inviteCache.get(member.guild.id) || new Map();
            
            let usedInvite = null;
            let inviterInfo = null;
            let auditLogInviter = null;

            // Method 1: Compare current invites with cached invites
            for (const [code, currentInvite] of currentInvites) {
                const cachedInvite = cachedInvites.get(code);
                
                if (cachedInvite && currentInvite.uses > cachedInvite.uses) {
                    usedInvite = currentInvite;
                    inviterInfo = cachedInvite.inviter;
                    break;
                }
            }

            // Method 2: If no invite found through cache comparison, check audit logs
            if (!usedInvite) {
                try {
                    const auditLogs = await member.guild.fetchAuditLogs({
                        type: AuditLogEvent.InviteCreate,
                        limit: 10
                    });

                    // Look for recent invite creations that might be related
                    const recentInviteCreations = auditLogs.entries.filter(entry => 
                        Date.now() - entry.createdTimestamp < 60000 // Within last minute
                    );

                    if (recentInviteCreations.size > 0) {
                        const mostRecentInvite = recentInviteCreations.first();
                        auditLogInviter = mostRecentInvite.executor;
                        
                        // Try to find this invite in current invites
                        const matchingInvite = currentInvites.find(invite => 
                            invite.inviter?.id === mostRecentInvite.executor?.id &&
                            Math.abs(invite.createdTimestamp - mostRecentInvite.createdTimestamp) < 10000
                        );

                        if (matchingInvite) {
                            usedInvite = matchingInvite;
                            inviterInfo = auditLogInviter;
                        }
                    }
                } catch (auditError) {
                    logger.warn('Could not fetch audit logs for invite tracking', {
                        category: 'invite-tracking',
                        guild: member.guild.id,
                        error: auditError.message
                    });
                }
            }

            // Method 3: Check for vanity URL usage via audit logs
            if (!usedInvite) {
                try {
                    const memberAuditLogs = await member.guild.fetchAuditLogs({
                        type: AuditLogEvent.MemberJoin,
                        limit: 5
                    });

                    const memberJoinEntry = memberAuditLogs.entries.find(entry => 
                        entry.target?.id === member.id &&
                        Math.abs(Date.now() - entry.createdTimestamp) < 10000 // Within 10 seconds
                    );

                    if (memberJoinEntry && memberJoinEntry.changes) {
                        // Check if it was through vanity URL or other special invite
                        const inviteCodeChange = memberJoinEntry.changes.find(change => 
                            change.key === 'invite_code' || change.key === 'vanity_url_code'
                        );

                        if (inviteCodeChange) {
                            // This was likely a vanity URL join
                            usedInvite = { 
                                code: inviteCodeChange.new || 'vanity', 
                                uses: 'N/A',
                                channel: { name: 'Vanity URL' },
                                inviter: null
                            };
                        }
                    }
                } catch (memberAuditError) {
                    logger.warn('Could not fetch member join audit logs', {
                        category: 'invite-tracking',
                        guild: member.guild.id,
                        error: memberAuditError.message
                    });
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
                            { name: '📅 Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                            { name: '⏰ Joined At', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:f>`, inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Invite Tracking System' });

                    if (usedInvite && (inviterInfo || auditLogInviter)) {
                        const finalInviter = inviterInfo || auditLogInviter;
                        embed.setColor('#00FF00'); // Green for successful tracking
                        embed.addFields(
                            { name: '📨 Invite Code', value: `\`${usedInvite.code}\``, inline: true },
                            { name: '👤 Invited By', value: finalInviter ? `${finalInviter} (${finalInviter.tag})` : 'Unknown', inline: true },
                            { name: '🔢 Total Uses', value: usedInvite.uses?.toString() || 'N/A', inline: true }
                        );

                        if (usedInvite.channel && usedInvite.channel.name !== 'Vanity URL') {
                            embed.addFields({ name: '📍 Invite Channel', value: `${usedInvite.channel}`, inline: true });
                        }

                        // Add temporary member info if applicable
                        if (usedInvite.temporary) {
                            embed.addFields({ name: '⚠️ Temporary Member', value: 'Will be kicked when leaving voice/stage channels', inline: false });
                        }
                    } else {
                        embed.setColor('#FFA500'); // Orange for unknown invite
                        embed.addFields(
                            { name: '📨 Invite Used', value: '❓ Unknown/Untracked', inline: true },
                            { name: '👤 Invited By', value: '❓ Unknown', inline: true },
                            { name: '⚠️ Note', value: 'Could not determine invite source', inline: false }
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
                inviter: (inviterInfo || auditLogInviter)?.id || 'unknown',
                totalUses: usedInvite?.uses || 0,
                trackingMethod: usedInvite ? (inviterInfo ? 'cache' : 'audit-log') : 'unknown'
            });

            return {
                usedInvite,
                inviterInfo: inviterInfo || auditLogInviter,
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
