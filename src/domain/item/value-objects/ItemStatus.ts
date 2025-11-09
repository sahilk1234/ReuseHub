export type ItemStatusValue = 'available' | 'pending' | 'exchanged' | 'removed';

export class ItemStatus {
  private readonly _value: ItemStatusValue;

  constructor(value: ItemStatusValue) {
    this._value = value;
  }

  get value(): ItemStatusValue {
    return this._value;
  }

  equals(other: ItemStatus): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  isAvailable(): boolean {
    return this._value === 'available';
  }

  isPending(): boolean {
    return this._value === 'pending';
  }

  isExchanged(): boolean {
    return this._value === 'exchanged';
  }

  isRemoved(): boolean {
    return this._value === 'removed';
  }

  canTransitionTo(newStatus: ItemStatusValue): boolean {
    const transitions: Record<ItemStatusValue, ItemStatusValue[]> = {
      'available': ['pending', 'removed'],
      'pending': ['available', 'exchanged', 'removed'],
      'exchanged': ['removed'],
      'removed': []
    };

    return transitions[this._value].includes(newStatus);
  }

  static available(): ItemStatus {
    return new ItemStatus('available');
  }

  static pending(): ItemStatus {
    return new ItemStatus('pending');
  }

  static exchanged(): ItemStatus {
    return new ItemStatus('exchanged');
  }

  static removed(): ItemStatus {
    return new ItemStatus('removed');
  }
}