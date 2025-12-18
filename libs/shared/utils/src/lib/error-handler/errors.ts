// Base Application Error
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: string;

  constructor(message: string, statusCode: number, isOperational = true, details?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    // Capture stack trace only if it exists (improves compatibility)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this);
    }
  }
}

// Not Found Error
export class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(message, 404);
  }
}

// Validation Error
export class ValidationError extends AppError {
  constructor(message = 'Invalid request', details?: string) {
    super(message, 400, true, details);
  }
}

// Authentication Error
export class AuthenticationError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

// Forbidden Error
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

// Internal Server Error
export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error') {
    super(message, 500, false);
  }
}

// Bad Request Error
export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details?: string) {
    super(message, 400, true, details);
  }
}

// Database Error
export class DatabaseError extends AppError {
  constructor(message = 'Database Error', details?: string) {
    super(message, 500, false, details);
  }
}

// Conflict Error
export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: string) {
    super(message, 409, true, details);
  }
}

// Service Unavailable Error
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service Unavailable') {
    super(message, 503, false);
  }
}

// Rate Limit Error
export class RateLimitError extends AppError {
  constructor(message = 'Too Many Requests') {
    super(message, 429, true);
  }
}

// External Service Error
export class ExternalServiceError extends AppError {
  constructor(message = 'External Service Error', details?: string) {
    super(message, 502, false, details);
  }
}

// Timeout Error
export class TimeoutError extends AppError {
  constructor(message = 'Request Timeout') {
    super(message, 504, false);
  }
}

