import { Achievement, AchievementData } from '../../domain/points/Achievement';

export interface IAchievementRepository {
  save(achievement: Achievement): Promise<void>;
  findById(id: string): Promise<Achievement | null>;
  findByUserId(userId: string): Promise<Achievement[]>;
  findByUserIdAndBadgeId(userId: string, badgeId: string): Promise<Achievement | null>;
  findUnlockedByUserId(userId: string): Promise<Achievement[]>;
  delete(id: string): Promise<void>;
}
