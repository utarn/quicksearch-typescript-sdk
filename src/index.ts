/**
 * QuickSearch Pino Transport
 * 
 * A pino transport for sending log events to a QuickSearch logging server.
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
 * 
 * logger.info({ userId: '123' }, 'User logged in');
 * ```
 * 
 * @packageDocumentation
 */

// Main transport
export { default, quickSearchTransport } from './transport.js';

// Types
export type {
  QuickSearchTransportOptions,
  QuickSearchEvent,
  QuickSearchEventType,
  QuickSearchEventData,
  EventResponse,
  PinoLogObject,
  PinoLevelName,
  TransportState,
} from './types.js';

// Constants
export {
  PINO_LEVELS,
  LEVEL_TO_TYPE,
  MIN_LEVEL_VALUES,
} from './types.js';

// Utilities
export {
  mapLevelToType,
  mapLevelToName,
  getLevelValue,
  meetsMinimumLevel,
  formatEvent,
  timestampToISO,
  extractException,
} from './utils.js';

// HTTP Client (for advanced usage)
export { QuickSearchHttpClient, type HttpClientOptions } from './http-client.js';