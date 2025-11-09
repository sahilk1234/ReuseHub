import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IItemRepository, ItemSearchCriteria, ItemSearchResult } from '../IItemRepository';
import { Item, ItemData } from '../../../domain/item/Item';
import { ItemId } from '../../../domain/item/value-objects/ItemId';
import { UserId } from '../../../domain/user/value-objects/UserId';
import { Location } from '../../../domain/user/value-objects/Location';
import { ItemStatusValue } from '../../../domain/item/value-objects/ItemStatus';
import { DatabaseConnection } from '../../database/DatabaseConnection';

interface ItemRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  tags: string | string[];
  images: string | string[];
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  status: ItemStatusValue;
  latitude: number;
  longitude: number;
  address: string;
  dimensions?: string | any;
  pickup_instructions?: string;
  created_at: Date;
  updated_at: Date;
  text_similarity?: number;
}

@injectable()
export class PostgreSQLItemRepository implements IItemRepository {
  constructor(
    @inject(TYPES.DatabaseConnection)
    private db: DatabaseConnection
  ) {}

  async save(item: Item): Promise<void> {
    const itemData = item.toData();
    
    const query = `
      INSERT INTO items (
        id, user_id, title, description, category, tags, images, condition,
        status, latitude, longitude, address, dimensions, pickup_instructions,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        tags = EXCLUDED.tags,
        images = EXCLUDED.images,
        condition = EXCLUDED.condition,
        status = EXCLUDED.status,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        address = EXCLUDED.address,
        dimensions = EXCLUDED.dimensions,
        pickup_instructions = EXCLUDED.pickup_instructions,
        updated_at = EXCLUDED.updated_at
    `;

    const params = [
      itemData.id,
      itemData.userId,
      itemData.details.title,
      itemData.details.description,
      itemData.details.category,
      JSON.stringify(itemData.details.tags),
      JSON.stringify(itemData.details.images),
      itemData.details.condition,
      itemData.status,
      itemData.location.latitude,
      itemData.location.longitude,
      itemData.location.address,
      itemData.details.dimensions ? JSON.stringify(itemData.details.dimensions) : null,
      itemData.details.pickupInstructions || null,
      itemData.createdAt,
      itemData.updatedAt
    ];

    await this.db.query(query, params);
  }

