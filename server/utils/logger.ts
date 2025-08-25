/**
 * Simple logging utility for consistent backend logging
 * This provides a centralized logging interface that can be easily used
 * throughout the codebase without major structural changes.
 */

// ============================================================================
// LOG LEVELS
// ============================================================================

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// ============================================================================
// LOGGER CONFIGURATION
// ============================================================================

interface LoggerConfig {
  level: LogLevel;
  includeTimestamp: boolean;
  includeContext: boolean;
  maxMessageLength?: number;
}

const defaultConfig: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  includeTimestamp: true,
  includeContext: true,
  maxMessageLength: 1000
};

// ============================================================================
// MAIN LOGGER CLASS
// ============================================================================

class Logger {
  private config: LoggerConfig;
  private context?: string;

  constructor(context?: string, config?: Partial<LoggerConfig>) {
    this.context = context;
    this.config = { ...defaultConfig, ...config };
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    let formatted = '';

    if (this.config.includeTimestamp) {
      formatted += `[${new Date().toISOString()}] `;
    }

    formatted += `[${level.toUpperCase()}]`;

    if (this.config.includeContext && this.context) {
      formatted += ` [${this.context}]`;
    }

    formatted += ` ${message}`;

    if (meta && Object.keys(meta).length > 0) {
      const metaStr = JSON.stringify(meta);
      if (this.config.maxMessageLength && metaStr.length > this.config.maxMessageLength) {
        formatted += ` ${metaStr.substring(0, this.config.maxMessageLength)}...`;
      } else {
        formatted += ` ${metaStr}`;
      }
    }

    return formatted;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, meta));
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message, meta));
    }
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }

  // Create a new logger instance with a specific context
  withContext(context: string): Logger {
    return new Logger(context, this.config);
  }

  // Update configuration
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// SPECIALIZED LOGGERS
// ============================================================================

// Database operations logger
export const dbLogger = new Logger('Database');

// Authentication operations logger
export const authLogger = new Logger('Auth');

// API requests logger
export const apiLogger = new Logger('API');

// File operations logger
export const fileLogger = new Logger('File');

// Email operations logger
export const emailLogger = new Logger('Email');

// Payment operations logger
export const paymentLogger = new Logger('Payment');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a logger for a specific module/context
 */
export const createLogger = (context: string, config?: Partial<LoggerConfig>): Logger => {
  return new Logger(context, config);
};

/**
 * Get the default logger instance
 */
export const getDefaultLogger = (): Logger => {
  return new Logger();
};

/**
 * Set the global log level
 */
export const setGlobalLogLevel = (level: LogLevel): void => {
  defaultConfig.level = level;
};

/**
 * Log performance metrics
 */
export const logPerformance = (operation: string, duration: number, meta?: any): void => {
  const logger = new Logger('Performance');
  if (duration > 1000) {
    logger.warn(`Slow operation: ${operation} took ${duration}ms`, meta);
  } else {
    logger.debug(`Operation: ${operation} took ${duration}ms`, meta);
  }
};

/**
 * Log security events
 */
export const logSecurityEvent = (event: string, details: any): void => {
  const logger = new Logger('Security');
  logger.warn(`Security event: ${event}`, details);
};

/**
 * Log database operations
 */
export const logDatabaseOperation = (operation: string, table: string, duration?: number, meta?: any): void => {
  const logger = new Logger('Database');
  const message = `DB ${operation} on ${table}`;
  
  if (duration) {
    if (duration > 1000) {
      logger.warn(`${message} (slow: ${duration}ms)`, meta);
    } else {
      logger.debug(`${message} (${duration}ms)`, meta);
    }
  } else {
    logger.debug(message, meta);
  }
};

/**
 * Log API requests
 */
export const logApiRequest = (method: string, path: string, statusCode: number, duration: number, meta?: any): void => {
  const logger = new Logger('API');
  const message = `${method} ${path} ${statusCode} (${duration}ms)`;
  
  if (statusCode >= 400) {
    logger.error(message, meta);
  } else if (duration > 1000) {
    logger.warn(message, meta);
  } else {
    logger.debug(message, meta);
  }
};

/**
 * Log errors with context
 */
export const logError = (error: Error | any, context: string, meta?: any): void => {
  const logger = new Logger(context);
  logger.error(error.message || 'Unknown error', {
    error: error.name || 'Error',
    stack: error.stack,
    ...meta
  });
};

// ============================================================================
// REQUEST-SPECIFIC LOGGING
// ============================================================================

/**
 * Create a request-specific logger that includes request ID and path
 */
export const createRequestLogger = (req: any, context?: string): Logger => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const path = req.path || 'unknown';
  const requestContext = context ? `${context}:${requestId}` : requestId;
  
  return new Logger(requestContext).withContext(`${requestContext} (${req.method} ${path})`);
};

// Export the main Logger class for advanced usage
export { Logger };
export default Logger;
