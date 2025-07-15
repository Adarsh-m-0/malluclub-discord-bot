# VC Active Role - Startup Behavior

## What Happens When Bot Starts

### 🚀 **Immediate Role Assignment**
When you start the bot, it will:

1. **Load all modules** - VcActiveManager, DailyRoleScheduler, XPManager
2. **Initialize XP tracking** - For users already in voice channels
3. **Start the scheduler** - Set up 4 daily updates (00:00, 06:00, 12:00, 18:00 UTC)
4. **⚡ Run immediate role update** - After 5 seconds delay
5. **Continue scheduled updates** - Every 6 hours automatically

### 📊 **Initial Role Update Process**
```
Bot starts → Wait 5 seconds → Check all guilds → Assign roles
```

**What it does:**
- ✅ Checks existing voice activity data in MongoDB
- ✅ Identifies top 3 users with 30+ minutes today
- ✅ Assigns "vc active" role to qualifying users
- ✅ Removes role from users no longer in top 3
- ✅ Updates database with current role status

### 🎯 **Why This Matters**
- **No waiting period** - Users get roles immediately
- **Always current** - Roles reflect latest voice activity
- **Seamless restart** - Bot picks up where it left off
- **Fair competition** - Based on actual daily activity

### 📋 **Example Startup Sequence**
```
[12:00:00] Bot starting...
[12:00:01] ✅ Modules loaded
[12:00:02] ✅ XP tracking initialized (5 users in voice)
[12:00:03] ✅ Daily scheduler started
[12:00:04] ✅ Bot ready!
[12:00:05] ⚡ Running initial role update...
[12:00:06] ✅ Guild: MalluClub - Added 3, Removed 1 roles
[12:00:07] ✅ Initial update completed
[12:00:08] 🎉 All systems operational!
```

### ⚙️ **Configuration**
- **Delay**: 5 seconds after bot ready
- **Minimum activity**: 30 minutes to qualify
- **Top users**: 3 users get the role
- **Role name**: "vc active"
- **Role ID**: Set in VcActiveManager.js

### 🔄 **Continuous Operation**
After startup, the system continues with:
- **Real-time tracking** - Voice activity monitored
- **Scheduled updates** - Every 6 hours
- **Automatic management** - No manual intervention needed

## Ready to Use! 🚀
Your bot will now assign VC active roles immediately when it starts, ensuring users always have current and fair role assignments!
