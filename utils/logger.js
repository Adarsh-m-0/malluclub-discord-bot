const fs = require('fs');
const path = require('path');

// Simple logger fallback when pino is not available
class SimpleLogger {
    constructor() {
        this.logsDir = path.join(__dirname, '../logs');
        this.ensureLogsDir();
    }

    ensureLogsDir() {
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }

    log(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...meta
        };

        // Console output with colors
        const colors = {
            info: '\x1b[32m',   // Green
            warn: '\x1b[33m',   // Yellow
            error: '\x1b[31m',  // Red
            debug: '\x1b[36m'   // Cyan
        };
        
        const reset = '\x1b[0m';
        const color = colors[level] || '';
        
        console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${reset}`);
        
        // File output for errors
        if (level === 'error') {
            const today = new Date().toISOString().split('T')[0];
            const logFile = path.join(this.logsDir, `error-${today}.log`);
            const logLine = `${timestamp} [${level.toUpperCase()}]: ${message} ${JSON.stringify(meta)}\n`;
            
            try {
                fs.appendFileSync(logFile, logLine);
            } catch (err) {
                console.error('Failed to write to log file:', err.message);
            }
        }
    }

    info(message, meta) { this.log('info', message, meta); }
    warn(message, meta) { this.log('warn', message, meta); }
    error(message, meta) { this.log('error', message, meta); }
    debug(message, meta) { this.log('debug', message, meta); }

    // Convenience methods
    discord(message, meta = {}) {
        this.info(message, { category: 'discord', ...meta });
    }

    command(commandName, user, guild, meta = {}) {
        this.info(`Command executed: ${commandName}`, {
            category: 'command',
            command: commandName,
            user: `${user.tag} (${user.id})`,
            guild: guild ? `${guild.name} (${guild.id})` : 'DM',
            ...meta
        });
    }

    voice(message, meta = {}) {
        this.info(message, { category: 'voice', ...meta });
    }

    moderation(action, target, moderator, reason, meta = {}) {
        this.warn(`Moderation action: ${action}`, {
            category: 'moderation',
            action,
            target: target ? `${target.tag} (${target.id})` : 'Unknown',
            moderator: moderator ? `${moderator.tag} (${moderator.id})` : 'System',
            reason: reason || 'No reason provided',
            ...meta
        });
    }

    database(message, meta = {}) {
        this.info(message, { category: 'database', ...meta });
    }

    security(message, meta = {}) {
        this.warn(message, { category: 'security', ...meta });
    }

    logError(error, context = {}) {
        this.error('An error occurred', {
            err: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            ...context
        });
    }

    performance(operation, duration, meta = {}) {
        this.info(`Performance: ${operation} took ${duration}ms`, {
            category: 'performance',
            operation,
            duration,
            ...meta
        });
    }

    startup() {
        this.info('='.repeat(50));
        this.info('MalluClub Discord Bot Starting');
        this.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        this.info(`Node.js Version: ${process.version}`);
        this.info(`Discord.js Version: ${require('discord.js').version}`);
        this.info('='.repeat(50));
    }

    shutdown() {
        this.info('='.repeat(50));
        this.info('MalluClub Discord Bot Shutting Down');
        this.info(`Uptime: ${process.uptime()} seconds`);
        this.info('='.repeat(50));
    }
}

// Try to use pino, fallback to simple logger
let logger;
try {
    const pino = require('pino');
    const path = require('path');
    const fs = require('fs');

    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    // Create date-based log file name
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `error-${today}.log`);

    // Configure Pino logger
    logger = pino({
        level: process.env.LOG_LEVEL || 'info',
        transport: process.env.NODE_ENV !== 'production' ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname'
            }
        } : undefined
    }, process.env.NODE_ENV === 'production' ? pino.destination(logFile) : undefined);

    // Add convenience methods to pino logger
    logger.discord = (message, meta = {}) => {
        logger.info({ category: 'discord', ...meta }, message);
    };

    logger.command = (commandName, user, guild, meta = {}) => {
        logger.info({
            category: 'command',
            command: commandName,
            user: `${user.tag} (${user.id})`,
            guild: guild ? `${guild.name} (${guild.id})` : 'DM',
            ...meta
        }, `Command executed: ${commandName}`);
    };

    logger.voice = (message, meta = {}) => {
        logger.info({ category: 'voice', ...meta }, message);
    };

    logger.moderation = (action, target, moderator, reason, meta = {}) => {
        logger.warn({
            category: 'moderation',
            action,
            target: target ? `${target.tag} (${target.id})` : 'Unknown',
            moderator: moderator ? `${moderator.tag} (${moderator.id})` : 'System',
            reason: reason || 'No reason provided',
            ...meta
        }, `Moderation action: ${action}`);
    };

    logger.database = (message, meta = {}) => {
        logger.info({ category: 'database', ...meta }, message);
    };

    logger.security = (message, meta = {}) => {
        logger.warn({ category: 'security', ...meta }, message);
    };

    logger.logError = (error, context = {}) => {
        logger.error({
            err: error,
            ...context
        }, 'An error occurred');
    };

    logger.performance = (operation, duration, meta = {}) => {
        logger.info({
            category: 'performance',
            operation,
            duration,
            ...meta
        }, `Performance: ${operation} took ${duration}ms`);
    };

    logger.startup = () => {
        logger.info('='.repeat(50));
        logger.info('MalluClub Discord Bot Starting');
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`Node.js Version: ${process.version}`);
        logger.info(`Discord.js Version: ${require('discord.js').version}`);
        logger.info('='.repeat(50));
    };

    logger.shutdown = () => {
        logger.info('='.repeat(50));
        logger.info('MalluClub Discord Bot Shutting Down');
        logger.info(`Uptime: ${process.uptime()} seconds`);
        logger.info('='.repeat(50));
    };

} catch (error) {
    console.log('⚠️  Pino not available, using simple logger fallback');
    logger = new SimpleLogger();
}

module.exports = logger;
