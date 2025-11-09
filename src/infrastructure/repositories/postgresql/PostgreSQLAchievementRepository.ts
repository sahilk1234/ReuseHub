import { Pool } from 'pg';
import { Achievement, AchievementData } from '../../../domain/points/Achievement';
import { IAchievementRepository } from '../IAchievementRepository';

export class PostgreSQLAchievementRepository implements IAchievementRepository {
  constructor(private readonly pool: Pool) {}

  async save(achievement: Achievement): Promise<void> {
    const data = achievement.toData();
    
    const query = `
      INSERT INTO achievements (
        id, user_id, badge_id, unlocked_at, progress
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) 
      DO UPDATE SET
        progress = EXCLUDED.progress,
        updated_at = CURRENT_TIMESTAMP
    `;

    await this.pool.query(query, [
      data.id,
      data.userId,
      data.badgeId,
      data.unlockedAt,
      data.progress
    ]);
  }

  async findById(id: string): Promise<Achievement | null> {
    const query = 'SELECT * FROM achievements WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAchievement(result.rows[0]);
  }

  async findByUserId(userId: string): Promise<Achievement[]> {
    const query = 'SELECT * FROM achievements WHERE user_id = $1 ORDER BY unlocked_at DESC';
    const result = await this.pool.query(query, [userId]);

    return result.rows.map(row => this.mapRowToAchievement(row));
  }

  async findByUserIdAndBadgeId(userId: string, badgeId: string): Promise<Achievement | null> {
    const query = 'SELECT * FROM achievements WHERE user_id = $1 AND badge_id = $2';
    const result = await this.pool.query(query, [userId, badgeId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAchievement(result.rows[0]);
  }

  async findUnlockedByUserId(userId: string): Promise<Achievement[]> {
    const query = `
      SELECT * FROM achievements 
      WHERE user_id = $1 AND progress >= 100 
      ORDER BY unlocked_at DESC
    `;
    const result = await this.pool.query(query, [userId]);

    return result.rows.map(row => this.mapRowToAchievement(row));
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM achievements WHERE id = $1';
    await this.pool.query(query, [id]);
  }

  private mapRowToAchievement(row: any): Achievement {
    const data: AchievementData = {
      id: row.id,
      userId: row.user_id,
      badgeId: row.badge_id,
      unlockedAt: row.unlocked_at,
      progress: row.progress
    };

    return Achievement.fromData(data);
  }
}
