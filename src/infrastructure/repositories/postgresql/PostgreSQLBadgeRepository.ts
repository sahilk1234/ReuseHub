import { Pool } from 'pg';
import { Badge, BadgeData, BadgeCategory } from '../../../domain/points/Badge';
import { IBadgeRepository } from '../IBadgeRepository';

export class PostgreSQLBadgeRepository implements IBadgeRepository {
  constructor(private readonly pool: Pool) {}

  async save(badge: Badge): Promise<void> {
    const data = badge.toData();
    
    const query = `
      INSERT INTO badges (
        id, name, description, category, icon_url, 
        requirement_type, requirement_threshold, requirement_description,
        eco_points_reward
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) 
      DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        icon_url = EXCLUDED.icon_url,
        requirement_type = EXCLUDED.requirement_type,
        requirement_threshold = EXCLUDED.requirement_threshold,
        requirement_description = EXCLUDED.requirement_description,
        eco_points_reward = EXCLUDED.eco_points_reward,
        updated_at = CURRENT_TIMESTAMP
    `;

    await this.pool.query(query, [
      data.id,
      data.name,
      data.description,
      data.category,
      data.iconUrl || null,
      data.requirement.type,
      data.requirement.threshold,
      data.requirement.description,
      data.ecoPointsReward
    ]);
  }

  async findById(id: string): Promise<Badge | null> {
    const query = 'SELECT * FROM badges WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToBadge(result.rows[0]);
  }

  async findAll(): Promise<Badge[]> {
    const query = 'SELECT * FROM badges ORDER BY requirement_threshold ASC';
    const result = await this.pool.query(query);

    return result.rows.map(row => this.mapRowToBadge(row));
  }

  async findByCategory(category: BadgeCategory): Promise<Badge[]> {
    const query = 'SELECT * FROM badges WHERE category = $1 ORDER BY requirement_threshold ASC';
    const result = await this.pool.query(query, [category]);

    return result.rows.map(row => this.mapRowToBadge(row));
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM badges WHERE id = $1';
    await this.pool.query(query, [id]);
  }

  private mapRowToBadge(row: any): Badge {
    const data: BadgeData = {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      iconUrl: row.icon_url,
      requirement: {
        type: row.requirement_type,
        threshold: row.requirement_threshold,
        description: row.requirement_description
      },
      ecoPointsReward: row.eco_points_reward
    };

    return Badge.fromData(data);
  }
}
