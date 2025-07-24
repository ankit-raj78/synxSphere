/**
 * Base application error class
 * All application errors should extend this class
 */
export abstract class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational
    };
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, public readonly errors: any[] = []) {
    super(message, 400, 'VALIDATION_ERROR');
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors
    };
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Authentication error for auth failures
 */
export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error for permission failures
 */
export class AuthorizationError extends AppError {
  constructor(message: string) {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Conflict error for resource conflicts
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Business rule violation error
 */
export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION');
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  constructor(message: string, public readonly service: string) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
  }

  toJSON() {
    return {
      ...super.toJSON(),
      service: this.service
    };
  }
}
