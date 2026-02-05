import { IExchangeRepository, ExchangeSearchCriteria, ExchangeSearchResult, ExchangeStatistics } from '../IExchangeRepository';
import { Exchange, ExchangeData } from '../../../domain/exchange/Exchange';
import { ExchangeId } from '../../../domain/exchange/value-objects/ExchangeId';
import { UserId } from '../../../domain/user/value-objects/UserId';
import { ItemId } from '../../../domain/item/value-objects/ItemId';
import { ExchangeStatusValue } from '../../../domain/exchange/value-objects/ExchangeStatus';
import { DatabaseConnection } from '../../database/DatabaseConnection';

interface ExchangeRow {
  id: string;
  item_id: string;
  giver_id: string;
  receiver_id: string;
  status: ExchangeStatusValue;
  scheduled_pickup?: Date;
  completed_at?: Date;
  giver_confirmed_at?: Date;
  receiver_confirmed_at?: Date;
  giver_rating_score?: number;
  giver_rating_review?: string;
  giver_rating_rated_by?: string;
  giver_rating_rated_at?: Date;
  receiver_rating_score?: number;
  receiver_rating_review?: string;
  receiver_rating_rated_by?: string;
  receiver_rating_rated_at?: Date;
  eco_points_awarded: number;
  cancellation_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export class PostgreSQLExchangeRepository implements IExchangeRepository {
  constructor(private db: DatabaseConnection) {}

  async save(exchange: Exchange): Promise<void> {
    const exchangeData = exchange.toData();
    
    const query = `
      INSERT INTO exchanges (
        id, item_id, giver_id, receiver_id, status, scheduled_pickup,
        completed_at, giver_confirmed_at, receiver_confirmed_at,
        giver_rating_score, giver_rating_review, giver_rating_rated_by, giver_rating_rated_at,
        receiver_rating_score, receiver_rating_review, receiver_rating_rated_by, receiver_rating_rated_at,
        eco_points_awarded, cancellation_reason, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        scheduled_pickup = EXCLUDED.scheduled_pickup,
        completed_at = EXCLUDED.completed_at,
        giver_confirmed_at = EXCLUDED.giver_confirmed_at,
        receiver_confirmed_at = EXCLUDED.receiver_confirmed_at,
        giver_rating_score = EXCLUDED.giver_rating_score,
        giver_rating_review = EXCLUDED.giver_rating_review,
        giver_rating_rated_by = EXCLUDED.giver_rating_rated_by,
        giver_rating_rated_at = EXCLUDED.giver_rating_rated_at,
        receiver_rating_score = EXCLUDED.receiver_rating_score,
        receiver_rating_review = EXCLUDED.receiver_rating_review,
        receiver_rating_rated_by = EXCLUDED.receiver_rating_rated_by,
        receiver_rating_rated_at = EXCLUDED.receiver_rating_rated_at,
        eco_points_awarded = EXCLUDED.eco_points_awarded,
        cancellation_reason = EXCLUDED.cancellation_reason,
        updated_at = EXCLUDED.updated_at
    `;

    const params = [
      exchangeData.id,
      exchangeData.itemId,
      exchangeData.giverId,
      exchangeData.receiverId,
      exchangeData.status,
      exchangeData.scheduledPickup || null,
      exchangeData.completedAt || null,
      exchangeData.giverConfirmedAt || null,
      exchangeData.receiverConfirmedAt || null,
      exchangeData.giverRating?.score || null,
      exchangeData.giverRating?.review || null,
      exchangeData.giverRating?.ratedBy || null,
      exchangeData.giverRating?.ratedAt || null,
      exchangeData.receiverRating?.score || null,
      exchangeData.receiverRating?.review || null,
      exchangeData.receiverRating?.ratedBy || null,
      exchangeData.receiverRating?.ratedAt || null,
      exchangeData.ecoPointsAwarded,
      exchangeData.cancellationReason || null,
      exchangeData.createdAt,
      exchangeData.updatedAt
    ];

    await this.db.query(query, params);
  }

  async findById(id: ExchangeId): Promise<Exchange | null> {
    const query = 'SELECT * FROM exchanges WHERE id = $1';
    const result = await this.db.query<ExchangeRow>(query, [id.value]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToExchange(result.rows[0]);
  }

  async delete(id: ExchangeId): Promise<void> {
    const query = 'DELETE FROM exchanges WHERE id = $1';
    await this.db.query(query, [id.value]);
  }

  async findByItemId(itemId: ItemId): Promise<Exchange[]> {
    const query = 'SELECT * FROM exchanges WHERE item_id = $1 ORDER BY created_at DESC';
    const result = await this.db.query<ExchangeRow>(query, [itemId.value]);
    return result.rows.map(row => this.mapRowToExchange(row));
  }

  async findByUserId(userId: UserId): Promise<Exchange[]> {
    const query = `
      SELECT * FROM exchanges 
      WHERE giver_id = $1 OR receiver_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await this.db.query<any>(query, [userId.value]);
    return result.rows.map(row => this.mapRowToExchange(row));
  }

  async findByGiverId(giverId: UserId): Promise<Exchange[]> {
    const query = 'SELECT * FROM exchanges WHERE giver_id = $1 ORDER BY created_at DESC';
    const result = await this.db.query<any>(query, [giverId.value]);
    return result.rows.map(row => this.mapRowToExchange(row));
  }

  async findByReceiverId(receiverId: UserId): Promise<Exchange[]> {
    const query = 'SELECT * FROM exchanges WHERE receiver_id = $1 ORDER BY created_at DESC';
    const result = await this.db.query<any>(query, [receiverId.value]);
    return result.rows.map(row => this.mapRowToExchange(row));
  }

  async findByStatus(status: ExchangeStatusValue): Promise<Exchange[]> {
    const query = 'SELECT * FROM exchanges WHERE status = $1 ORDER BY created_at DESC';
    const result = await this.db.query<any>(query, [status]);
    return result.rows.map(row => this.mapRowToExchange(row));
  }

  async findUserExchangeHistory(userId: UserId, limit: number = 50, offset: number = 0): Promise<ExchangeSearchResult> {
    const countQuery = `
      SELECT COUNT(*) as count FROM exchanges 
      WHERE giver_id = $1 OR receiver_id = $1
    `;
    const countResult = await this.db.query<{ count: string }>(countQuery, [userId.value]);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    const dataQuery = `
      SELECT * FROM exchanges 
      WHERE giver_id = $1 OR receiver_id = $1 
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query<any>(dataQuery, [userId.value, limit, offset]);
    const exchanges = result.rows.map(row => this.mapRowToExchange(row));

    return {
      exchanges,
      totalCount,
      hasMore: offset + exchanges.length < totalCount
    };
  }

  async findUserAsGiver(userId: UserId): Promise<Exchange[]> {
    return this.findByGiverId(userId);
  }

  async findUserAsReceiver(userId: UserId): Promise<Exchange[]> {
    return this.findByReceiverId(userId);
  }

  async findUserCompletedExchanges(userId: UserId): Promise<Exchange[]> {
    const query = `
      SELECT * FROM exchanges 
      WHERE (giver_id = $1 OR receiver_id = $1) AND status = 'completed'
      ORDER BY completed_at DESC
    `;
    const result = await this.db.query<any>(query, [userId.value]);
    return result.rows.map(row => this.mapRowToExchange(row));
  }

  async findUserPendingExchanges(userId: UserId): Promise<Exchange[]> {
    const query = `
      SELECT * FROM exchanges 
      WHERE (giver_id = $1 OR receiver_id = $1) AND status IN ('requested', 'accepted')
      ORDER BY created_at DESC
    `;
    const result = await this.db.query<any>(query, [userId.value]);
    return result.rows.map(row => this.mapRowToExchange(row));
  }

  async search(criteria: ExchangeSearchCriteria, limit: number = 50, offset: number = 0): Promise<ExchangeSearchResult> {
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (criteria.userId) {
      whereConditions.push(`(giver_id = $${paramIndex} OR receiver_id = $${paramIndex})`);
      params.push(criteria.userId.value);
      paramIndex++;
    }

    if (criteria.itemId) {
      whereConditions.push(`item_id = $${paramIndex}`);
      params.push(criteria.itemId.value);
      paramIndex++;
    }

    if (criteria.giverId) {
      whereConditions.push(`giver_id = $${paramIndex}`);
      params.push(criteria.giverId.value);
      paramIndex++;
    }

    if (criteria.receiverId) {
      whereConditions.push(`receiver_id = $${paramIndex}`);
      params.push(criteria.receiverId.value);
      paramIndex++;
    }

    if (criteria.status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(criteria.status);
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

    if (criteria.completedAfter) {
      whereConditions.push(`completed_at >= $${paramIndex}`);
      params.push(criteria.completedAfter);
      paramIndex++;
    }

    if (criteria.completedBefore) {
      whereConditions.push(`completed_at <= $${paramIndex}`);
      params.push(criteria.completedBefore);
      paramIndex++;
    }

    if (criteria.hasRating !== undefined) {
      if (criteria.hasRating) {
        whereConditions.push(`(giver_rating_score IS NOT NULL AND receiver_rating_score IS NOT NULL)`);
      } else {
        whereConditions.push(`(giver_rating_score IS NULL OR receiver_rating_score IS NULL)`);
      }
    }

    if (criteria.minRating !== undefined) {
      whereConditions.push(`((giver_rating_score + receiver_rating_score) / 2.0 >= $${paramIndex})`);
      params.push(criteria.minRating);
      paramIndex++;
    }

    if (criteria.maxRating !== undefined) {
      whereConditions.push(`((giver_rating_score + receiver_rating_score) / 2.0 <= $${paramIndex})`);
      params.push(criteria.maxRating);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Count query
    const countQuery = `SELECT COUNT(*) as count FROM exchanges ${whereClause}`;
    const countResult = await this.db.query<{ count: string }>(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Data query
    const dataQuery = `
      SELECT * FROM exchanges 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);
    
    const result = await this.db.query<any>(dataQuery, params);
    const exchanges = result.rows.map(row => this.mapRowToExchange(row));

    return {
      exchanges,
      totalCount,
      hasMore: offset + exchanges.length < totalCount
    };
  }

  async findActiveExchanges(): Promise<Exchange[]> {
    const query = `
      SELECT * FROM exchanges 
      WHERE status IN ('requested', 'accepted') 
      ORDER BY created_at DESC
    `;
    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToExchange(row));
  }

  async findCompletedExchanges(): Promise<Exchange[]> {
    return this.findByStatus('completed');
  }

  async findOverdueExchanges(): Promise<Exchange[]> {
    const query = `
      SELECT * FROM exchanges 
      WHERE status IN ('requested', 'accepted') 
        AND scheduled_pickup IS NOT NULL 
        AND scheduled_pickup < NOW()
      ORDER BY scheduled_pickup ASC
    `;
    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToExchange(row));
  }

  async findUnratedExchanges(): Promise<Exchange[]> {
    const query = `
      SELECT * FROM exchanges 
      WHERE status = 'completed' 
        AND (giver_rating_score IS NULL OR receiver_rating_score IS NULL)
      ORDER BY completed_at DESC
    `;
    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToExchange(row));
  }

  async saveMany(exchanges: Exchange[]): Promise<void> {
    if (exchanges.length === 0) return;

    await this.db.transaction(async (trx) => {
      for (const exchange of exchanges) {
        const exchangeData = exchange.toData();
        const query = `
          INSERT INTO exchanges (
            id, item_id, giver_id, receiver_id, status, scheduled_pickup,
            completed_at, giver_rating_score, giver_rating_review, giver_rating_rated_by, giver_rating_rated_at,
            receiver_rating_score, receiver_rating_review, receiver_rating_rated_by, receiver_rating_rated_at,
            eco_points_awarded, cancellation_reason, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
          )
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            scheduled_pickup = EXCLUDED.scheduled_pickup,
            completed_at = EXCLUDED.completed_at,
            giver_rating_score = EXCLUDED.giver_rating_score,
            giver_rating_review = EXCLUDED.giver_rating_review,
            giver_rating_rated_by = EXCLUDED.giver_rating_rated_by,
            giver_rating_rated_at = EXCLUDED.giver_rating_rated_at,
            receiver_rating_score = EXCLUDED.receiver_rating_score,
            receiver_rating_review = EXCLUDED.receiver_rating_review,
            receiver_rating_rated_by = EXCLUDED.receiver_rating_rated_by,
            receiver_rating_rated_at = EXCLUDED.receiver_rating_rated_at,
            eco_points_awarded = EXCLUDED.eco_points_awarded,
            cancellation_reason = EXCLUDED.cancellation_reason,
            updated_at = EXCLUDED.updated_at
        `;

        const params = [
          exchangeData.id,
          exchangeData.itemId,
          exchangeData.giverId,
          exchangeData.receiverId,
          exchangeData.status,
          exchangeData.scheduledPickup || null,
          exchangeData.completedAt || null,
          exchangeData.giverRating?.score || null,
          exchangeData.giverRating?.review || null,
          exchangeData.giverRating?.ratedBy || null,
          exchangeData.giverRating?.ratedAt || null,
          exchangeData.receiverRating?.score || null,
          exchangeData.receiverRating?.review || null,
          exchangeData.receiverRating?.ratedBy || null,
          exchangeData.receiverRating?.ratedAt || null,
          exchangeData.ecoPointsAwarded,
          exchangeData.cancellationReason || null,
          exchangeData.createdAt,
          exchangeData.updatedAt
        ];

        await trx.query(query, params);
      }
    });
  }

  async findByIds(ids: ExchangeId[]): Promise<Exchange[]> {
    if (ids.length === 0) return [];

    const idValues = ids.map(id => id.value);
    const query = 'SELECT * FROM exchanges WHERE id = ANY($1)';
    const result = await this.db.query<any>(query, [idValues]);
    return result.rows.map(row => this.mapRowToExchange(row));
  }

  async updateStatusBatch(exchangeIds: ExchangeId[], status: ExchangeStatusValue): Promise<void> {
    if (exchangeIds.length === 0) return;

    const idValues = exchangeIds.map(id => id.value);
    const query = `
      UPDATE exchanges 
      SET status = $1, updated_at = NOW() 
      WHERE id = ANY($2)
    `;
    await this.db.query(query, [status, idValues]);
  }

  async countExchanges(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM exchanges';
    const result = await this.db.query<{ count: string }>(query);
    return parseInt(result.rows[0].count, 10);
  }

  async countExchangesByStatus(status: ExchangeStatusValue): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM exchanges WHERE status = $1';
    const result = await this.db.query<{ count: string }>(query, [status]);
    return parseInt(result.rows[0].count, 10);
  }

  async countExchangesByUser(userId: UserId): Promise<number> {
    const query = `
      SELECT COUNT(*) as count FROM exchanges 
      WHERE giver_id = $1 OR receiver_id = $1
    `;
    const result = await this.db.query<{ count: string }>(query, [userId.value]);
    return parseInt(result.rows[0].count, 10);
  }

  async getExchangeStatistics(): Promise<ExchangeStatistics> {
    const query = `
      SELECT 
        COUNT(*) as total_exchanges,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_exchanges,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_exchanges,
        AVG(CASE WHEN completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400 END) as avg_completion_time,
        AVG(CASE WHEN giver_rating_score IS NOT NULL AND receiver_rating_score IS NOT NULL 
                 THEN (giver_rating_score + receiver_rating_score) / 2.0 END) as avg_rating,
        SUM(eco_points_awarded) as total_eco_points
      FROM exchanges
    `;
    
    const result = await this.db.query<any>(query);
    const row = result.rows[0];

    return {
      totalExchanges: parseInt(row.total_exchanges, 10),
      completedExchanges: parseInt(row.completed_exchanges, 10),
      cancelledExchanges: parseInt(row.cancelled_exchanges, 10),
      averageCompletionTime: parseFloat(row.avg_completion_time) || 0,
      averageRating: parseFloat(row.avg_rating) || 0,
      totalEcoPointsAwarded: parseInt(row.total_eco_points, 10) || 0
    };
  }

  async getUserExchangeStatistics(userId: UserId): Promise<ExchangeStatistics> {
    const query = `
      SELECT 
        COUNT(*) as total_exchanges,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_exchanges,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_exchanges,
        AVG(CASE WHEN completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400 END) as avg_completion_time,
        AVG(CASE WHEN giver_rating_score IS NOT NULL AND receiver_rating_score IS NOT NULL 
                 THEN (giver_rating_score + receiver_rating_score) / 2.0 END) as avg_rating,
        SUM(eco_points_awarded) as total_eco_points
      FROM exchanges
      WHERE giver_id = $1 OR receiver_id = $1
    `;
    
    const result = await this.db.query<any>(query, [userId.value]);
    const row = result.rows[0];

    return {
      totalExchanges: parseInt(row.total_exchanges, 10),
      completedExchanges: parseInt(row.completed_exchanges, 10),
      cancelledExchanges: parseInt(row.cancelled_exchanges, 10),
      averageCompletionTime: parseFloat(row.avg_completion_time) || 0,
      averageRating: parseFloat(row.avg_rating) || 0,
      totalEcoPointsAwarded: parseInt(row.total_eco_points, 10) || 0
    };
  }

  async findExchangesWithRatings(): Promise<Exchange[]> {
    const query = `
      SELECT * FROM exchanges 
      WHERE giver_rating_score IS NOT NULL AND receiver_rating_score IS NOT NULL
      ORDER BY created_at DESC
    `;
    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToExchange(row));
  }

  async findExchangesByRatingRange(minRating: number, maxRating: number): Promise<Exchange[]> {
    const query = `
      SELECT * FROM exchanges 
      WHERE giver_rating_score IS NOT NULL AND receiver_rating_score IS NOT NULL
        AND (giver_rating_score + receiver_rating_score) / 2.0 BETWEEN $1 AND $2
      ORDER BY (giver_rating_score + receiver_rating_score) / 2.0 DESC
    `;
    const result = await this.db.query<any>(query, [minRating, maxRating]);
    return result.rows.map(row => this.mapRowToExchange(row));
  }

  async getAverageRatingForUser(userId: UserId): Promise<number> {
    const query = `
      SELECT AVG(
        CASE 
          WHEN giver_id = $1 THEN receiver_rating_score
          WHEN receiver_id = $1 THEN giver_rating_score
        END
      ) as avg_rating
      FROM exchanges 
      WHERE (giver_id = $1 OR receiver_id = $1) 
        AND status = 'completed'
        AND (giver_rating_score IS NOT NULL OR receiver_rating_score IS NOT NULL)
    `;
    const result = await this.db.query<{ avg_rating: string }>(query, [userId.value]);
    return parseFloat(result.rows[0].avg_rating) || 0;
  }

  async findRecentExchanges(daysBack: number): Promise<Exchange[]> {
    const query = `
      SELECT * FROM exchanges 
      WHERE created_at >= NOW() - INTERVAL '$1 days'
      ORDER BY created_at DESC
    `;
    const result = await this.db.query<any>(query, [daysBack]);
    return result.rows.map(row => this.mapRowToExchange(row));
  }

  async findExchangesInDateRange(startDate: Date, endDate: Date): Promise<Exchange[]> {
    const query = `
      SELECT * FROM exchanges 
      WHERE created_at >= $1 AND created_at <= $2
      ORDER BY created_at DESC
    `;
    const result = await this.db.query<any>(query, [startDate, endDate]);
    return result.rows.map(row => this.mapRowToExchange(row));
  }

  async findExchangesByCompletionDate(startDate: Date, endDate: Date): Promise<Exchange[]> {
    const query = `
      SELECT * FROM exchanges 
      WHERE completed_at >= $1 AND completed_at <= $2
      ORDER BY completed_at DESC
    `;
    const result = await this.db.query<any>(query, [startDate, endDate]);
    return result.rows.map(row => this.mapRowToExchange(row));
  }

  async findExchangeForItem(itemId: ItemId, status?: ExchangeStatusValue): Promise<Exchange | null> {
    let query = 'SELECT * FROM exchanges WHERE item_id = $1';
    const params: any[] = [itemId.value];
    
    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 1';
    
    const result = await this.db.query<any>(query, params);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToExchange(result.rows[0]);
  }

  async hasUserExchangedWith(userId1: UserId, userId2: UserId): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count FROM exchanges 
      WHERE status = 'completed'
        AND ((giver_id = $1 AND receiver_id = $2) OR (giver_id = $2 AND receiver_id = $1))
    `;
    const result = await this.db.query<{ count: string }>(query, [userId1.value, userId2.value]);
    return parseInt(result.rows[0].count, 10) > 0;
  }

  async countSuccessfulExchangesBetweenUsers(userId1: UserId, userId2: UserId): Promise<number> {
    const query = `
      SELECT COUNT(*) as count FROM exchanges 
      WHERE status = 'completed'
        AND ((giver_id = $1 AND receiver_id = $2) OR (giver_id = $2 AND receiver_id = $1))
    `;
    const result = await this.db.query<{ count: string }>(query, [userId1.value, userId2.value]);
    return parseInt(result.rows[0].count, 10);
  }

  private mapRowToExchange(row: ExchangeRow): Exchange {
    const exchangeData: ExchangeData = {
      id: row.id,
      itemId: row.item_id,
      giverId: row.giver_id,
      receiverId: row.receiver_id,
      status: row.status,
      scheduledPickup: row.scheduled_pickup,
      completedAt: row.completed_at,
      giverConfirmedAt: row.giver_confirmed_at,
      receiverConfirmedAt: row.receiver_confirmed_at,
      giverRating: (row.giver_rating_score && row.giver_rating_rated_by && row.giver_rating_rated_at) ? {
        score: row.giver_rating_score,
        review: row.giver_rating_review,
        ratedBy: row.giver_rating_rated_by,
        ratedAt: row.giver_rating_rated_at
      } : undefined,
      receiverRating: (row.receiver_rating_score && row.receiver_rating_rated_by && row.receiver_rating_rated_at) ? {
        score: row.receiver_rating_score,
        review: row.receiver_rating_review,
        ratedBy: row.receiver_rating_rated_by,
        ratedAt: row.receiver_rating_rated_at
      } : undefined,
      ecoPointsAwarded: row.eco_points_awarded,
      cancellationReason: row.cancellation_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    return Exchange.fromData(exchangeData);
  }
}
