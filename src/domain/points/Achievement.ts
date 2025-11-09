export interface AchievementData {
  id: string;
  userId: string;
  badgeId: string;
  unlockedAt: Date;
  progress: number;
}

export class Achievement {
  private constructor(
    private readonly _id: string,
    private readonly _userId: string,
    private readonly _badgeId: string,
    private readonly _unlockedAt: Date,
    private _progress: number
  ) {}

  static create(userId: string, badgeId: string): Achievement {
    const id = `${userId}-${badgeId}-${Date.now()}`;
    return new Achievement(id, userId, badgeId, new Date(), 0);
  }

  static fromData(data: AchievementData): Achievement {
    return new Achievement(
      data.id,
      data.userId,
      data.badgeId,
      data.unlockedAt,
      data.progress
    );
  }

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get badgeId(): string {
    return this._badgeId;
  }

  get unlockedAt(): Date {
    return this._unlockedAt;
  }

  get progress(): number {
    return this._progress;
  }

  updateProgress(progress: number): void {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    this._progress = progress;
  }

  isUnlocked(): boolean {
    return this._progress >= 100;
  }

  toData(): AchievementData {
    return {
      id: this._id,
      userId: this._userId,
      badgeId: this._badgeId,
      unlockedAt: this._unlockedAt,
      progress: this._progress
    };
  }
}
