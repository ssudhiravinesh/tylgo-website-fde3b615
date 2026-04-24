/**
 * Structured logger for Tylgo.
 * 
 * Provides log-level gating based on environment.
 * In production builds, debug/info logs are suppressed.
 * Warnings and errors always pass through.
 * 
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.debug('Tile selection', { roomId, tileId });
 *   logger.info('Quotation created', quotationNumber);
 *   logger.warn('Fallback used for calculation');
 *   logger.error('Save failed', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// In production, only show warnings and errors
const MIN_LEVEL: LogLevel = import.meta.env.PROD ? 'warn' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  const prefix = level.toUpperCase().padEnd(5);
  return `[${timestamp}] ${prefix} ${message}`;
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message), ...args);
    }
  },

  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message), ...args);
    }
  },

  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message), ...args);
    }
  },

  error(message: string, ...args: unknown[]): void {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message), ...args);
    }
  },
};
