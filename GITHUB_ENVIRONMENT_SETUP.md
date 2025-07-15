# GitHub Environment Setup Guide

## Overview
GitHub Environments provide deployment protection rules and secrets management for your workflows. This guide will help you set up the "production" environment for your MalluClub Discord Bot.

## Step 1: Create the Production Environment

1. Go to your GitHub repository: `https://github.com/Adarsh-m-0/malluclub-discord-bot`
2. Click on **Settings** tab
3. In the left sidebar, click on **Environments**
4. Click **New environment**
5. Enter environment name: `production`
6. Click **Configure environment**

## Step 2: Configure Environment Protection Rules (Optional but Recommended)

In the environment configuration, you can set up:

### Deployment Protection Rules:
- **Required reviewers**: Add yourself or team members who must approve deployments
- **Wait timer**: Add a delay before deployment (e.g., 5 minutes)
- **Deployment branches**: Restrict to `main` branch only

### Recommended Settings:
```
✅ Required reviewers: Add your GitHub username
✅ Deployment branches: Selected branches → main
⚠️ Wait timer: 0 minutes (optional, can add 1-5 minutes for safety)
```

## Step 3: Add Environment Secrets

In the same environment configuration page, scroll down to **Environment secrets** and add all these secrets:

### Server Connection Secrets (CRITICAL):
```
CONTABO_HOST          = your-server-ip-address
CONTABO_USERNAME      = your-server-username (usually 'root')
CONTABO_SSH_KEY       = your-private-ssh-key-content
```

### Discord Bot Configuration (REQUIRED):
```
DISCORD_TOKEN         = your-discord-bot-token
CLIENT_ID             = your-discord-application-client-id
GUILD_ID              = your-discord-server-id
```

### Database Configuration (REQUIRED):
```
MONGODB_URI           = mongodb://localhost:27017/malluclub or your-mongodb-connection-string
```

### Channel Configuration (REQUIRED):
```
WELCOME_CHANNEL_ID    = your-welcome-channel-id
LOG_CHANNEL_ID        = your-log-channel-id
AUTO_ROLE_ID          = your-auto-role-id
```

### Optional Configuration:
```
OWNER_IDS             = comma-separated-list-of-owner-user-ids
VOICE_XP_RATE         = 1 (or your preferred XP rate)
DISCORD_WEBHOOK_URL   = your-discord-webhook-url-for-deployment-notifications
```

## Step 4: How to Add Each Secret

For each secret:
1. Click **Add secret**
2. Enter the **Name** (exactly as shown above)
3. Enter the **Value**
4. Click **Add secret**

### Important Notes:

#### For SSH Key (CONTABO_SSH_KEY):
- Use your **private key** content (not public key)
- Include the entire key including:
  ```
  -----BEGIN OPENSSH PRIVATE KEY-----
  [key content]
  -----END OPENSSH PRIVATE KEY-----
  ```

#### For Discord Token:
- Go to Discord Developer Portal
- Select your application
- Go to Bot section
- Copy the token

#### For Channel/Role IDs:
- Enable Developer Mode in Discord
- Right-click on channels/roles and "Copy ID"

## Step 5: Verify Environment Setup

After adding all secrets:
1. Go back to **Environments** in your repository settings
2. You should see **production** environment listed
3. Click on it to verify all secrets are added
4. The deployment workflow will now use this environment

## Step 6: Test Deployment

1. Commit any pending changes to your repository
2. Push to the `main` branch
3. Go to **Actions** tab to watch the deployment
4. The workflow should now run without environment errors

## Environment vs Repository Secrets

**Environment Secrets** (Recommended):
- ✅ Scoped to specific deployment environment
- ✅ Can have approval requirements
- ✅ Better security and organization
- ✅ Deployment protection rules

**Repository Secrets** (Alternative):
- ⚠️ Available to all workflows
- ⚠️ No approval requirements
- ⚠️ Less secure for production deployments

## Troubleshooting

If you still get environment errors:
1. Ensure environment name is exactly `production` (lowercase)
2. Verify all required secrets are added to the environment
3. Check that your workflow file has `environment: production` under the job
4. Make sure you're pushing to the `main` branch

## Security Best Practices

1. **Never commit secrets** to your repository
2. **Use environment secrets** instead of repository secrets for production
3. **Set up required reviewers** for production deployments
4. **Regularly rotate** your Discord bot token and SSH keys
5. **Monitor deployment logs** for any security issues

## Next Steps

After setting up the environment:
1. All deployments will require approval (if configured)
2. Secrets will be securely injected into your deployment
3. You'll have better audit trails for production deployments
4. Your bot will deploy automatically when you push to main

## Support

If you encounter issues:
1. Check the Actions tab for detailed error logs
2. Verify all secrets are correctly formatted
3. Ensure your Contabo server is accessible
4. Check PM2 status on your server: `pm2 status`
