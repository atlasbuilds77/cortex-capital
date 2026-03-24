// Cortex Capital - Error Handling Utilities

import { FastifyReply, FastifyRequest } from 'fastify';

// ============ ERROR TYPES ============

export interface AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;
}

export class BaseError extends Error implements AppError {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends BaseError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends BaseError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends BaseError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
  }
}

export class ExternalAPIError extends BaseError {
  constructor(service: string, originalError?: Error) {
    super(`External service error: ${service}`, 502, 'EXTERNAL_API_ERROR', {
      service,
      originalMessage: originalError?.message,
    });
  }
}

export class InsufficientFundsError extends BaseError {
  constructor(required: number, available: number) {
    super(
      `Insufficient funds: Required $${required.toFixed(2)}, available $${available.toFixed(2)}`,
      400,
      'INSUFFICIENT_FUNDS',
      { required, available }
    );
  }
}

export class TradeExecutionError extends BaseError {
  constructor(ticker: string, reason: string, details?: unknown) {
    super(`Trade execution failed for ${ticker}: ${reason}`, 400, 'TRADE_EXECUTION_ERROR', {
      ticker,
      reason,
      ...details as object,
    });
  }
}

export class MarketClosedError extends BaseError {
  constructor() {
    super('Market is currently closed', 400, 'MARKET_CLOSED');
  }
}

export class ConfigurationError extends BaseError {
  constructor(message: string = 'Service configuration error') {
    // Don't expose which config is missing to clients
    super(message, 500, 'CONFIGURATION_ERROR');
  }
}

// ============ ERROR HANDLER ============

/**
 * Centralized error response handler for Fastify
 */
export function handleError(
  error: Error | AppError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log the full error server-side
  request.log.error({
    err: error,
    requestId: request.id,
    url: request.url,
    method: request.method,
    userId: (request as any).userId, // If authenticated
  });

  // Determine if this is a known error type
  if ('statusCode' in error && 'code' in error) {
    const appError = error as AppError;
    
    return reply.status(appError.statusCode).send({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        // Only include details in development
        ...(process.env.NODE_ENV !== 'production' && appError.details ? {
          details: appError.details,
        } : {}),
      },
    });
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        ...(process.env.NODE_ENV !== 'production' ? {
          details: (error as any).errors,
        } : {}),
      },
    });
  }

  // Handle database errors
  if (error.message?.includes('duplicate key')) {
    return reply.status(409).send({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Resource already exists',
      },
    });
  }

  if (error.message?.includes('violates foreign key constraint')) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'INVALID_REFERENCE',
        message: 'Referenced resource does not exist',
      },
    });
  }

  // Unknown error - return generic message
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      // Include request ID for support reference
      requestId: request.id,
    },
  });
}

// ============ SAFE WRAPPER ============

/**
 * Wrap async route handlers to catch errors
 */
export function safeHandler<T extends FastifyRequest, R>(
  handler: (request: T, reply: FastifyReply) => Promise<R>
) {
  return async (request: T, reply: FastifyReply): Promise<R | void> => {
    try {
      return await handler(request, reply);
    } catch (error) {
      return handleError(error as Error, request, reply);
    }
  };
}

// ============ RETRY UTILITIES ============

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  shouldRetry: (error: Error) => {
    // Retry on network errors and rate limits
    const retryableMessages = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
      '429',
      'rate limit',
    ];
    return retryableMessages.some(msg => 
      error.message?.toLowerCase().includes(msg.toLowerCase())
    );
  },
};

/**
 * Execute a function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === opts.maxAttempts || !opts.shouldRetry(lastError)) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000,
        opts.maxDelayMs
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// ============ TYPE GUARDS ============

export function isAppError(error: unknown): error is AppError {
  return (
    error instanceof Error &&
    'statusCode' in error &&
    'code' in error
  );
}

export function isRetryableError(error: Error): boolean {
  return DEFAULT_RETRY_OPTIONS.shouldRetry(error);
}
