# QuickSearch Pino Transport

A [pino](https://getpino.io/) transport for sending log events to a QuickSearch logging server.

## Features

- 🚀 **Async & Non-blocking** - Uses pino's worker thread transport
- 📦 **Batching** - Efficiently batches log events (default: 100 events or 2 seconds)
- 🔄 **Retry Logic** - Automatic retry with exponential backoff
- 🔒 **Authentication** - Bearer token authentication via API key
- 📊 **Level Mapping** - Maps pino levels to QuickSearch types
- 🛡️ **TypeScript** - Full TypeScript support with type definitions
- ⚡ **Graceful Shutdown** - Flushes pending events on close

## Installation

```bash
npm install quicksearch-pino-transport pino
```

## Quick Start

```typescript
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'quicksearch-pino-transport',
    options: {
      serverUrl: 'http://localhost:3000',
      apiKey: 'your-api-key',
      application: 'my-app'
    }
  }
});

logger.info({ userId: '123' }, 'User logged in');
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serverUrl` | `string` | **(required)** | QuickSearch server URL |
| `apiKey` | `string` | `undefined` | API key for authentication |
| `application` | `string` | `'unknown'` | Application name to tag all events |
| `batchSize` | `number` | `100` | Maximum events per batch |
| `flushInterval` | `number` | `2000` | Flush interval in milliseconds |
| `queueSizeLimit` | `number` | `10000` | Maximum queued events before dropping |
| `timeout` | `number` | `30000` | HTTP request timeout in milliseconds |
| `retryAttempts` | `number` | `3` | Number of retry attempts on failure |
| `retryDelay` | `number` | `1000` | Initial retry delay in milliseconds |
| `minimumLevel` | `string` | `'trace'` | Minimum log level to send |

## Level Mapping

Pino log levels are mapped to QuickSearch event types:

| Pino Level | Numeric | QuickSearch Type |
|------------|---------|------------------|
| trace | 10 | Trace |
| debug | 20 | Debug |
| info | 30 | Information |
| warn | 40 | Warning |
| error | 50 | Error |
| fatal | 60 | Critical |

## Multi-Transport Configuration

You can use multiple transports to send logs to both the console and QuickSearch:

```typescript
import pino from 'pino';

const logger = pino({
  transport: {
    targets: [
      // Console output with pretty printing
      {
        target: 'pino-pretty',
        options: { colorize: true },
        level: 'trace'
      },
      // QuickSearch transport
      {
        target: 'quicksearch-pino-transport',
        options: {
          serverUrl: 'http://localhost:3000',
          apiKey: 'your-api-key',
          application: 'my-app'
        },
        level: 'info' // Only send info and above to QuickSearch
      }
    ]
  }
});
```

## Error Handling

The transport handles errors gracefully without throwing exceptions:

- Failed HTTP requests are retried with exponential backoff
- After all retries are exhausted, events are dropped (with a warning logged to stderr)
- The transport never blocks or crashes your application

To enable debug logging for the transport:

```bash
QUICKSEARCH_DEBUG=true node your-app.js
```

## Structured Logging

Include additional properties in your log calls:

```typescript
// Basic logging
logger.info('Simple message');

// With additional context
logger.info({
  userId: 'user-123',
  action: 'purchase',
  amount: 99.99
}, 'User made a purchase');

// Error logging with stack trace
try {
  throw new Error('Something went wrong');
} catch (err) {
  logger.error({ err }, 'An error occurred');
}
```

## Event Format

Events sent to QuickSearch have the following structure:

```json
{
  "type": "Information",
  "application": "my-app",
  "timestamp": "2024-12-30T08:30:00.000Z",
  "message": "User logged in",
  "data": {
    "level": "info",
    "pid": 12345,
    "hostname": "server-01",
    "userId": "123",
    "traceId": "abc123"
  }
}
```

## OpenTelemetry Integration

If your application uses OpenTelemetry, trace context is automatically included:

```typescript
logger.info({
  traceId: 'abc123def456',
  spanId: '789ghi'
}, 'Traced request');
```

## Graceful Shutdown

The transport automatically flushes pending events when the pino logger is closed:

```typescript
// Proper shutdown
process.on('SIGTERM', async () => {
  logger.flush();
  await new Promise(resolve => setTimeout(resolve, 1000));
  process.exit(0);
});
```

## Development

### Building

```bash
npm install
npm run build
```

### Testing

```bash
npm test
```

### Running the Example

```bash
npm run example
```

## Requirements

- Node.js >= 18.0.0
- pino >= 8.0.0

## License

Apache-2.0

## Related

- [QuickSearch Server](../../src/)
- [QuickSearch .NET SDK](../dotnet/)
- [QuickSearch Python SDK](../python/)