const VoiceSession = require('../models/VoiceSession');
const User = require('../models/User');

describe('Voice XP System Tests', () => {
    beforeEach(async () => {
        // Clear test data
        await VoiceSession.deleteMany({});
        await User.deleteMany({});
    });

    test('should calculate XP correctly for 10-minute voice session', async () => {
        const userId = 'test-user-123';
        const guildId = 'test-guild-456';
        const channelId = 'test-channel-789';
        
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + 10 * 60 * 1000); // 10 minutes later
        
        // Create voice session
        const session = new VoiceSession({
            userId,
            guildId,
            channelId,
            startedAt: startTime,
            endedAt: endTime
        });
        
        await session.save();
        
        // Should have 10 XP (1 XP per minute)
        expect(session.xpEarned).toBe(10);
        expect(session.duration).toBe(10 * 60 * 1000); // 10 minutes in milliseconds
        expect(session.durationMinutes).toBe(10);
    });

    test('should aggregate voice XP correctly', async () => {
        const userId = 'test-user-123';
        const guildId = 'test-guild-456';
        
        // Create multiple sessions
        const sessions = [
            { startedAt: new Date('2025-01-01T10:00:00Z'), endedAt: new Date('2025-01-01T10:05:00Z') }, // 5 minutes
            { startedAt: new Date('2025-01-01T11:00:00Z'), endedAt: new Date('2025-01-01T11:10:00Z') }, // 10 minutes
            { startedAt: new Date('2025-01-01T12:00:00Z'), endedAt: new Date('2025-01-01T12:15:00Z') }  // 15 minutes
        ];
        
        for (const sessionData of sessions) {
            await VoiceSession.create({
                userId,
                guildId,
                channelId: 'test-channel',
                ...sessionData
            });
        }
        
        // Aggregate total XP
        const totalStats = await VoiceSession.aggregate([
            { $match: { userId, guildId } },
            { 
                $group: { 
                    _id: null, 
                    totalXP: { $sum: '$xpEarned' },
                    totalMinutes: { $sum: '$durationMinutes' },
                    sessionCount: { $sum: 1 }
                } 
            }
        ]);
        
        expect(totalStats[0].totalXP).toBe(30); // 5 + 10 + 15 = 30 XP
        expect(totalStats[0].totalMinutes).toBe(30);
        expect(totalStats[0].sessionCount).toBe(3);
    });

    test('should handle zero duration sessions', async () => {
        const session = new VoiceSession({
            userId: 'test-user',
            guildId: 'test-guild',
            channelId: 'test-channel',
            startedAt: new Date(),
            endedAt: new Date() // Same time = 0 duration
        });
        
        await session.save();
        
        expect(session.xpEarned).toBe(0);
        expect(session.duration).toBe(0);
    });

    test('should handle sessions without end time', async () => {
        const session = new VoiceSession({
            userId: 'test-user',
            guildId: 'test-guild',
            channelId: 'test-channel',
            startedAt: new Date()
            // No endedAt - active session
        });
        
        await session.save();
        
        expect(session.xpEarned).toBe(0);
        expect(session.endedAt).toBeNull();
    });
});
