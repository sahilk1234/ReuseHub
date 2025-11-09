import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IUserRepository } from '../IUserRepository';
import { User, UserData } from '../../../domain/user/User';
import { UserId } from '../../../domain/user/value-objects/UserId';
import { Email } from '../../../domain/user/value-objects/Email';
import { Location } from '../../../domain/user/value-objects/Location';
import { DatabaseConnection } from '../../database/DatabaseConnection';

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  phone?: string;
  avatar?: string;
  is_verified: boolean;
  account_type: 'individual' | 'organization';
  latitude: number;
  longitude: number;
  address: string;
  eco_points: number;
  eco_points_transactions: string | any[];
  rating: number;
  total_exchanges: number;
  created_at: Date;
  updated_at: Date;
}

@injectable()
export class PostgreSQLUserRepository implements IUserRepository {
  constructor(
    @inject(TYPES.DatabaseConnection)
    private db: DatabaseConnection
  ) {}

  async save(user: User, passwordHash?: string): Promise<void> {
    const userData = user.toData();
    
    const query = `
      INSERT INTO users (
        id, email, display_name, phone, avatar, is_verified, account_type,
        latitude, longitude, address, eco_points, eco_points_transactions,
        rating, total_exchanges, password_hash, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        phone = EXCLUDED.phone,
        avatar = EXCLUDED.avatar,
        is_verified = EXCLUDED.is_verified,
        account_type = EXCLUDED.account_type,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        address = EXCLUDED.address,
        eco_points = EXCLUDED.eco_points,
        eco_points_transactions = EXCLUDED.eco_points_transactions,
        rating = EXCLUDED.rating,
        total_exchanges = EXCLUDED.total_exchanges,
        password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
        updated_at = EXCLUDED.updated_at
    `;

    const params = [
      userData.id,
      userData.email,
      userData.profile.displayName,
      userData.profile.phone || null,
      userData.profile.avatar || null,
      userData.profile.isVerified,
      userData.profile.accountType,
      userData.location.latitude,
      userData.location.longitude,
      userData.location.address,
      userData.ecoPoints,
      JSON.stringify(userData.ecoPointsTransactions || []),
      userData.rating,
      userData.totalExchanges,
      passwordHash || null,
      userData.createdAt,
      userData.updatedAt
    ];

    await this.db.query(query, params);
  }

