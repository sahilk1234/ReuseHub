import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IMatchingApplicationService, GetRecommendationsQuery, FindSimilarItemsQuery } from '@/application/services/MatchingApplicationService';
import { GetRecommendationsDto, FindSimilarItemsDto } from '../dtos/matching.dto';
import { AppError } from '../errors/AppError';

@injectable()
export class MatchingController {
  constructor(
    @inject(TYPES.IMatchingApplicationService)
    private readonly matchingService: IMatchingApplicationService
  ) {}

  /**
   * GET /api/matching/suggestions - Get personalized item recommendations
   * Requirements: 3.2, 3.3, 3.5
   */
  public getRecommendations = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const dto: GetRecommendationsDto = req.query as any;

      const query: GetRecommendationsQuery = {
        userId: req.userId,
        userLocation: dto.latitude && dto.longitude ? {
          latitude: dto.latitude,
          longitude: dto.longitude,
          address: '' // Address not needed for recommendations
        } : undefined,
        maxDistance: dto.maxDistance,
        limit: dto.limit || 15
      };

      const recommendations = await this.matchingService.getPersonalizedRecommendations(query);

      res.status(200).json({
        success: true,
        data: {
          recommendations,
          count: recommendations.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'RECOMMENDATIONS_FAILED',
        error.message || 'Failed to get recommendations'
      );
    }
  };

  /**
   * GET /api/matching/similar/:itemId - Find similar items
   * Requirements: 3.2, 3.3, 3.5
   */
  public findSimilarItems = async (req: Request, res: Response): Promise<void> => {
    try {
      const { itemId } = req.params;
      const dto: FindSimilarItemsDto = req.query as any;

      const query: FindSimilarItemsQuery = {
        itemId,
        limit: dto.limit || 10,
        excludeOwnItems: dto.excludeOwnItems !== undefined ? dto.excludeOwnItems : true
      };

      const similarItems = await this.matchingService.findSimilarItems(query);

      res.status(200).json({
        success: true,
        data: {
          similarItems,
          count: similarItems.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'SIMILAR_ITEMS_FAILED',
        error.message || 'Failed to find similar items'
      );
    }
  };

  /**
   * GET /api/matching/matches/:itemId - Find potential user matches for an item
   * Requirements: 3.2, 3.4
   */
  public findMatchesForItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { itemId } = req.params;
      const { maxDistance, minSimilarity, limit } = req.query;

      const matches = await this.matchingService.findMatchesForItem({
        itemId,
        maxDistance: maxDistance ? parseFloat(maxDistance as string) : undefined,
        minSimilarity: minSimilarity ? parseFloat(minSimilarity as string) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined
      });

      res.status(200).json({
        success: true,
        data: {
          matches,
          count: matches.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'MATCHES_FAILED',
        error.message || 'Failed to find matches'
      );
    }
  };

  /**
   * POST /api/matching/notify/:itemId - Notify potential matches about an item
   * Requirements: 3.3
   */
  public notifyPotentialMatches = async (req: Request, res: Response): Promise<void> => {
    try {
      const { itemId } = req.params;

      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const notificationsSent = await this.matchingService.notifyPotentialMatches(itemId);

      res.status(200).json({
        success: true,
        data: {
          notificationsSent,
          message: `Notified ${notificationsSent} potential matches`
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'NOTIFY_FAILED',
        error.message || 'Failed to notify potential matches'
      );
    }
  };

  /**
   * POST /api/matching/categorize/:itemId - Categorize an item using AI
   * Requirements: 3.1
   */
  public categorizeItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { itemId } = req.params;
      const { forceRecategorization } = req.body;

      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const result = await this.matchingService.categorizeItem({
        itemId,
        forceRecategorization: forceRecategorization || false
      });

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'CATEGORIZATION_FAILED',
        error.message || 'Failed to categorize item'
      );
    }
  };
}