  async findById(id: ItemId): Promise<Item | null> {
    const query = 'SELECT * FROM items WHERE id = $1';
    const result = await this.db.query<ItemRow>(query, [id.value]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToItem(result.rows[0]);
  }

  async delete(id: ItemId): Promise<void> {
    const query = 'DELETE FROM items WHERE id = $1';
    await this.db.query(query, [id.value]);
  }

  async findByUserId(userId: UserId): Promise<Item[]> {
    const query = 'SELECT * FROM items WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await this.db.query<ItemRow>(query, [userId.value]);
    return result.rows.map(row => this.mapRowToItem(row));
  }

  async findByStatus(status: ItemStatusValue): Promise<Item[]> {
    const query = 'SELECT * FROM items WHERE status = $1 ORDER BY created_at DESC';
    const result = await this.db.query<ItemRow>(query, [status]);
    return result.rows.map(row => this.mapRowToItem(row));
  }

  async findByLocation(location: Location, radiusKm: number): Promise<Item[]> {
    const query = `
      SELECT * FROM items 
      WHERE ST_DWithin(
        ST_MakePoint(longitude, latitude)::geography,
        ST_MakePoint($1, $2)::geography,
        $3 * 1000
      )
      ORDER BY ST_Distance(
        ST_MakePoint(longitude, latitude)::geography,
        ST_MakePoint($1, $2)::geography
      )
    `;
    
    const locationData = location.toData();
    const result = await this.db.query<ItemRow>(query, [
      locationData.longitude,
      locationData.latitude,
      radiusKm
    ]);

    return result.rows.map(row => this.mapRowToItem(row));
  }

  async findByCategory(category: string): Promise<Item[]> {
    const query = 'SELECT * FROM items WHERE category = $1 ORDER BY created_at DESC';
    const result = await this.db.query<ItemRow>(query, [category]);
    return result.rows.map(row => this.mapRowToItem(row));
  }

  async findByTags(tags: string[]): Promise<Item[]> {
    const query = `
      SELECT * FROM items 
      WHERE tags::jsonb ?| $1
      ORDER BY created_at DESC
    `;
    const result = await this.db.query<ItemRow>(query, [tags]);
    return result.rows.map(row => this.mapRowToItem(row));
  }

  async search(criteria: ItemSearchCriteria, limit: number = 50, offset: number = 0): Promise<ItemSearchResult> {
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Build WHERE conditions based on criteria
    if (criteria.searchTerm) {
      whereConditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${criteria.searchTerm}%`);
      paramIndex++;
    }

    if (criteria.category) {
      whereConditions.push(`category = $${paramIndex}`);
      params.push(criteria.category);
      paramIndex++;
    }

    if (criteria.tags && criteria.tags.length > 0) {
      whereConditions.push(`tags::jsonb ?| $${paramIndex}`);
      params.push(criteria.tags);
      paramIndex++;
    }

    if (criteria.status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(criteria.status);
      paramIndex++;
    }

    if (criteria.userId) {
      whereConditions.push(`user_id = $${paramIndex}`);
      params.push(criteria.userId.value);
      paramIndex++;
    }

    if (criteria.createdAfter) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      params.push(criteria.createdAfter);
      paramIndex++;
    }

    if (criteria.createdBefore) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      params.push(criteria.createdBefore);
      paramIndex++;
    }

    // Geographic search
    let orderBy = 'created_at DESC';
    if (criteria.userLocation && criteria.maxDistance) {
      const locationData = criteria.userLocation.toData();
      whereConditions.push(`
        ST_DWithin(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint($${paramIndex}, $${paramIndex + 1})::geography,
          $${paramIndex + 2} * 1000
        )
      `);
      params.push(locationData.longitude, locationData.latitude, criteria.maxDistance);
      paramIndex += 3;
      
      orderBy = `
        ST_Distance(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint($${paramIndex}, $${paramIndex + 1})::geography
        )
      `;
      params.push(locationData.longitude, locationData.latitude);
      paramIndex += 2;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Count query
    const countQuery = `SELECT COUNT(*) as count FROM items ${whereClause}`;
    const countResult = await this.db.query<{ count: string }>(countQuery, params.slice(0, paramIndex - (criteria.userLocation && criteria.maxDistance ? 2 : 0)));
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Data query
    const dataQuery = `
      SELECT * FROM items 
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);
    
    const result = await this.db.query<ItemRow>(dataQuery, params);
    const items = result.rows.map(row => this.mapRowToItem(row));

    return {
      items,
      totalCount,
      hasMore: offset + items.length < totalCount
    };
  }

  async findSimilarItems(item: Item, limit: number = 10): Promise<Item[]> {
    const itemData = item.toData();
    const query = `
      SELECT *, 
        similarity(title, $1) + similarity(description, $2) as text_similarity
      FROM items 
      WHERE id != $3 
        AND status = 'available'
        AND (category = $4 OR tags::jsonb ?| $5)
      ORDER BY text_similarity DESC, created_at DESC
      LIMIT $6
    `;
    
    const result = await this.db.query<ItemRow>(query, [
      itemData.details.title,
      itemData.details.description,
      itemData.id,
      itemData.details.category,
      itemData.details.tags,
      limit
    ]);

    return result.rows.map(row => this.mapRowToItem(row));
  }

  async findAvailableItems(): Promise<Item[]> {
    return this.findByStatus('available');
  }

  async findAvailableItemsNearLocation(location: Location, radiusKm: number): Promise<Item[]> {
    const query = `
      SELECT * FROM items 
      WHERE status = 'available'
        AND ST_DWithin(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint($1, $2)::geography,
          $3 * 1000
        )
      ORDER BY ST_Distance(
        ST_MakePoint(longitude, latitude)::geography,
        ST_MakePoint($1, $2)::geography
      )
    `;
    
    const locationData = location.toData();
    const result = await this.db.query<ItemRow>(query, [
      locationData.longitude,
      locationData.latitude,
      radiusKm
    ]);

    return result.rows.map(row => this.mapRowToItem(row));
  }

  async saveMany(items: Item[]): Promise<void> {
    if (items.length === 0) return;

    await this.db.transaction(async (trx) => {
      for (const item of items) {
        const itemData = item.toData();
        const query = `
          INSERT INTO items (
            id, user_id, title, description, category, tags, images, condition,
            status, latitude, longitude, address, dimensions, pickup_instructions,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            tags = EXCLUDED.tags,
            images = EXCLUDED.images,
            condition = EXCLUDED.condition,
            status = EXCLUDED.status,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            address = EXCLUDED.address,
            dimensions = EXCLUDED.dimensions,
            pickup_instructions = EXCLUDED.pickup_instructions,
            updated_at = EXCLUDED.updated_at
        `;

        const params = [
          itemData.id,
          itemData.userId,
          itemData.details.title,
          itemData.details.description,
          itemData.details.category,
          JSON.stringify(itemData.details.tags),
          JSON.stringify(itemData.details.images),
          itemData.details.condition,
          itemData.status,
          itemData.location.latitude,
          itemData.location.longitude,
          itemData.location.address,
          itemData.details.dimensions ? JSON.stringify(itemData.details.dimensions) : null,
          itemData.details.pickupInstructions || null,
          itemData.createdAt,
          itemData.updatedAt
        ];

        await trx.query(query, params);
      }
    });
  }

  async findByIds(ids: ItemId[]): Promise<Item[]> {
    if (ids.length === 0) return [];

    const idValues = ids.map(id => id.value);
    const query = 'SELECT * FROM items WHERE id = ANY($1)';
    const result = await this.db.query<ItemRow>(query, [idValues]);
    return result.rows.map(row => this.mapRowToItem(row));
  }

  async updateStatusBatch(itemIds: ItemId[], status: ItemStatusValue): Promise<void> {
    if (itemIds.length === 0) return;

    const idValues = itemIds.map(id => id.value);
    const query = `
      UPDATE items 
      SET status = $1, updated_at = NOW() 
      WHERE id = ANY($2)
    `;
    await this.db.query(query, [status, idValues]);
  }

  async countItems(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM items';
    const result = await this.db.query<{ count: string }>(query);
    return parseInt(result.rows[0].count, 10);
  }

  async countItemsByStatus(status: ItemStatusValue): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM items WHERE status = $1';
    const result = await this.db.query<{ count: string }>(query, [status]);
    return parseInt(result.rows[0].count, 10);
  }

