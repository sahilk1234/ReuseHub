import { Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'inversify';
import { TYPES } from '@/container/types';
import { IPointsApplicationService } from '@/application/services/PointsApplicationService';
import {
  LeaderboardQueryDto,
  LeaderboardEntryDto,
  BadgeDto,
  UserAchievementSummaryDto
} from '../dtos/points.dto';

@injectable()
export class PointsController {
  constructor(
    @inject(TYPES.IPointsApplicationService)
    private readonly pointsService: IPointsApplicationService
  ) {}

  async getUserAchievements(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.params.userId || (req as any).user?.userId;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const achievements = await this.pointsService.getUserAchievements(userId);

      const response: UserAchievementSummaryDto = {
        userId: achievements.userId,
        ecoPoints: achievements.ecoPoints,
        level: achievements.level,
        unlockedBadges: achievements.unlockedBadges.map(badge => ({
          id: badge.id,
          name: badge.name,
          description: badge.description,
          category: badge.category,
          requirement: badge.requirement,
          ecoPointsReward: badge.ecoPointsReward,
          iconUrl: badge.iconUrl
        })),
        inProgressBadges: achievements.inProgressBadges.map(item => ({
          badge: {
            id: item.badge.id,
            name: item.badge.name,
            description: item.badge.description,
            category: item.badge.category,
            requirement: item.badge.requirement,
            ecoPointsReward: item.badge.ecoPointsReward,
            iconUrl: item.badge.iconUrl
          },
          progress: item.progress
        })),
        totalExchanges: achievements.totalExchanges,
        itemsPosted: achievements.itemsPosted,
        rating: achievements.rating
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getLeaderboard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query: LeaderboardQueryDto = {
        communityId: req.query.communityId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100
      };

      const leaderboard = await this.pointsService.getLeaderboard(query);

      const response: LeaderboardEntryDto[] = leaderboard.map(entry => ({
        userId: entry.userId,
        displayName: entry.displayName,
        avatar: entry.avatar,
        ecoPoints: entry.ecoPoints,
        level: entry.level,
        totalExchanges: entry.totalExchanges,
        rating: entry.rating,
        rank: entry.rank
      }));

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getAllBadges(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const badges = await this.pointsService.getAllBadges();

      const response: BadgeDto[] = badges.map(badge => ({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        category: badge.category,
        requirement: badge.requirement,
        ecoPointsReward: badge.ecoPointsReward,
        iconUrl: badge.iconUrl
      }));

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getBadgesByCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const category = req.params.category as any;

      if (!category) {
        res.status(400).json({ error: 'Category is required' });
        return;
      }

      const badges = await this.pointsService.getBadgesByCategory(category);

      const response: BadgeDto[] = badges.map(badge => ({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        category: badge.category,
        requirement: badge.requirement,
        ecoPointsReward: badge.ecoPointsReward,
        iconUrl: badge.iconUrl
      }));

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}
