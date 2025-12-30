/**
 * QuickSearch Pino Transport - Utility Functions
 */

import type {
  PinoLogObject,
  QuickSearchEvent,
  QuickSearchEventType,
  QuickSearchEventData,
  PinoLevelName,
} from './types.js';
import {
  PINO_LEVELS,
  LEVEL_TO_TYPE,
  MIN_LEVEL_VALUES,
} from './types.js';

/**
 * Maps a Pino numeric level to a QuickSearch event type
 */
export function mapLevelToType(level: number): QuickSearchEventType {
  const levelName = PINO_LEVELS[level];
  if (levelName) {
    return LEVEL_TO_TYPE[levelName];
  }
  
  // Handle custom levels by finding the closest standard level
  if (level < 10) return 'Trace';
  if (level < 20) return 'Trace';
  if (level < 30) return 'Debug';
  if (level < 40) return 'Information';
  if (level < 50) return 'Warning';
  if (level < 60) return 'Error';
  return 'Critical';
}

/**
 * Maps a Pino numeric level to level name
 */
export function mapLevelToName(level: number): PinoLevelName {
  const levelName = PINO_LEVELS[level];
  if (levelName) {
    return levelName;
  }
  
  // Handle custom levels by finding the closest standard level
  if (level < 20) return 'trace';
  if (level < 30) return 'debug';
  if (level < 40) return 'info';
  if (level < 50) return 'warn';
  if (level < 60) return 'error';
  return 'fatal';
}

/**
 * Gets the numeric value for a level name
 */
export function getLevelValue(levelName: string): number {
  return MIN_LEVEL_VALUES[levelName.toLowerCase()] ?? 10;
}

/**
 * Checks if a log level meets the minimum level threshold
 */
export function meetsMinimumLevel(level: number, minimumLevel: string): boolean {
  const minValue = getLevelValue(minimumLevel);
  return level >= minValue;
}

/**
 * Converts a Unix timestamp in milliseconds to ISO 8601 string
 */
export function timestampToISO(time: number): string {
  return new Date(time).toISOString();
}

/**
 * Extracts exception data from a Pino log object
 */
export function extractException(obj: PinoLogObject): {
  exception?: string;
  exceptionType?: string;
  exceptionMessage?: string;
} | undefined {
  const err = obj.err;
  if (!err) return undefined;
  
  return {
    exception: err.stack ?? String(err),
    exceptionType: err.type ?? err.constructor?.name ?? 'Error',
    exceptionMessage: err.message ?? String(err),
  };
}

/**
 * Reserved keys that should not be copied to the data object
 */
const RESERVED_KEYS = new Set([
  'level',
  'time',
  'pid',
  'hostname',
  'msg',
  'err',
  'v', // pino version
]);

/**
 * Formats a Pino log object into a QuickSearch event
 */
export function formatEvent(
  obj: PinoLogObject,
  application: string
): QuickSearchEvent {
  const type = mapLevelToType(obj.level);
  const levelName = mapLevelToName(obj.level);
  const timestamp = timestampToISO(obj.time);
  const message = obj.msg ?? '';
  
  // Build data object with all additional properties
  const data: QuickSearchEventData = {
    level: levelName,
    pid: obj.pid,
    hostname: obj.hostname,
  };
  
  // Add exception data if present
  const exceptionData = extractException(obj);
  if (exceptionData) {
    Object.assign(data, exceptionData);
  }
  
  // Add trace context if present
  if (obj.traceId) {
    data.traceId = obj.traceId;
  }
  if (obj.spanId) {
    data.spanId = obj.spanId;
  }
  
  // Copy all additional properties
  for (const [key, value] of Object.entries(obj)) {
    if (!RESERVED_KEYS.has(key) && key !== 'traceId' && key !== 'spanId') {
      data[key] = value;
    }
  }
  
  return {
    type,
    application,
    timestamp,
    message,
    data,
  };
}

/**
 * Internal self-logging for diagnostics (writes to stderr)
 */
export const selfLog = {
  debug(message: string, ...args: unknown[]): void {
    if (process.env.QUICKSEARCH_DEBUG === 'true') {
      console.error(`[quicksearch-transport] DEBUG: ${message}`, ...args);
    }
  },
  
  warn(message: string, ...args: unknown[]): void {
    console.error(`[quicksearch-transport] WARN: ${message}`, ...args);
  },
  
  error(message: string, ...args: unknown[]): void {
    console.error(`[quicksearch-transport] ERROR: ${message}`, ...args);
  },
};

/**
 * Sleep helper for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}