  async findById(id: UserId): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.db.query<UserRow>(query, [id.value]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async findByEmail(email: Email): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.db.query<UserRow>(query, [email.value]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async findAll(): Promise<User[]> {
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    const result = await this.db.query<UserRow>(query);
    return result.rows.map(row => this.mapRowToUser(row));
  }

  async delete(id: UserId): Promise<void> {
    const query = 'DELETE FROM users WHERE id = $1';
    await this.db.query(query, [id.value]);
  }

  async findByLocation(location: Location, radiusKm: number): Promise<User[]> {
    // Using PostGIS for geographic queries
    const query = `
      SELECT * FROM users 
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
    const result = await this.db.query<UserRow>(query, [
      locationData.longitude,
      locationData.latitude,
      radiusKm
    ]);

    return result.rows.map(row => this.mapRowToUser(row));
  }

  async findVerifiedUsers(): Promise<User[]> {
    const query = 'SELECT * FROM users WHERE is_verified = true ORDER BY created_at DESC';
    const result = await this.db.query<UserRow>(query);
    return result.rows.map(row => this.mapRowToUser(row));
  }

  async findTopRatedUsers(limit: number): Promise<User[]> {
    const query = `
      SELECT * FROM users 
      WHERE rating > 0 AND total_exchanges > 0
      ORDER BY rating DESC, total_exchanges DESC 
      LIMIT $1
    `;
    const result = await this.db.query<UserRow>(query, [limit]);
    return result.rows.map(row => this.mapRowToUser(row));
  }

  async findByEcoPointsRange(minPoints: number, maxPoints: number): Promise<User[]> {
    const query = `
      SELECT * FROM users 
      WHERE eco_points >= $1 AND eco_points <= $2
      ORDER BY eco_points DESC
    `;
    const result = await this.db.query<UserRow>(query, [minPoints, maxPoints]);
    return result.rows.map(row => this.mapRowToUser(row));
  }

  async findRecentlyActive(daysBack: number): Promise<User[]> {
    const query = `
      SELECT * FROM users 
      WHERE updated_at >= NOW() - INTERVAL '$1 days'
      ORDER BY updated_at DESC
    `;
    const result = await this.db.query<UserRow>(query, [daysBack]);
    return result.rows.map(row => this.mapRowToUser(row));
  }

  async saveMany(users: User[]): Promise<void> {
    if (users.length === 0) return;

    await this.db.transaction(async (trx) => {
      for (const user of users) {
        const userData = user.toData();
        const query = `
          INSERT INTO users (
            id, email, display_name, phone, avatar, is_verified, account_type,
            latitude, longitude, address, eco_points, eco_points_transactions,
            rating, total_exchanges, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
          )
          ON CONFLICT (id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            phone = EXCLUDED.phone,
            avatar = EXCLUDED.avatar,
            is_verified = EXCLUDED.is_verified,
            account_type = EXCLUDED.account_type,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            address = EXCLUDED.address,
            eco_points = EXCLUDED.eco_points,
            eco_points_transactions = EXCLUDED.eco_points_transactions,
            rating = EXCLUDED.rating,
            total_exchanges = EXCLUDED.total_exchanges,
            updated_at = EXCLUDED.updated_at
        `;

        const params = [
          userData.id,
          userData.email,
          userData.profile.displayName,
          userData.profile.phone || null,
          userData.profile.avatar || null,
          userData.profile.isVerified,
          userData.profile.accountType,
          userData.location.latitude,
          userData.location.longitude,
          userData.location.address,
          userData.ecoPoints,
          JSON.stringify(userData.ecoPointsTransactions || []),
          userData.rating,
          userData.totalExchanges,
          userData.createdAt,
          userData.updatedAt
        ];

        await trx.query(query, params);
      }
    });
  }

  async findByIds(ids: UserId[]): Promise<User[]> {
    if (ids.length === 0) return [];

    const idValues = ids.map(id => id.value);
    const query = 'SELECT * FROM users WHERE id = ANY($1)';
    const result = await this.db.query<UserRow>(query, [idValues]);
    return result.rows.map(row => this.mapRowToUser(row));
  }

  async countUsers(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM users';
    const result = await this.db.query<{ count: string }>(query);
    return parseInt(result.rows[0].count, 10);
  }

  async countVerifiedUsers(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM users WHERE is_verified = true';
    const result = await this.db.query<{ count: string }>(query);
    return parseInt(result.rows[0].count, 10);
  }

  async getAverageRating(): Promise<number> {
    const query = 'SELECT AVG(rating) as avg_rating FROM users WHERE rating > 0';
    const result = await this.db.query<{ avg_rating: string }>(query);
    return parseFloat(result.rows[0].avg_rating) || 0;
  }

  async getTotalEcoPoints(): Promise<number> {
    const query = 'SELECT SUM(eco_points) as total_points FROM users';
    const result = await this.db.query<{ total_points: string }>(query);
    return parseInt(result.rows[0].total_points, 10) || 0;
  }

  async searchByDisplayName(searchTerm: string, limit: number = 50): Promise<User[]> {
    const query = `
      SELECT * FROM users 
      WHERE display_name ILIKE $1
      ORDER BY display_name
      LIMIT $2
    `;
    const result = await this.db.query<UserRow>(query, [`%${searchTerm}%`, limit]);
    return result.rows.map(row => this.mapRowToUser(row));
  }

  async findUsersWithMinimumRating(minRating: number): Promise<User[]> {
    const query = `
      SELECT * FROM users 
      WHERE rating >= $1 AND total_exchanges > 0
      ORDER BY rating DESC, total_exchanges DESC
    `;
    const result = await this.db.query<UserRow>(query, [minRating]);
    return result.rows.map(row => this.mapRowToUser(row));
  }

  private mapRowToUser(row: UserRow): User {
    const userData: UserData = {
      id: row.id,
      email: row.email,
      profile: {
        displayName: row.display_name,
        phone: row.phone,
        avatar: row.avatar,
        isVerified: row.is_verified,
        accountType: row.account_type
      },
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
        address: row.address
      },
      ecoPoints: row.eco_points,
      ecoPointsTransactions: typeof row.eco_points_transactions === 'string' 
        ? JSON.parse(row.eco_points_transactions) 
        : row.eco_points_transactions,
      rating: row.rating,
      totalExchanges: row.total_exchanges,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    return User.fromData(userData);
  }
}