/**
 * Base class for all domain-specific errors
 * Domain errors represent business rule violations
 */
export abstract class DomainError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(message: string, code?: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code || this.constructor.name;
    this.timestamp = new Date();
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when invalid data is provided to domain entities
 */
export class InvalidDataError extends DomainError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'INVALID_DATA');
  }
}

/**
 * Thrown when a business rule is violated
 */
export class BusinessRuleViolationError extends DomainError {
  constructor(message: string, public readonly rule?: string) {
    super(message, 'BUSINESS_RULE_VIOLATION');
  }
}

/**
 * Thrown when an entity is not found
 */
export class EntityNotFoundError extends DomainError {
  constructor(entityName: string, identifier: string) {
    super(`${entityName} with identifier '${identifier}' not found`, 'ENTITY_NOT_FOUND');
  }
}

/**
 * Thrown when an entity already exists
 */
export class EntityAlreadyExistsError extends DomainError {
  constructor(entityName: string, identifier: string) {
    super(`${entityName} with identifier '${identifier}' already exists`, 'ENTITY_ALREADY_EXISTS');
  }
}

/**
 * Thrown when insufficient permissions for an operation
 */
export class InsufficientPermissionsError extends DomainError {
  constructor(operation: string, resource?: string) {
    const message = resource 
      ? `Insufficient permissions to ${operation} on ${resource}`
      : `Insufficient permissions to ${operation}`;
    super(message, 'INSUFFICIENT_PERMISSIONS');
  }
}
