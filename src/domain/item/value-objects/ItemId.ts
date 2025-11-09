import { randomUUID } from 'crypto';

export class ItemId {
  private readonly _value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ItemId cannot be empty');
    }
    if (value.length > 36) {
      throw new Error('ItemId cannot exceed 36 characters');
    }
    this._value = value.trim();
  }

  get value(): string {
    return this._value;
  }

  equals(other: ItemId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  static generate(): ItemId {
    return new ItemId(randomUUID());
  }
}