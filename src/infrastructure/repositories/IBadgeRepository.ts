import { Badge, BadgeData, BadgeCategory } from '../../domain/points/Badge';

export interface IBadgeRepository {
  save(badge: Badge): Promise<void>;
  findById(id: string): Promise<Badge | null>;
  findAll(): Promise<Badge[]>;
  findByCategory(category: BadgeCategory): Promise<Badge[]>;
  delete(id: string): Promise<void>;
}
