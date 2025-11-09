export type ExchangeStatusValue = 'requested' | 'accepted' | 'completed' | 'cancelled';

export class ExchangeStatus {
  private readonly _value: ExchangeStatusValue;

  constructor(value: ExchangeStatusValue) {
    this._value = value;
  }

  get value(): ExchangeStatusValue {
    return this._value;
  }

  equals(other: ExchangeStatus): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  isRequested(): boolean {
    return this._value === 'requested';
  }

  isAccepted(): boolean {
    return this._value === 'accepted';
  }

  isCompleted(): boolean {
    return this._value === 'completed';
  }

  isCancelled(): boolean {
    return this._value === 'cancelled';
  }

  canTransitionTo(newStatus: ExchangeStatusValue): boolean {
    const transitions: Record<ExchangeStatusValue, ExchangeStatusValue[]> = {
      'requested': ['accepted', 'cancelled'],
      'accepted': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };

    return transitions[this._value].includes(newStatus);
  }

  static requested(): ExchangeStatus {
    return new ExchangeStatus('requested');
  }

  static accepted(): ExchangeStatus {
    return new ExchangeStatus('accepted');
  }

  static completed(): ExchangeStatus {
    return new ExchangeStatus('completed');
  }

  static cancelled(): ExchangeStatus {
    return new ExchangeStatus('cancelled');
  }
}