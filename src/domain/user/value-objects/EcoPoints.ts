export interface EcoPointsTransaction {
  points: number;
  reason: string;
  timestamp: Date;
}

export class EcoPoints {
  private readonly _value: number;
  private readonly _transactions: EcoPointsTransaction[];

  constructor(value: number = 0, transactions: EcoPointsTransaction[] = []) {
    if (value < 0) {
      throw new Error('EcoPoints cannot be negative');
    }
    this._value = Math.floor(value);
    this._transactions = [...transactions];
  }

  get value(): number {
    return this._value;
  }

  get transactions(): readonly EcoPointsTransaction[] {
    return this._transactions;
  }

  add(points: number, reason: string): EcoPoints {
    if (points <= 0) {
      throw new Error('Points to add must be positive');
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error('Reason for points addition cannot be empty');
    }

    const newTransaction: EcoPointsTransaction = {
      points,
      reason: reason.trim(),
      timestamp: new Date()
    };

    return new EcoPoints(
      this._value + points,
      [...this._transactions, newTransaction]
    );
  }

  equals(other: EcoPoints): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value.toString();
  }

  getLevel(): string {
    if (this._value >= 10000) return 'Champion';
    if (this._value >= 5000) return 'Expert';
    if (this._value >= 2000) return 'Advanced';
    if (this._value >= 500) return 'Intermediate';
    if (this._value >= 100) return 'Beginner';
    return 'Newcomer';
  }

  getRecentTransactions(days: number = 30): EcoPointsTransaction[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this._transactions.filter(
      transaction => transaction.timestamp >= cutoffDate
    );
  }
}