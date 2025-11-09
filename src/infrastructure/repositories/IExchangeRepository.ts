import { Exchange, ExchangeData } from '../../domain/exchange/Exchange';
import { ExchangeId } from '../../domain/exchange/value-objects/ExchangeId';
import { UserId } from '../../domain/user/value-objects/UserId';
import { ItemId } from '../../domain/item/value-objects/ItemId';
import { ExchangeStatusValue } from '../../domain/exchange/value-objects/ExchangeStatus';

export interface ExchangeSearchCriteria {
  userId?: UserId;
  itemId?: ItemId;
  giverId?: UserId;
  receiverId?: UserId;
  status?: ExchangeStatusValue;
  createdAfter?: Date;
  createdBefore?: Date;
  completedAfter?: Date;
  completedBefore?: Date;
  scheduledAfter?: Date;
  scheduledBefore?: Date;
  hasRating?: boolean;
  minRating?: number;
  maxRating?: number;
}

export interface ExchangeSearchResult {
  exchanges: Exchange[];
  totalCount: number;
  hasMore: boolean;
}

export interface ExchangeStatistics {
  totalExchanges: number;
  completedExchanges: number;
  cancelledExchanges: number;
  averageCompletionTime: number; // in days
  averageRating: number;
  totalEcoPointsAwarded: number;
}

export interface IExchangeRepository {
  // Basic CRUD operations
  save(exchange: Exchange): Promise<void>;
  findById(id: ExchangeId): Promise<Exchange | null>;
  delete(id: ExchangeId): Promise<void>;
  
  // Domain-specific queries
  findByItemId(itemId: ItemId): Promise<Exchange[]>;
  findByUserId(userId: UserId): Promise<Exchange[]>;
  findByGiverId(giverId: UserId): Promise<Exchange[]>;
  findByReceiverId(receiverId: UserId): Promise<Exchange[]>;
  findByStatus(status: ExchangeStatusValue): Promise<Exchange[]>;
  
  // User-specific queries
  findUserExchangeHistory(userId: UserId, limit?: number, offset?: number): Promise<ExchangeSearchResult>;
  findUserAsGiver(userId: UserId): Promise<Exchange[]>;
  findUserAsReceiver(userId: UserId): Promise<Exchange[]>;
  findUserCompletedExchanges(userId: UserId): Promise<Exchange[]>;
  findUserPendingExchanges(userId: UserId): Promise<Exchange[]>;
  
  // Advanced search
  search(criteria: ExchangeSearchCriteria, limit?: number, offset?: number): Promise<ExchangeSearchResult>;
  findActiveExchanges(): Promise<Exchange[]>;
  findCompletedExchanges(): Promise<Exchange[]>;
  findOverdueExchanges(): Promise<Exchange[]>;
  findUnratedExchanges(): Promise<Exchange[]>;
  
  // Bulk operations
  saveMany(exchanges: Exchange[]): Promise<void>;
  findByIds(ids: ExchangeId[]): Promise<Exchange[]>;
  updateStatusBatch(exchangeIds: ExchangeId[], status: ExchangeStatusValue): Promise<void>;
  
  // Statistics and aggregations
  countExchanges(): Promise<number>;
  countExchangesByStatus(status: ExchangeStatusValue): Promise<number>;
  countExchangesByUser(userId: UserId): Promise<number>;
  getExchangeStatistics(): Promise<ExchangeStatistics>;
  getUserExchangeStatistics(userId: UserId): Promise<ExchangeStatistics>;
  
  // Rating queries
  findExchangesWithRatings(): Promise<Exchange[]>;
  findExchangesByRatingRange(minRating: number, maxRating: number): Promise<Exchange[]>;
  getAverageRatingForUser(userId: UserId): Promise<number>;
  
  // Time-based queries
  findRecentExchanges(daysBack: number): Promise<Exchange[]>;
  findExchangesInDateRange(startDate: Date, endDate: Date): Promise<Exchange[]>;
  findExchangesByCompletionDate(startDate: Date, endDate: Date): Promise<Exchange[]>;
  
  // Business logic queries
  findExchangeForItem(itemId: ItemId, status?: ExchangeStatusValue): Promise<Exchange | null>;
  hasUserExchangedWith(userId1: UserId, userId2: UserId): Promise<boolean>;
  countSuccessfulExchangesBetweenUsers(userId1: UserId, userId2: UserId): Promise<number>;
}