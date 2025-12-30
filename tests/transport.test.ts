/**
 * QuickSearch Pino Transport - Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mapLevelToType,
  mapLevelToName,
  getLevelValue,
  meetsMinimumLevel,
  formatEvent,
  timestampToISO,
  extractException,
} from '../src/utils.js';
import type { PinoLogObject, QuickSearchEventType } from '../src/types.js';
import { PINO_LEVELS, LEVEL_TO_TYPE } from '../src/types.js';

describe('Level Mapping', () => {
  describe('mapLevelToType', () => {
    it('should map trace level (10) to Trace', () => {
      expect(mapLevelToType(10)).toBe('Trace');
    });

    it('should map debug level (20) to Debug', () => {
      expect(mapLevelToType(20)).toBe('Debug');
    });

    it('should map info level (30) to Information', () => {
      expect(mapLevelToType(30)).toBe('Information');
    });

    it('should map warn level (40) to Warning', () => {
      expect(mapLevelToType(40)).toBe('Warning');
    });

    it('should map error level (50) to Error', () => {
      expect(mapLevelToType(50)).toBe('Error');
    });

    it('should map fatal level (60) to Critical', () => {
      expect(mapLevelToType(60)).toBe('Critical');
    });

    it('should map custom levels between standard levels', () => {
      expect(mapLevelToType(15)).toBe('Trace');
      expect(mapLevelToType(25)).toBe('Debug');
      expect(mapLevelToType(35)).toBe('Information');
      expect(mapLevelToType(45)).toBe('Warning');
      expect(mapLevelToType(55)).toBe('Error');
      expect(mapLevelToType(65)).toBe('Critical');
    });

    it('should map very low levels to Trace', () => {
      expect(mapLevelToType(5)).toBe('Trace');
      expect(mapLevelToType(1)).toBe('Trace');
    });
  });

  describe('mapLevelToName', () => {
    it('should map numeric levels to level names', () => {
      expect(mapLevelToName(10)).toBe('trace');
      expect(mapLevelToName(20)).toBe('debug');
      expect(mapLevelToName(30)).toBe('info');
      expect(mapLevelToName(40)).toBe('warn');
      expect(mapLevelToName(50)).toBe('error');
      expect(mapLevelToName(60)).toBe('fatal');
    });
  });

  describe('getLevelValue', () => {
    it('should return correct numeric values for level names', () => {
      expect(getLevelValue('trace')).toBe(10);
      expect(getLevelValue('debug')).toBe(20);
      expect(getLevelValue('info')).toBe(30);
      expect(getLevelValue('warn')).toBe(40);
      expect(getLevelValue('error')).toBe(50);
      expect(getLevelValue('fatal')).toBe(60);
    });

    it('should be case insensitive', () => {
      expect(getLevelValue('TRACE')).toBe(10);
      expect(getLevelValue('Info')).toBe(30);
      expect(getLevelValue('ERROR')).toBe(50);
    });

    it('should return default for unknown levels', () => {
      expect(getLevelValue('unknown')).toBe(10);
    });
  });

  describe('meetsMinimumLevel', () => {
    it('should return true when level meets minimum', () => {
      expect(meetsMinimumLevel(30, 'info')).toBe(true);
      expect(meetsMinimumLevel(40, 'info')).toBe(true);
      expect(meetsMinimumLevel(50, 'info')).toBe(true);
    });

    it('should return false when level is below minimum', () => {
      expect(meetsMinimumLevel(10, 'info')).toBe(false);
      expect(meetsMinimumLevel(20, 'info')).toBe(false);
    });

    it('should return true for trace minimum level', () => {
      expect(meetsMinimumLevel(10, 'trace')).toBe(true);
      expect(meetsMinimumLevel(60, 'trace')).toBe(true);
    });
  });
});

describe('Timestamp Conversion', () => {
  describe('timestampToISO', () => {
    it('should convert Unix timestamp to ISO 8601 string', () => {
      const timestamp = 1703937600000; // 2023-12-30T12:00:00.000Z
      const iso = timestampToISO(timestamp);
      expect(iso).toBe('2023-12-30T12:00:00.000Z');
    });

    it('should handle current timestamps', () => {
      const now = Date.now();
      const iso = timestampToISO(now);
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});

describe('Exception Extraction', () => {
  describe('extractException', () => {
    it('should return undefined when no error is present', () => {
      const obj: PinoLogObject = {
        level: 50,
        time: Date.now(),
        pid: 123,
        hostname: 'test',
        msg: 'test message',
      };
      expect(extractException(obj)).toBeUndefined();
    });

    it('should extract exception data from error object', () => {
      const obj: PinoLogObject = {
        level: 50,
        time: Date.now(),
        pid: 123,
        hostname: 'test',
        msg: 'error occurred',
        err: {
          type: 'Error',
          message: 'Something went wrong',
          stack: 'Error: Something went wrong\n    at test.js:1:1',
        },
      };

      const exception = extractException(obj);
      expect(exception).toBeDefined();
      expect(exception?.exceptionType).toBe('Error');
      expect(exception?.exceptionMessage).toBe('Something went wrong');
      expect(exception?.exception).toContain('Something went wrong');
    });
  });
});

describe('Event Formatting', () => {
  describe('formatEvent', () => {
    it('should format a basic log object to QuickSearch event', () => {
      const obj: PinoLogObject = {
        level: 30,
        time: 1703937600000,
        pid: 12345,
        hostname: 'test-server',
        msg: 'Test message',
      };

      const event = formatEvent(obj, 'test-app');

      expect(event.type).toBe('Information');
      expect(event.application).toBe('test-app');
      expect(event.timestamp).toBe('2023-12-30T12:00:00.000Z');
      expect(event.message).toBe('Test message');
      expect(event.data.level).toBe('info');
      expect(event.data.pid).toBe(12345);
      expect(event.data.hostname).toBe('test-server');
    });

    it('should include additional properties in data', () => {
      const obj: PinoLogObject = {
        level: 30,
        time: Date.now(),
        pid: 123,
        hostname: 'test',
        msg: 'User action',
        userId: 'user-123',
        action: 'login',
        metadata: { browser: 'Chrome' },
      };

      const event = formatEvent(obj, 'test-app');

      expect(event.data.userId).toBe('user-123');
      expect(event.data.action).toBe('login');
      expect(event.data.metadata).toEqual({ browser: 'Chrome' });
    });

    it('should include error data when present', () => {
      const obj: PinoLogObject = {
        level: 50,
        time: Date.now(),
        pid: 123,
        hostname: 'test',
        msg: 'Error occurred',
        err: {
          type: 'TypeError',
          message: 'Cannot read property',
          stack: 'TypeError: Cannot read property\n    at test.js:1:1',
        },
      };

      const event = formatEvent(obj, 'test-app');

      expect(event.type).toBe('Error');
      expect(event.data.exceptionType).toBe('TypeError');
      expect(event.data.exceptionMessage).toBe('Cannot read property');
      expect(event.data.exception).toContain('TypeError');
    });

    it('should include trace context when present', () => {
      const obj: PinoLogObject = {
        level: 30,
        time: Date.now(),
        pid: 123,
        hostname: 'test',
        msg: 'Traced request',
        traceId: 'abc123',
        spanId: 'def456',
      };

      const event = formatEvent(obj, 'test-app');

      expect(event.data.traceId).toBe('abc123');
      expect(event.data.spanId).toBe('def456');
    });

    it('should handle missing message', () => {
      const obj: PinoLogObject = {
        level: 30,
        time: Date.now(),
        pid: 123,
        hostname: 'test',
      };

      const event = formatEvent(obj, 'test-app');

      expect(event.message).toBe('');
    });
  });
});

describe('Type Constants', () => {
  it('should have all pino levels defined', () => {
    expect(PINO_LEVELS[10]).toBe('trace');
    expect(PINO_LEVELS[20]).toBe('debug');
    expect(PINO_LEVELS[30]).toBe('info');
    expect(PINO_LEVELS[40]).toBe('warn');
    expect(PINO_LEVELS[50]).toBe('error');
    expect(PINO_LEVELS[60]).toBe('fatal');
  });

  it('should have all level to type mappings', () => {
    expect(LEVEL_TO_TYPE.trace).toBe('Trace');
    expect(LEVEL_TO_TYPE.debug).toBe('Debug');
    expect(LEVEL_TO_TYPE.info).toBe('Information');
    expect(LEVEL_TO_TYPE.warn).toBe('Warning');
    expect(LEVEL_TO_TYPE.error).toBe('Error');
    expect(LEVEL_TO_TYPE.fatal).toBe('Critical');
  });
});