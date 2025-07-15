# 🔄 Auto-Deployment Setup Guide

This guide will help you set up automatic deployment so your Contabo server bot updates whenever you push changes to GitHub.

## Method 1: GitHub Actions (Recommended)

### Setup on GitHub:

1. **Go to your repository settings:**
   - Navigate to `Settings` → `Secrets and variables` → `Actions`

2. **Add these secrets:**
   ```
   CONTABO_HOST = your-server-ip-address
   CONTABO_USERNAME = botuser
   CONTABO_SSH_KEY = your-private-ssh-key
   ```

3. **Generate SSH key on your local machine:**
   ```bash
   ssh-keygen -t rsa -b 4096 -C "github-actions"
   ```

4. **Copy public key to Contabo server:**
   ```bash
   ssh-copy-id -i ~/.ssh/id_rsa.pub botuser@your-server-ip
   ```

5. **Copy private key content to GitHub secret:**
   ```bash
   cat ~/.ssh/id_rsa  # Copy this content to CONTABO_SSH_KEY secret
   ```

### How it works:
- Every time you push to `main` branch, GitHub Actions will automatically:
  - Connect to your Contabo server
  - Pull latest changes
  - Update dependencies
  - Deploy commands
  - Restart the bot

## Method 2: Webhook Listener (Alternative)

### Setup on Contabo server:

1. **Copy the auto-update script:**
   ```bash
   # On your Contabo server
   cd /opt/malluclub-bot
   chmod +x auto-update.sh
   ```

2. **Set up webhook listener:**
   ```bash
   export WEBHOOK_SECRET="your-secret-key"
   chmod +x webhook-listener.sh
   ./webhook-listener.sh
   ```

3. **Add webhook to GitHub:**
   - Go to repository `Settings` → `Webhooks`
   - Add webhook: `http://your-server-ip:3001/hooks/malluclub-deploy`
   - Content type: `application/json`
   - Secret: `your-secret-key`
   - Events: `Just the push event`

## Method 3: Simple Cron Job (Basic)

### Setup automatic checking every 5 minutes:

```bash
# On Contabo server
crontab -e

# Add this line:
*/5 * * * * /opt/malluclub-bot/auto-update.sh >/dev/null 2>&1
```

This will check for updates every 5 minutes and auto-update if changes are found.

## Testing Your Setup

1. **Make a small change to your bot locally**
2. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "test: Auto-deployment test"
   git push origin main
   ```
3. **Check your Contabo server logs:**
   ```bash
   pm2 logs malluclub-bot
   tail -f /opt/malluclub-bot/logs/auto-update.log
   ```

## Commands for Manual Updates

If you need to manually trigger an update:

```bash
# On Contabo server
cd /opt/malluclub-bot
./auto-update.sh
```

## Troubleshooting

### GitHub Actions not working:
- Check repository `Actions` tab for error logs
- Verify all secrets are correctly set
- Ensure SSH key has proper permissions

### Webhook not triggering:
- Check if port 3001 is open: `ufw allow 3001`
- Verify webhook URL is accessible
- Check webhook delivery in GitHub settings

### Permission issues:
```bash
# Fix permissions
sudo chown -R botuser:botuser /opt/malluclub-bot
chmod +x /opt/malluclub-bot/*.sh
```

## Security Notes

- Keep your SSH keys secure
- Use strong webhook secrets
- Regularly rotate access keys
- Monitor deployment logs for suspicious activity

---

Choose the method that works best for your workflow. GitHub Actions is recommended for most users as it's reliable and doesn't require keeping services running on your server.
