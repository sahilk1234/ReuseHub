import { randomUUID } from 'crypto';

export class ExchangeId {
  private readonly _value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ExchangeId cannot be empty');
    }
    if (value.length > 36) {
      throw new Error('ExchangeId cannot exceed 36 characters');
    }
    this._value = value.trim();
  }

  get value(): string {
    return this._value;
  }

  equals(other: ExchangeId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  static generate(): ExchangeId {
    return new ExchangeId(randomUUID());
  }
}