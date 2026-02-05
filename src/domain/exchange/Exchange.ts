import { ExchangeId } from './value-objects/ExchangeId';
import { ExchangeStatus, ExchangeStatusValue } from './value-objects/ExchangeStatus';
import { Rating, RatingData } from './value-objects/Rating';
import { ItemId } from '../item/value-objects/ItemId';
import { UserId } from '../user/value-objects/UserId';

export interface CreateExchangeData {
  itemId: string;
  giverId: string;
  receiverId: string;
  scheduledPickup?: Date;
}

export interface ExchangeData {
  id: string;
  itemId: string;
  giverId: string;
  receiverId: string;
  status: ExchangeStatusValue;
  scheduledPickup?: Date;
  completedAt?: Date;
  giverConfirmedAt?: Date;
  receiverConfirmedAt?: Date;
  giverRating?: RatingData;
  receiverRating?: RatingData;
  ecoPointsAwarded: number;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Exchange {
  private constructor(
    private readonly _id: ExchangeId,
    private readonly _itemId: ItemId,
    private readonly _giverId: UserId,
    private readonly _receiverId: UserId,
    private _status: ExchangeStatus,
    private _ecoPointsAwarded: number,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _scheduledPickup?: Date,
    private _completedAt?: Date,
    private _giverConfirmedAt?: Date,
    private _receiverConfirmedAt?: Date,
    private _giverRating?: Rating,
    private _receiverRating?: Rating,
    private _cancellationReason?: string
  ) {}

  static create(data: CreateExchangeData): Exchange {
    const id = ExchangeId.generate();
    const itemId = new ItemId(data.itemId);
    const giverId = new UserId(data.giverId);
    const receiverId = new UserId(data.receiverId);

    // Validate that giver and receiver are different
    if (giverId.equals(receiverId)) {
      throw new Error('Giver and receiver cannot be the same user');
    }

    const status = ExchangeStatus.requested();
    const now = new Date();

    return new Exchange(
      id,
      itemId,
      giverId,
      receiverId,
      status,
      0, // ecoPointsAwarded
      now,
      now,
      data.scheduledPickup,
      undefined, // completedAt
      undefined, // giverConfirmedAt
      undefined, // receiverConfirmedAt
      undefined, // giverRating
      undefined, // receiverRating
      undefined // cancellationReason
    );
  }

  static fromData(data: ExchangeData): Exchange {
    const id = new ExchangeId(data.id);
    const itemId = new ItemId(data.itemId);
    const giverId = new UserId(data.giverId);
    const receiverId = new UserId(data.receiverId);
    const status = new ExchangeStatus(data.status);

    const giverRating = data.giverRating ? new Rating(data.giverRating) : undefined;
    const receiverRating = data.receiverRating ? new Rating(data.receiverRating) : undefined;

    return new Exchange(
      id,
      itemId,
      giverId,
      receiverId,
      status,
      data.ecoPointsAwarded,
      data.createdAt,
      data.updatedAt,
      data.scheduledPickup,
      data.completedAt,
      data.giverConfirmedAt,
      data.receiverConfirmedAt,
      giverRating,
      receiverRating,
      data.cancellationReason
    );
  }

  get id(): ExchangeId {
    return this._id;
  }

  get itemId(): ItemId {
    return this._itemId;
  }

  get giverId(): UserId {
    return this._giverId;
  }

  get receiverId(): UserId {
    return this._receiverId;
  }

  get status(): ExchangeStatus {
    return this._status;
  }

  get scheduledPickup(): Date | undefined {
    return this._scheduledPickup;
  }

  get completedAt(): Date | undefined {
    return this._completedAt;
  }

  get giverConfirmedAt(): Date | undefined {
    return this._giverConfirmedAt;
  }

  get receiverConfirmedAt(): Date | undefined {
    return this._receiverConfirmedAt;
  }

  get giverRating(): Rating | undefined {
    return this._giverRating;
  }

  get receiverRating(): Rating | undefined {
    return this._receiverRating;
  }

  get ecoPointsAwarded(): number {
    return this._ecoPointsAwarded;
  }

  get cancellationReason(): string | undefined {
    return this._cancellationReason;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  accept(scheduledPickup?: Date): void {
    if (!this._status.canTransitionTo('accepted')) {
      throw new Error(`Cannot accept exchange in ${this._status.value} status`);
    }

    this._status = ExchangeStatus.accepted();
    this._scheduledPickup = scheduledPickup;
    this._updatedAt = new Date();
  }

  complete(ecoPointsAwarded: number = 0): void {
    if (!this._status.canTransitionTo('completed')) {
      throw new Error(`Cannot complete exchange in ${this._status.value} status`);
    }

    if (ecoPointsAwarded < 0) {
      throw new Error('Eco points awarded cannot be negative');
    }

    this._status = ExchangeStatus.completed();
    this._completedAt = new Date();
    this._ecoPointsAwarded = ecoPointsAwarded;
    this._updatedAt = new Date();
  }

  confirmHandoffBy(userId: UserId): boolean {
    if (!this._status.isAccepted()) {
      throw new Error('Can only confirm handoff after exchange is accepted');
    }

    if (this.isGiver(userId)) {
      if (this._giverConfirmedAt) {
        throw new Error('Giver has already confirmed handoff');
      }
      this._giverConfirmedAt = new Date();
    } else if (this.isReceiver(userId)) {
      if (this._receiverConfirmedAt) {
        throw new Error('Receiver has already confirmed handoff');
      }
      this._receiverConfirmedAt = new Date();
    } else {
      throw new Error('Only exchange participants can confirm handoff');
    }

    this._updatedAt = new Date();

    return Boolean(this._giverConfirmedAt && this._receiverConfirmedAt);
  }

  cancel(reason: string): void {
    if (!this._status.canTransitionTo('cancelled')) {
      throw new Error(`Cannot cancel exchange in ${this._status.value} status`);
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Cancellation reason is required');
    }

    this._status = ExchangeStatus.cancelled();
    this._cancellationReason = reason.trim();
    this._updatedAt = new Date();
  }

  rateGiver(ratingData: Omit<RatingData, 'ratedBy' | 'ratedAt'>): void {
    if (!this._status.isCompleted()) {
      throw new Error('Can only rate after exchange is completed');
    }

    if (this._giverRating) {
      throw new Error('Giver has already been rated');
    }

    this._giverRating = new Rating({
      ...ratingData,
      ratedBy: this._receiverId.value,
      ratedAt: new Date()
    });
    this._updatedAt = new Date();
  }

  rateReceiver(ratingData: Omit<RatingData, 'ratedBy' | 'ratedAt'>): void {
    if (!this._status.isCompleted()) {
      throw new Error('Can only rate after exchange is completed');
    }

    if (this._receiverRating) {
      throw new Error('Receiver has already been rated');
    }

    this._receiverRating = new Rating({
      ...ratingData,
      ratedBy: this._giverId.value,
      ratedAt: new Date()
    });
    this._updatedAt = new Date();
  }

  isParticipant(userId: UserId): boolean {
    return this._giverId.equals(userId) || this._receiverId.equals(userId);
  }

  isGiver(userId: UserId): boolean {
    return this._giverId.equals(userId);
  }

  isReceiver(userId: UserId): boolean {
    return this._receiverId.equals(userId);
  }

  canBeRatedBy(userId: UserId): boolean {
    if (!this._status.isCompleted()) {
      return false;
    }

    // Giver can rate receiver, receiver can rate giver
    if (this.isGiver(userId) && !this._receiverRating) {
      return true;
    }
    if (this.isReceiver(userId) && !this._giverRating) {
      return true;
    }

    return false;
  }

  hasBeenRated(): boolean {
    return this._giverRating !== undefined && this._receiverRating !== undefined;
  }

  getAverageRating(): number | undefined {
    if (!this._giverRating || !this._receiverRating) {
      return undefined;
    }

    return (this._giverRating.score + this._receiverRating.score) / 2;
  }

  getDurationInDays(): number {
    const endDate = this._completedAt || new Date();
    const diffInMs = endDate.getTime() - this._createdAt.getTime();
    return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  }

  isOverdue(): boolean {
    if (!this._scheduledPickup || this._status.isCompleted() || this._status.isCancelled()) {
      return false;
    }

    return new Date() > this._scheduledPickup;
  }

  toData(): ExchangeData {
    return {
      id: this._id.value,
      itemId: this._itemId.value,
      giverId: this._giverId.value,
      receiverId: this._receiverId.value,
      status: this._status.value,
      scheduledPickup: this._scheduledPickup,
      completedAt: this._completedAt,
      giverConfirmedAt: this._giverConfirmedAt,
      receiverConfirmedAt: this._receiverConfirmedAt,
      giverRating: this._giverRating?.toData(),
      receiverRating: this._receiverRating?.toData(),
      ecoPointsAwarded: this._ecoPointsAwarded,
      cancellationReason: this._cancellationReason,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}
