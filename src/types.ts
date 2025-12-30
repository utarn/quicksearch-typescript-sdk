/**
 * QuickSearch Pino Transport - Type Definitions
 */

/**
 * Pino log object structure as received by the transport
 */
export interface PinoLogObject {
  /** Log level as number (10, 20, 30, 40, 50, 60) */
  level: number;
  /** Unix timestamp in milliseconds */
  time: number;
  /** Process ID */
  pid: number;
  /** Machine hostname */
  hostname: string;
  /** Log message */
  msg?: string;
  /** Error object if present */
  err?: {
    type?: string;
    message?: string;
    stack?: string;
    [key: string]: unknown;
  };
  /** OpenTelemetry trace ID if present */
  traceId?: string;
  /** OpenTelemetry span ID if present */
  spanId?: string;
  /** Additional properties */
  [key: string]: unknown;
}

/**
 * QuickSearch event type enum matching the server's expected format
 */
export type QuickSearchEventType = 
  | 'Trace'
  | 'Debug'
  | 'Information'
  | 'Warning'
  | 'Error'
  | 'Critical';

/**
 * QuickSearch event structure for the API
 */
export interface QuickSearchEvent {
  /** Event type (required) - maps from log level */
  type: QuickSearchEventType;
  /** Application name */
  application: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Log message */
  message: string;
  /** Additional structured data */
  data: QuickSearchEventData;
}

/**
 * Structured data included in QuickSearch events
 */
export interface QuickSearchEventData {
  /** Original level name */
  level: string;
  /** Process ID */
  pid: number;
  /** Machine hostname */
  hostname: string;
  /** Message template if using pino-pretty templates */
  messageTemplate?: string;
  /** Full stack trace if error present */
  exception?: string;
  /** Error name/type */
  exceptionType?: string;
  /** Error message */
  exceptionMessage?: string;
  /** OpenTelemetry trace ID */
  traceId?: string;
  /** OpenTelemetry span ID */
  spanId?: string;
  /** Additional properties from the log object */
  [key: string]: unknown;
}

/**
 * API response from QuickSearch server
 */
export interface EventResponse {
  success: boolean;
  message: string;
  eventId?: string;
}

/**
 * Transport configuration options
 */
export interface QuickSearchTransportOptions {
  /** QuickSearch server URL (required) */
  serverUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** Application name to tag all events (default: 'unknown') */
  application?: string;
  /** Maximum events per batch (default: 100) */
  batchSize?: number;
  /** Flush interval in milliseconds (default: 2000) */
  flushInterval?: number;
  /** Maximum queued events before dropping (default: 10000) */
  queueSizeLimit?: number;
  /** HTTP request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retry attempts on failure (default: 3) */
  retryAttempts?: number;
  /** Initial retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Minimum log level to send (default: 'trace') */
  minimumLevel?: string;
}

/**
 * Internal transport state
 */
export interface TransportState {
  /** Buffer of pending events */
  buffer: QuickSearchEvent[];
  /** Flush timer reference */
  flushTimer: NodeJS.Timeout | null;
  /** Whether the transport is closed */
  closed: boolean;
  /** Whether a flush is in progress */
  flushing: boolean;
}

/**
 * Pino log level names
 */
export type PinoLevelName = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Pino log level numeric values
 */
export const PINO_LEVELS: Record<number, PinoLevelName> = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

/**
 * Mapping from Pino levels to QuickSearch event types
 */
export const LEVEL_TO_TYPE: Record<PinoLevelName, QuickSearchEventType> = {
  trace: 'Trace',
  debug: 'Debug',
  info: 'Information',
  warn: 'Warning',
  error: 'Error',
  fatal: 'Critical',
};

/**
 * Minimum level numeric values
 */
export const MIN_LEVEL_VALUES: Record<string, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};