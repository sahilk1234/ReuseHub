export class Email {
  private readonly _value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Email cannot be empty');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedValue = value.trim().toLowerCase();
    
    if (!emailRegex.test(trimmedValue)) {
      throw new Error('Invalid email format');
    }
    
    this._value = trimmedValue;
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}