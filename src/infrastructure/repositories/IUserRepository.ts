import { User, UserData } from '../../domain/user/User';
import { UserId } from '../../domain/user/value-objects/UserId';
import { Email } from '../../domain/user/value-objects/Email';
import { Location } from '../../domain/user/value-objects/Location';

export interface IUserRepository {
  // Basic CRUD operations
  save(user: User, passwordHash?: string): Promise<void>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  getPasswordHashByEmail(email: Email): Promise<string | null>;
  findAll(): Promise<User[]>;
  delete(id: UserId): Promise<void>;
  
  // Domain-specific queries
  findByLocation(location: Location, radiusKm: number): Promise<User[]>;
  findVerifiedUsers(): Promise<User[]>;
  findTopRatedUsers(limit: number): Promise<User[]>;
  findByEcoPointsRange(minPoints: number, maxPoints: number): Promise<User[]>;
  findRecentlyActive(daysBack: number): Promise<User[]>;
  
  // Bulk operations
  saveMany(users: User[]): Promise<void>;
  findByIds(ids: UserId[]): Promise<User[]>;
  
  // Statistics and aggregations
  countUsers(): Promise<number>;
  countVerifiedUsers(): Promise<number>;
  getAverageRating(): Promise<number>;
  getTotalEcoPoints(): Promise<number>;
  
  // Search operations
  searchByDisplayName(searchTerm: string, limit?: number): Promise<User[]>;
  findUsersWithMinimumRating(minRating: number): Promise<User[]>;
}
