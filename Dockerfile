# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S discord -u 1001

# Change ownership of the app directory
RUN chown -R discord:nodejs /app
USER discord

# Expose port (if needed for health checks)
EXPOSE 3000

# Start the bot
CMD ["node", "index.js"]
