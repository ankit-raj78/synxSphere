import { v4 as uuidv4, validate as isValidUuid } from 'uuid';
import { InvalidDataError } from './errors/DomainError';

/**
 * Generates a new unique identifier
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Validates if a string is a valid UUID
 */
export function validateId(id: string): boolean {
  return isValidUuid(id);
}

/**
 * Ensures an ID is valid, throws error if not
 */
export function ensureValidId(id: string, entityName = 'Entity'): void {
  if (!validateId(id)) {
    throw new InvalidDataError(`Invalid ${entityName} ID format: ${id}`, 'id');
  }
}

/**
 * Validates email format using RFC 5322 compliant regex
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Validates string length within bounds
 */
export function validateStringLength(
  value: string, 
  minLength: number, 
  maxLength: number, 
  fieldName: string
): void {
  if (value.length < minLength || value.length > maxLength) {
    throw new InvalidDataError(
      `${fieldName} must be between ${minLength} and ${maxLength} characters`,
      fieldName.toLowerCase()
    );
  }
}

/**
 * Sanitizes string input by trimming and removing extra whitespace
 */
export function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Deep freezes an object to prevent mutation
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  Object.freeze(obj);
  
  Object.getOwnPropertyNames(obj).forEach(prop => {
    const val = (obj as any)[prop];
    if (val && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  });
  
  return obj;
}
