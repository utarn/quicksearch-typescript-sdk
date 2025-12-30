/**
 * QuickSearch Pino Transport - Main Transport Implementation
 */

import build from 'pino-abstract-transport';
import type { Transform } from 'node:stream';
import type {
  PinoLogObject,
  QuickSearchEvent,
  QuickSearchTransportOptions,
  TransportState,
} from './types.js';
import { QuickSearchHttpClient } from './http-client.js';
import { formatEvent, meetsMinimumLevel, selfLog } from './utils.js';

/**
 * Default configuration values
 */
const DEFAULTS = {
  application: 'unknown',
  batchSize: 100,
  flushInterval: 2000,
  queueSizeLimit: 10000,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  minimumLevel: 'trace',
} as const;

/**
 * Creates a QuickSearch pino transport
 * 
 * @param options - Transport configuration options
 * @returns A pino transport instance
 * 
 * @example
 * ```typescript
 * import pino from 'pino';
 * 
 * const logger = pino({
 *   transport: {
 *     target: 'quicksearch-pino-transport',
 *     options: {
 *       serverUrl: 'http://localhost:3000',
 *       apiKey: 'your-api-key',
 *       application: 'my-app'
 *     }
 *   }
 * });
 * ```
 */
export default async function quickSearchTransport(
  options: QuickSearchTransportOptions
): Promise<Transform & { end: () => Promise<void> }> {
  // Validate required options
  if (!options.serverUrl) {
    throw new Error('serverUrl is required');
  }

  // Merge with defaults
  const config = {
    serverUrl: options.serverUrl,
    apiKey: options.apiKey,
    application: options.application ?? DEFAULTS.application,
    batchSize: options.batchSize ?? DEFAULTS.batchSize,
    flushInterval: options.flushInterval ?? DEFAULTS.flushInterval,
    queueSizeLimit: options.queueSizeLimit ?? DEFAULTS.queueSizeLimit,
    timeout: options.timeout ?? DEFAULTS.timeout,
    retryAttempts: options.retryAttempts ?? DEFAULTS.retryAttempts,
    retryDelay: options.retryDelay ?? DEFAULTS.retryDelay,
    minimumLevel: options.minimumLevel ?? DEFAULTS.minimumLevel,
  };

  selfLog.debug('Initializing transport with config:', {
    serverUrl: config.serverUrl,
    application: config.application,
    batchSize: config.batchSize,
    flushInterval: config.flushInterval,
  });

  // Create HTTP client
  const httpClient = new QuickSearchHttpClient({
    serverUrl: config.serverUrl,
    apiKey: config.apiKey,
    timeout: config.timeout,
    retryAttempts: config.retryAttempts,
    retryDelay: config.retryDelay,
  });

  // Transport state
  const state: TransportState = {
    buffer: [],
    flushTimer: null,
    closed: false,
    flushing: false,
  };

  /**
   * Flushes the buffer to the server
   */
  async function flush(): Promise<void> {
    if (state.buffer.length === 0 || state.flushing) {
      return;
    }

    state.flushing = true;
    const events = state.buffer.splice(0); // Take all events from buffer

    try {
      await httpClient.sendEvents(events);
      selfLog.debug(`Flushed ${events.length} events`);
    } catch (error) {
      selfLog.error('Failed to flush events:', error);
      // Events are lost if we can't send them after retries
      // This is by design to prevent memory issues
    } finally {
      state.flushing = false;
    }
  }

  /**
   * Adds an event to the buffer and triggers flush if needed
   */
  function addToBuffer(event: QuickSearchEvent): void {
    if (state.closed) {
      selfLog.warn('Transport is closed, dropping event');
      return;
    }

    if (state.buffer.length >= config.queueSizeLimit) {
      selfLog.warn('Queue size limit reached, dropping oldest event');
      state.buffer.shift(); // Remove oldest event
    }

    state.buffer.push(event);

    // Flush if batch size reached
    if (state.buffer.length >= config.batchSize) {
      flush().catch(err => selfLog.error('Batch flush failed:', err));
    }
  }

  /**
   * Starts the flush timer
   */
  function startFlushTimer(): void {
    if (state.flushTimer) {
      return;
    }

    state.flushTimer = setInterval(() => {
      flush().catch(err => selfLog.error('Timer flush failed:', err));
    }, config.flushInterval);

    // Don't block process exit
    state.flushTimer.unref();
  }

  /**
   * Stops the flush timer
   */
  function stopFlushTimer(): void {
    if (state.flushTimer) {
      clearInterval(state.flushTimer);
      state.flushTimer = null;
    }
  }

  /**
   * Closes the transport and flushes remaining events
   */
  async function close(): Promise<void> {
    if (state.closed) {
      return;
    }

    selfLog.debug('Closing transport, flushing remaining events...');
    state.closed = true;
    stopFlushTimer();

    // Final flush
    await flush();
    selfLog.debug('Transport closed');
  }

  // Start the flush timer
  startFlushTimer();

  // Build and return the pino transport
  return build(
    async function processLogs(source: AsyncIterable<PinoLogObject>) {
      for await (const obj of source) {
        try {
          // Check minimum level
          if (!meetsMinimumLevel(obj.level, config.minimumLevel)) {
            continue;
          }

          // Format and queue the event
          const event = formatEvent(obj, config.application);
          addToBuffer(event);
        } catch (error) {
          selfLog.error('Error processing log event:', error);
        }
      }
    },
    {
      close,
    }
  );
}

// Named export for ESM compatibility
export { quickSearchTransport };