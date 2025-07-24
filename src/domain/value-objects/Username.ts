import { InvalidDataError } from '../../shared/errors/DomainError';
import { sanitizeString, validateStringLength } from '../../shared/utils';

/**
 * Username value object with validation rules
 */
export class Username {
  private readonly value: string;

  constructor(username: string) {
    const sanitized = sanitizeString(username);
    
    validateStringLength(sanitized, 3, 30, 'Username');
    
    // Username validation rules
    if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
      throw new InvalidDataError(
        'Username can only contain letters, numbers, underscores, and hyphens', 
        'username'
      );
    }

    if (sanitized.startsWith('-') || sanitized.startsWith('_')) {
      throw new InvalidDataError(
        'Username cannot start with underscore or hyphen', 
        'username'
      );
    }

    // Reserved usernames
    const reserved = ['admin', 'root', 'api', 'www', 'null', 'undefined'];
    if (reserved.includes(sanitized.toLowerCase())) {
      throw new InvalidDataError('This username is reserved', 'username');
    }

    this.value = sanitized;
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: Username): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }

  public toString(): string {
    return this.value;
  }
}
