import { Item, ItemData } from '../../domain/item/Item';
import { ItemId } from '../../domain/item/value-objects/ItemId';
import { UserId } from '../../domain/user/value-objects/UserId';
import { Location } from '../../domain/user/value-objects/Location';
import { ItemStatusValue } from '../../domain/item/value-objects/ItemStatus';

export interface ItemSearchCriteria {
  searchTerm?: string;
  category?: string;
  tags?: string[];
  status?: ItemStatusValue;
  maxDistance?: number;
  userLocation?: Location;
  userId?: UserId;
  minRating?: number;
  maxRating?: number;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface ItemSearchResult {
  items: Item[];
  totalCount: number;
  hasMore: boolean;
}

export interface IItemRepository {
  // Basic CRUD operations
  save(item: Item): Promise<void>;
  findById(id: ItemId): Promise<Item | null>;
  delete(id: ItemId): Promise<void>;
  
  // Domain-specific queries
  findByUserId(userId: UserId): Promise<Item[]>;
  findByStatus(status: ItemStatusValue): Promise<Item[]>;
  findByLocation(location: Location, radiusKm: number): Promise<Item[]>;
  findByCategory(category: string): Promise<Item[]>;
  findByTags(tags: string[]): Promise<Item[]>;
  
  // Advanced search
  search(criteria: ItemSearchCriteria, limit?: number, offset?: number): Promise<ItemSearchResult>;
  findSimilarItems(item: Item, limit?: number): Promise<Item[]>;
  findAvailableItems(): Promise<Item[]>;
  findAvailableItemsNearLocation(location: Location, radiusKm: number): Promise<Item[]>;
  
  // Bulk operations
  saveMany(items: Item[]): Promise<void>;
  findByIds(ids: ItemId[]): Promise<Item[]>;
  updateStatusBatch(itemIds: ItemId[], status: ItemStatusValue): Promise<void>;
  
  // Statistics and aggregations
  countItems(): Promise<number>;
  countItemsByStatus(status: ItemStatusValue): Promise<number>;
  countItemsByUser(userId: UserId): Promise<number>;
  countItemsByCategory(): Promise<Record<string, number>>;
  getPopularTags(limit?: number): Promise<Array<{ tag: string; count: number }>>;
  
  // Geographic queries
  findItemsWithinBounds(
    northEast: { latitude: number; longitude: number },
    southWest: { latitude: number; longitude: number }
  ): Promise<Item[]>;
  
  // Time-based queries
  findRecentItems(daysBack: number): Promise<Item[]>;
  findItemsCreatedBetween(startDate: Date, endDate: Date): Promise<Item[]>;
  findStaleItems(daysOld: number): Promise<Item[]>;
}