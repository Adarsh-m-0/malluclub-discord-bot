# VC Active Role Setup

## How to Configure Your Role ID

### Step 1: Get Your Role ID

1. **In Discord:**
   - Go to your server settings
   - Click on "Roles"
   - Find or create a role named "vc active" (or whatever you want to call it)
   - Right-click on the role and select "Copy ID"
   - If you don't see "Copy ID", enable Developer Mode in Discord settings first

2. **Alternative Method:**
   - Type `\@rolename` in any channel (replace rolename with your actual role name)
   - Discord will show the role ID in the format `<@&1234567890123456789>`
   - Copy the numbers between `&` and `>`

### Step 2: Configure the Role ID

1. **Open the file:** `utils/VcActiveManager.js`
2. **Find this line:**
   ```javascript
   this.VC_ACTIVE_ROLE_ID = 'YOUR_ROLE_ID_HERE';
   ```
3. **Replace `YOUR_ROLE_ID_HERE` with your actual role ID:**
   ```javascript
   this.VC_ACTIVE_ROLE_ID = '1234567890123456789';
   ```

### Step 3: Test the System

1. **Run your bot**
2. **The system will automatically:**
   - Use the role ID you configured
   - If the role doesn't exist, it will create one and tell you the ID
   - Assign the role to the top 3 voice users every 6 hours

## Example Configuration

```javascript
class VcActiveManager {
    constructor() {
        this.MINIMUM_MINUTES = 30;
        this.ROLE_NAME = 'vc active';
        this.VC_ACTIVE_ROLE_ID = '1234567890123456789'; // Your role ID here
        this.TOP_USERS_COUNT = 3;
        this.STREAK_THRESHOLD = 3;
    }
}
```

## Benefits of Using Role ID

- ✅ **Faster performance** - Direct role lookup instead of searching
- ✅ **More reliable** - Won't break if role name changes
- ✅ **Case insensitive** - Works regardless of role name formatting
- ✅ **Automatic fallback** - Still works with role name if ID is wrong

## Troubleshooting

- **Role not found?** - Check that the role ID is correct
- **No permissions?** - Make sure bot has "Manage Roles" permission
- **Role not assigning?** - Check bot console for error messages
