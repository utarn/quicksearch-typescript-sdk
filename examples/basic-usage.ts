/**
 * QuickSearch Pino Transport - Basic Usage Example
 * 
 * This example demonstrates how to configure a pino logger with the QuickSearch transport
 * to send logs to a QuickSearch logging server.
 * 
 * Run with: npx tsx examples/basic-usage.ts
 */

import pino from 'pino';

// Configuration - Update these values for your environment
const QUICKSEARCH_URL = process.env.QUICKSEARCH_URL || 'http://localhost:3000';
const QUICKSEARCH_API_KEY = process.env.QUICKSEARCH_API_KEY || '2cbe41dfe1ac71ba836be43a5fcf7eaa2b5071a0ac194847f284e24e9a71fd01';
const APPLICATION_NAME = 'typescript-example';

// Enable debug logging for the transport
process.env.QUICKSEARCH_DEBUG = 'true';

/**
 * Create a logger with the QuickSearch transport
 */
const logger = pino({
  level: 'trace', // Set minimum level to trace to capture all levels
  transport: {
    targets: [
      // Console output for immediate visibility
      {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
        level: 'trace',
      },
      // QuickSearch transport
      {
        target: '../src/transport.js',
        options: {
          serverUrl: QUICKSEARCH_URL,
          apiKey: QUICKSEARCH_API_KEY,
          application: APPLICATION_NAME,
          batchSize: 10,        // Smaller batch for demo
          flushInterval: 1000,  // 1 second flush for demo
        },
        level: 'trace',
      },
    ],
  },
});

/**
 * Demonstrate logging at different levels
 */
async function demonstrateLogging(): Promise<void> {
  console.log('\n=== QuickSearch Pino Transport Demo ===\n');
  console.log(`Server URL: ${QUICKSEARCH_URL}`);
  console.log(`Application: ${APPLICATION_NAME}`);
  console.log('\n');

  // Basic logging at different levels
  logger.trace('This is a trace message');
  logger.debug('This is a debug message');
  logger.info('This is an info message');
  logger.warn('This is a warning message');
  logger.error('This is an error message');
  logger.fatal('This is a fatal message');

  // Logging with additional properties
  logger.info(
    {
      userId: 'user-12345',
      action: 'login',
      ipAddress: '192.168.1.100',
    },
    'User logged in successfully'
  );

  // Logging with nested objects
  logger.info(
    {
      request: {
        method: 'POST',
        path: '/api/users',
        body: { name: 'John Doe', email: 'john@example.com' },
      },
      response: {
        status: 201,
        duration: 45,
      },
    },
    'API request completed'
  );

  // Logging errors with stack traces
  try {
    throw new Error('Something went wrong!');
  } catch (err) {
    logger.error({ err }, 'An error occurred during processing');
  }

  // Logging with numeric values
  logger.info(
    {
      orderId: 'ORD-789',
      items: 5,
      total: 99.99,
      tax: 7.99,
    },
    'Order processed'
  );

  // Wait a bit to ensure logs are flushed
  console.log('\nWaiting for logs to be flushed...\n');
  await sleep(3000);

  console.log('\n=== Demo Complete ===\n');
  console.log('Check your QuickSearch server to see the logged events.');
  console.log(`URL: ${QUICKSEARCH_URL}/search\n`);
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Graceful shutdown handler
 */
async function shutdown(): Promise<void> {
  console.log('\nShutting down...');
  
  // Flush the logger (pino handles this through the transport)
  await new Promise<void>((resolve) => {
    logger.flush();
    setTimeout(resolve, 1000); // Give time for flush
  });
  
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Run the demo
demonstrateLogging()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Demo failed:', error);
    process.exit(1);
  });