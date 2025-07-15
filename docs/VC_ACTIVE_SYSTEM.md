# VC Active Role System

## Overview
The VC Active Role System automatically assigns the "vc active" role to the top 3 most active voice users each day. This system encourages voice activity and community engagement.

## Features

### 🎯 **Core Functionality**
- **Daily Role Assignment**: Top 3 voice users get the "vc active" role
- **Minimum Activity**: Users need at least 30 minutes of voice activity to qualify
- **Real-time Tracking**: Voice activity is tracked in real-time with XP integration
- **Streak System**: Users maintain streaks based on daily activity
- **Automatic Updates**: Roles are updated automatically 4 times daily

### 📊 **XP Integration**
- **Base Rate**: 0.5 XP per minute for muted users
- **Talking**: 1 XP per minute for unmuted users
- **Streaming**: 2 XP per minute for streaming users
- **Camera On**: 5 XP per minute for users with camera on
- **Real-time Updates**: XP and voice activity are tracked simultaneously

### 🏆 **Leaderboard System**
- **Daily Rankings**: View today's top voice users
- **Historical Data**: Check past performance up to 30 days
- **User Stats**: Individual voice activity statistics
- **Streak Tracking**: See current streaks and activity patterns

## Commands

### `/vcactive leaderboard`
View the voice activity leaderboard
- **Options**:
  - `days`: Days to look back (1-30, default: today)
  - `limit`: Number of users to show (1-25, default: 10)

### `/vcactive stats`
View voice activity statistics
- **Options**:
  - `user`: User to check stats for (admin only)
  - `days`: Days to look back (1-30, default: 7)

### `/vcactive update`
Manually update VC active roles (Admin only)
- Requires: Manage Roles permission
- Triggers immediate role update

### `/vcactive info`
Get information about the VC active system
- Shows system rules and requirements
- Displays XP rates and minimums

### `/vcactive setup`
Setup the VC active role system (Admin only)
- Requires: Manage Roles permission
- Creates the "vc active" role if it doesn't exist
- Initializes the system

## Automatic Scheduling

### 📅 **Update Schedule**
The system automatically updates roles at:
- **00:00 UTC** (Midnight)
- **06:00 UTC** (6 AM)
- **12:00 UTC** (12 PM)
- **18:00 UTC** (6 PM)

### 🔧 **Requirements**
- **Node Package**: `node-cron` (install with `npm install node-cron`)
- **Manual Updates**: Use `/vcactive update` if cron is not available

## Database Structure

### Daily Voice Activity Model
```javascript
{
  userId: String,
  guildId: String,
  username: String,
  date: Date,
  voiceMinutes: Number,
  xpEarned: Number,
  sessionsCount: Number,
  averageSessionLength: Number,
  lastActivity: Date,
  streak: Number,
  hadVcActiveRole: Boolean
}
```

## Installation Guide

### 1. Install Dependencies
```bash
npm install node-cron
```

### 2. Deploy Commands
```bash
node deploy-commands.js
```

### 3. Setup Role System
Use `/vcactive setup` in your Discord server

### 4. Test Manual Update
Use `/vcactive update` to test the system

## Configuration

### 🎚️ **Adjustable Settings**
- **Minimum Minutes**: 30 minutes (changeable in VcActiveManager.js)
- **Top Users Count**: 3 users (changeable in VcActiveManager.js)
- **Role Name**: "vc active" (changeable in VcActiveManager.js)
- **Role Color**: Green (changeable in VcActiveManager.js)

### 🛠️ **Customization**
Edit `utils/VcActiveManager.js` to modify:
- Minimum activity requirements
- Number of users who get the role
- Role appearance and permissions
- Update frequency settings

## Troubleshooting

### Common Issues

1. **Role Not Created**
   - Use `/vcactive setup` command
   - Ensure bot has Manage Roles permission
   - Check role hierarchy

2. **Automatic Updates Not Working**
   - Install node-cron: `npm install node-cron`
   - Check console for scheduler startup messages
   - Use manual updates as fallback

3. **XP Not Tracking**
   - Ensure voice state updates are working
   - Check XP system integration
   - Verify user permissions in voice channels

4. **Database Issues**
   - Check MongoDB connection
   - Verify model imports
   - Check for validation errors

### 📋 **Logs and Monitoring**
- Check console for scheduler status
- Monitor XP tracking logs
- Watch for role update confirmations
- Check database for activity records

## Future Enhancements

### Possible Additions
- **Weekly/Monthly Leaderboards**: Extended time periods
- **Rewards System**: Additional perks for top users
- **Activity Challenges**: Special events and competitions
- **Voice Quality Tracking**: Monitor different activity types
- **Integration with Other Systems**: Link to other bot features

### 🎯 **Goals**
- Increase voice channel activity
- Reward consistent users
- Build community engagement
- Provide fair competition system

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Review console logs
3. Test with manual updates first
4. Ensure all dependencies are installed
5. Verify bot permissions

The system is designed to be robust and handle various edge cases, but manual intervention may be needed for initial setup and troubleshooting.
