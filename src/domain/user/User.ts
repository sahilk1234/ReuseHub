import { UserId } from './value-objects/UserId';
import { Email } from './value-objects/Email';
import { Location, LocationData } from './value-objects/Location';
import { EcoPoints } from './value-objects/EcoPoints';

export interface UserProfile {
  displayName: string;
  phone?: string;
  avatar?: string;
  isVerified: boolean;
  accountType: 'individual' | 'organization';
}

export interface CreateUserData {
  email: string;
  profile: UserProfile;
  location: LocationData;
}

export interface UserData {
  id: string;
  email: string;
  profile: UserProfile;
  location: LocationData;
  ecoPoints: number;
  ecoPointsTransactions?: Array<{
    points: number;
    reason: string;
    timestamp: Date;
  }>;
  rating: number;
  totalExchanges: number;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(
    private readonly _id: UserId,
    private readonly _email: Email,
    private _profile: UserProfile,
    private _location: Location,
    private _ecoPoints: EcoPoints,
    private _rating: number,
    private _totalExchanges: number,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  static create(data: CreateUserData): User {
    const id = UserId.generate();
    const email = new Email(data.email);
    const location = new Location(data.location);
    const ecoPoints = new EcoPoints(0);
    const now = new Date();

    return new User(
      id,
      email,
      data.profile,
      location,
      ecoPoints,
      0, // initial rating
      0, // initial total exchanges
      now,
      now
    );
  }

  static fromData(data: UserData): User {
    const id = new UserId(data.id);
    const email = new Email(data.email);
    const location = new Location(data.location);
    const ecoPoints = new EcoPoints(
      data.ecoPoints,
      data.ecoPointsTransactions || []
    );

    return new User(
      id,
      email,
      data.profile,
      location,
      ecoPoints,
      data.rating,
      data.totalExchanges,
      data.createdAt,
      data.updatedAt
    );
  }

  get id(): UserId {
    return this._id;
  }

  get email(): Email {
    return this._email;
  }

  get profile(): UserProfile {
    return { ...this._profile };
  }

  get location(): Location {
    return this._location;
  }

  get ecoPoints(): EcoPoints {
    return this._ecoPoints;
  }

  get rating(): number {
    return this._rating;
  }

  get totalExchanges(): number {
    return this._totalExchanges;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateProfile(profile: UserProfile): void {
    if (!profile.displayName || profile.displayName.trim().length === 0) {
      throw new Error('Display name cannot be empty');
    }
    
    if (profile.phone && profile.phone.trim().length > 0) {
      const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(profile.phone.trim())) {
        throw new Error('Invalid phone number format');
      }
    }

    this._profile = { ...profile };
    this._updatedAt = new Date();
  }

  updateLocation(location: LocationData): void {
    this._location = new Location(location);
    this._updatedAt = new Date();
  }

  awardPoints(points: number, reason: string): void {
    if (points <= 0) {
      throw new Error('Points to award must be positive');
    }
    
    this._ecoPoints = this._ecoPoints.add(points, reason);
    this._updatedAt = new Date();
  }

  canExchangeWith(otherUser: User): boolean {
    // Users cannot exchange with themselves
    if (this._id.equals(otherUser._id)) {
      return false;
    }

    // Both users must be verified for exchanges
    if (!this._profile.isVerified || !otherUser._profile.isVerified) {
      return false;
    }

    // Users with very low ratings (below 2.0) cannot exchange
    if (this._rating < 2.0 || otherUser._rating < 2.0) {
      return false;
    }

    return true;
  }

  updateRating(newRating: number): void {
    if (newRating < 0 || newRating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }
    
    this._rating = newRating;
    this._updatedAt = new Date();
  }

  incrementExchangeCount(): void {
    this._totalExchanges += 1;
    this._updatedAt = new Date();
  }

  isWithinDistance(otherLocation: Location, maxDistanceKm: number): boolean {
    return this._location.distanceTo(otherLocation) <= maxDistanceKm;
  }

  toData(): UserData {
    return {
      id: this._id.value,
      email: this._email.value,
      profile: { ...this._profile },
      location: this._location.toData(),
      ecoPoints: this._ecoPoints.value,
      ecoPointsTransactions: this._ecoPoints.transactions.map(t => ({ ...t })),
      rating: this._rating,
      totalExchanges: this._totalExchanges,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}