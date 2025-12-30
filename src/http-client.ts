/**
 * QuickSearch Pino Transport - HTTP Client
 */

import type { QuickSearchEvent, EventResponse } from './types.js';
import { selfLog, sleep } from './utils.js';

/**
 * HTTP client options
 */
export interface HttpClientOptions {
  /** QuickSearch server URL */
  serverUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Number of retry attempts */
  retryAttempts: number;
  /** Initial retry delay in milliseconds */
  retryDelay: number;
}

/**
 * HTTP client for communicating with QuickSearch server
 */
export class QuickSearchHttpClient {
  private readonly serverUrl: string;
  private readonly apiKey?: string;
  private readonly timeout: number;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;
  private readonly endpoint: string;

  constructor(options: HttpClientOptions) {
    this.serverUrl = options.serverUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = options.apiKey;
    this.timeout = options.timeout;
    this.retryAttempts = options.retryAttempts;
    this.retryDelay = options.retryDelay;
    this.endpoint = `${this.serverUrl}/api/events`;
  }

  /**
   * Sends a batch of events to the QuickSearch server
   * Sends each event individually as the API doesn't support batch payloads
   */
  async sendEvents(events: QuickSearchEvent[]): Promise<void> {
    if (events.length === 0) return;

    const promises = events.map(event => this.sendEventWithRetry(event));
    
    try {
      await Promise.all(promises);
      selfLog.debug(`Successfully sent ${events.length} events`);
    } catch (error) {
      // Some events may have succeeded, log the error but don't throw
      selfLog.warn(`Some events failed to send:`, error);
    }
  }

  /**
   * Sends a single event with retry logic
   */
  private async sendEventWithRetry(event: QuickSearchEvent): Promise<EventResponse> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        return await this.sendEvent(event);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on client errors (4xx except 429)
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }
        
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt); // Exponential backoff
          selfLog.debug(`Retry attempt ${attempt + 1}/${this.retryAttempts} after ${delay}ms`);
          await sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Sends a single event to the server
   */
  private async sendEvent(event: QuickSearchEvent): Promise<EventResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(event),
        signal: controller.signal,
      });
      
      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error');
        const error = new Error(`HTTP ${response.status}: ${text}`);
        (error as NodeJS.ErrnoException).code = `HTTP_${response.status}`;
        throw error;
      }
      
      const result = await response.json() as EventResponse;
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout after ${this.timeout}ms`);
        (timeoutError as NodeJS.ErrnoException).code = 'TIMEOUT';
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Gets the headers for HTTP requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }

  /**
   * Checks if an error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const code = (error as NodeJS.ErrnoException).code;
    if (!code) return false;
    
    // Don't retry 4xx errors except 429 (rate limit)
    if (code.startsWith('HTTP_4') && code !== 'HTTP_429') {
      return true;
    }
    
    return false;
  }
}