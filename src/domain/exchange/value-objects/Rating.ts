export interface RatingData {
  score: number;
  review?: string;
  ratedBy: string;
  ratedAt: Date;
}

export class Rating {
  private readonly _score: number;
  private readonly _review?: string;
  private readonly _ratedBy: string;
  private readonly _ratedAt: Date;

  constructor(data: RatingData) {
    if (data.score < 1 || data.score > 5) {
      throw new Error('Rating score must be between 1 and 5');
    }
    if (!Number.isInteger(data.score)) {
      throw new Error('Rating score must be an integer');
    }
    if (!data.ratedBy || data.ratedBy.trim().length === 0) {
      throw new Error('RatedBy cannot be empty');
    }
    if (data.review && data.review.trim().length > 500) {
      throw new Error('Review cannot exceed 500 characters');
    }

    this._score = data.score;
    this._review = data.review?.trim();
    this._ratedBy = data.ratedBy.trim();
    this._ratedAt = data.ratedAt;
  }

  get score(): number {
    return this._score;
  }

  get review(): string | undefined {
    return this._review;
  }

  get ratedBy(): string {
    return this._ratedBy;
  }

  get ratedAt(): Date {
    return this._ratedAt;
  }

  equals(other: Rating): boolean {
    return (
      this._score === other._score &&
      this._review === other._review &&
      this._ratedBy === other._ratedBy &&
      this._ratedAt.getTime() === other._ratedAt.getTime()
    );
  }

  isPositive(): boolean {
    return this._score >= 4;
  }

  isNegative(): boolean {
    return this._score <= 2;
  }

  isNeutral(): boolean {
    return this._score === 3;
  }

  toData(): RatingData {
    return {
      score: this._score,
      review: this._review,
      ratedBy: this._ratedBy,
      ratedAt: this._ratedAt
    };
  }
}