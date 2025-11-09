import { ItemId } from './value-objects/ItemId';
import { ItemDetails, ItemDetailsData } from './value-objects/ItemDetails';
import { ItemStatus, ItemStatusValue } from './value-objects/ItemStatus';
import { UserId } from '../user/value-objects/UserId';
import { Location, LocationData } from '../user/value-objects/Location';

export interface CreateItemData {
  userId: string;
  details: ItemDetailsData;
  location: LocationData;
}

export interface ItemData {
  id: string;
  userId: string;
  details: ItemDetailsData;
  status: ItemStatusValue;
  location: LocationData;
  createdAt: Date;
  updatedAt: Date;
}

export class Item {
  private constructor(
    private readonly _id: ItemId,
    private readonly _userId: UserId,
    private _details: ItemDetails,
    private _status: ItemStatus,
    private _location: Location,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  static create(data: CreateItemData): Item {
    const id = ItemId.generate();
    const userId = new UserId(data.userId);
    const details = new ItemDetails(data.details);
    const status = ItemStatus.available();
    const location = new Location(data.location);
    const now = new Date();

    return new Item(
      id,
      userId,
      details,
      status,
      location,
      now,
      now
    );
  }

  static fromData(data: ItemData): Item {
    const id = new ItemId(data.id);
    const userId = new UserId(data.userId);
    const details = new ItemDetails(data.details);
    const status = new ItemStatus(data.status);
    const location = new Location(data.location);

    return new Item(
      id,
      userId,
      details,
      status,
      location,
      data.createdAt,
      data.updatedAt
    );
  }

  get id(): ItemId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get details(): ItemDetails {
    return this._details;
  }

  get status(): ItemStatus {
    return this._status;
  }

  get location(): Location {
    return this._location;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateStatus(newStatus: ItemStatusValue): void {
    if (!this._status.canTransitionTo(newStatus)) {
      throw new Error(
        `Cannot transition from ${this._status.value} to ${newStatus}`
      );
    }

    this._status = new ItemStatus(newStatus);
    this._updatedAt = new Date();
  }

  isAvailableForExchange(): boolean {
    return this._status.isAvailable();
  }

  isPendingExchange(): boolean {
    return this._status.isPending();
  }

  isExchanged(): boolean {
    return this._status.isExchanged();
  }

  isRemoved(): boolean {
    return this._status.isRemoved();
  }

  calculateDistanceFrom(location: Location): number {
    return this._location.distanceTo(location);
  }

  isWithinDistance(location: Location, maxDistanceKm: number): boolean {
    return this.calculateDistanceFrom(location) <= maxDistanceKm;
  }

  belongsToUser(userId: UserId): boolean {
    return this._userId.equals(userId);
  }

  matchesSearchCriteria(criteria: {
    searchTerm?: string;
    category?: string;
    tags?: string[];
    maxDistance?: number;
    userLocation?: Location;
  }): boolean {
    // Only consider available items for search
    if (!this.isAvailableForExchange()) {
      return false;
    }

    // Check search term
    if (criteria.searchTerm && !this._details.matchesSearchTerm(criteria.searchTerm)) {
      return false;
    }

    // Check category
    if (criteria.category && !this._details.matchesCategory(criteria.category)) {
      return false;
    }

    // Check tags
    if (criteria.tags && criteria.tags.length > 0) {
      const hasMatchingTag = criteria.tags.some(tag => this._details.hasTag(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Check distance
    if (criteria.maxDistance && criteria.userLocation) {
      if (!this.isWithinDistance(criteria.userLocation, criteria.maxDistance)) {
        return false;
      }
    }

    return true;
  }

  updateDetails(newDetails: ItemDetailsData): void {
    if (!this._status.isAvailable()) {
      throw new Error('Cannot update details of non-available items');
    }

    this._details = new ItemDetails(newDetails);
    this._updatedAt = new Date();
  }

  updateLocation(newLocation: LocationData): void {
    if (!this._status.isAvailable()) {
      throw new Error('Cannot update location of non-available items');
    }

    this._location = new Location(newLocation);
    this._updatedAt = new Date();
  }

  markAsPending(): void {
    this.updateStatus('pending');
  }

  markAsExchanged(): void {
    this.updateStatus('exchanged');
  }

  markAsRemoved(): void {
    this.updateStatus('removed');
  }

  makeAvailable(): void {
    this.updateStatus('available');
  }

  toData(): ItemData {
    return {
      id: this._id.value,
      userId: this._userId.value,
      details: this._details.toData(),
      status: this._status.value,
      location: this._location.toData(),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}