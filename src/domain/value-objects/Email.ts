import { InvalidDataError } from '../../shared/errors/DomainError';
import { isValidEmail } from '../../shared/utils';

/**
 * Email value object that ensures valid email format
 */
export class Email {
  private readonly value: string;

  constructor(email: string) {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
      throw new InvalidDataError('Email cannot be empty', 'email');
    }

    if (!isValidEmail(trimmedEmail)) {
      throw new InvalidDataError('Invalid email format', 'email');
    }

    this.value = trimmedEmail;
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: Email): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