  async countItemsByUser(userId: UserId): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM items WHERE user_id = $1';
    const result = await this.db.query<{ count: string }>(query, [userId.value]);
    return parseInt(result.rows[0].count, 10);
  }

  async countItemsByCategory(): Promise<Record<string, number>> {
    const query = `
      SELECT category, COUNT(*) as count 
      FROM items 
      GROUP BY category 
      ORDER BY count DESC
    `;
    const result = await this.db.query<{ category: string; count: string }>(query);
    
    const counts: Record<string, number> = {};
    result.rows.forEach(row => {
      counts[row.category] = parseInt(row.count, 10);
    });
    
    return counts;
  }

  async getPopularTags(limit: number = 20): Promise<Array<{ tag: string; count: number }>> {
    const query = `
      SELECT tag, COUNT(*) as count
      FROM items, jsonb_array_elements_text(tags) as tag
      GROUP BY tag
      ORDER BY count DESC
      LIMIT $1
    `;
    const result = await this.db.query<{ tag: string; count: string }>(query, [limit]);
    
    return result.rows.map((row: { tag: string; count: string }) => ({
      tag: row.tag,
      count: parseInt(row.count, 10)
    }));
  }

  async findItemsWithinBounds(
    northEast: { latitude: number; longitude: number },
    southWest: { latitude: number; longitude: number }
  ): Promise<Item[]> {
    const query = `
      SELECT * FROM items 
      WHERE latitude BETWEEN $1 AND $2
        AND longitude BETWEEN $3 AND $4
      ORDER BY created_at DESC
    `;
    
    const result = await this.db.query<ItemRow>(query, [
      southWest.latitude,
      northEast.latitude,
      southWest.longitude,
      northEast.longitude
    ]);

    return result.rows.map(row => this.mapRowToItem(row));
  }

  async findRecentItems(daysBack: number): Promise<Item[]> {
    const query = `
      SELECT * FROM items 
      WHERE created_at >= NOW() - INTERVAL '$1 days'
      ORDER BY created_at DESC
    `;
    const result = await this.db.query<ItemRow>(query, [daysBack]);
    return result.rows.map(row => this.mapRowToItem(row));
  }

  async findItemsCreatedBetween(startDate: Date, endDate: Date): Promise<Item[]> {
    const query = `
      SELECT * FROM items 
      WHERE created_at >= $1 AND created_at <= $2
      ORDER BY created_at DESC
    `;
    const result = await this.db.query<ItemRow>(query, [startDate, endDate]);
    return result.rows.map(row => this.mapRowToItem(row));
  }

  async findStaleItems(daysOld: number): Promise<Item[]> {
    const query = `
      SELECT * FROM items 
      WHERE status = 'available' 
        AND updated_at <= NOW() - INTERVAL '$1 days'
      ORDER BY updated_at ASC
    `;
    const result = await this.db.query<ItemRow>(query, [daysOld]);
    return result.rows.map(row => this.mapRowToItem(row));
  }

  private mapRowToItem(row: ItemRow): Item {
    const itemData: ItemData = {
      id: row.id,
      userId: row.user_id,
      details: {
        title: row.title,
        description: row.description,
        category: row.category,
        tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
        images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images,
        condition: row.condition,
        dimensions: row.dimensions ? (typeof row.dimensions === 'string' ? JSON.parse(row.dimensions) : row.dimensions) : undefined,
        pickupInstructions: row.pickup_instructions
      },
      status: row.status,
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
        address: row.address
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    return Item.fromData(itemData);
  }
}