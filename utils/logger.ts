/**
 * Structured Logger
 * Replaces console.log with proper leveled logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private level: LogLevel;
  private enableColors: boolean;

  constructor() {
    this.level = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.enableColors = process.env.NODE_ENV !== 'production';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase().padEnd(5);
    
    let formatted = `[${timestamp}] ${levelUpper} ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      formatted += ` ${JSON.stringify(context)}`;
    }
    
    return formatted;
  }

  private colorize(level: LogLevel, message: string): string {
    if (!this.enableColors) return message;
    
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';
    
    return `${colors[level]}${message}${reset}`;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    const formatted = this.formatMessage('debug', message, context);
    console.log(this.colorize('debug', formatted));
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    const formatted = this.formatMessage('info', message, context);
    console.log(this.colorize('info', formatted));
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;
    const formatted = this.formatMessage('warn', message, context);
    console.warn(this.colorize('warn', formatted));
  }

  error(message: string, context?: LogContext): void {
    if (!this.shouldLog('error')) return;
    const formatted = this.formatMessage('error', message, context);
    console.error(this.colorize('error', formatted));
  }

  // Convenience method for component/module scoping
  child(componentName: string): ScopedLogger {
    return new ScopedLogger(this, componentName);
  }
}

class ScopedLogger {
  constructor(private logger: Logger, private scope: string) {}

  debug(message: string, context?: LogContext): void {
    this.logger.debug(`[${this.scope}] ${message}`, context);
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(`[${this.scope}] ${message}`, context);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(`[${this.scope}] ${message}`, context);
  }

  error(message: string, context?: LogContext): void {
    this.logger.error(`[${this.scope}] ${message}`, context);
  }
}

// Global logger instance
export const logger = new Logger();

// Example usage:
// import { logger } from '@/utils/logger';
//
// // Simple:
// logger.info('Starting worker');
//
// // With context:
// logger.info('Processing step', { stepId, workerId });
//
// // Scoped:
// const log = logger.child('CryptoWorker');
// log.info('Quote received', { price, amount });
