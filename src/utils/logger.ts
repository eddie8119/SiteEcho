/**
 * Logging service for SiteNear
 * Provides controlled logging based on environment and log levels
 */
/* eslint-disable no-console */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: unknown;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logLevel: LogLevel = this.isDevelopment ? 'debug' : 'warn';
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${contextStr} ${message}`;
  }

  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  debug(message: string, data?: unknown, context?: string): void {
    if (!this.shouldLog('debug')) return;

    const formattedMessage = this.formatMessage('debug', message, context);
    console.log(formattedMessage, data || '');

    this.addToHistory({
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      context,
      data,
    });
  }

  info(message: string, data?: unknown, context?: string): void {
    if (!this.shouldLog('info')) return;

    const formattedMessage = this.formatMessage('info', message, context);
    console.log(formattedMessage, data || '');

    this.addToHistory({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      context,
      data,
    });
  }

  warn(message: string, data?: unknown, context?: string): void {
    if (!this.shouldLog('warn')) return;

    const formattedMessage = this.formatMessage('warn', message, context);
    console.warn(formattedMessage, data || '');

    this.addToHistory({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      context,
      data,
    });
  }

  error(message: string, error?: Error | unknown, context?: string): void {
    if (!this.shouldLog('error')) return;

    const formattedMessage = this.formatMessage('error', message, context);
    console.error(formattedMessage, error || '');

    this.addToHistory({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      context,
      data: error,
    });
  }

  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  clearHistory(): void {
    this.logHistory = [];
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logDebug = (message: string, data?: unknown, context?: string) =>
  logger.debug(message, data, context);
export const logInfo = (message: string, data?: unknown, context?: string) =>
  logger.info(message, data, context);
export const logWarn = (message: string, data?: unknown, context?: string) =>
  logger.warn(message, data, context);
export const logError = (message: string, error?: Error | unknown, context?: string) =>
  logger.error(message, error, context);
