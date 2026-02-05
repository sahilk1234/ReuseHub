import { Router } from 'express';
import { DIContainer } from '@/container/Container';
import { TYPES } from '@/container/types';
import { PointsController } from '../controllers/points.controller';
import { authenticate, asyncHandler } from '../middleware';
import { standardRateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

const getController = (): PointsController => {
  return DIContainer.getInstance().get<PointsController>(TYPES.PointsController);
};

/**
 * GET /api/points/achievements - Get current user's achievements
 * Requires authentication
 */
router.get(
  '/achievements',
  authenticate,
  standardRateLimiter,
  asyncHandler(async (req, res, next) => {
    const controller = getController();
    await controller.getUserAchievements(req, res, next);
  })
);

/**
 * GET /api/points/transactions - Get current user's eco-points transactions
 * Requires authentication
 */
router.get(
  '/transactions',
  authenticate,
  standardRateLimiter,
  asyncHandler(async (req, res, next) => {
    const controller = getController();
    await controller.getUserTransactions(req, res, next);
  })
);

/**
 * GET /api/points/leaderboard - Get eco-points leaderboard
 * Public endpoint
 */
router.get(
  '/leaderboard',
  standardRateLimiter,
  asyncHandler(async (req, res, next) => {
    const controller = getController();
    await controller.getLeaderboard(req, res, next);
  })
);

/**
 * GET /api/points/badges - Get all badges
 * Public endpoint
 */
router.get(
  '/badges',
  standardRateLimiter,
  asyncHandler(async (req, res, next) => {
    const controller = getController();
    await controller.getAllBadges(req, res, next);
  })
);

/**
 * GET /api/points/badges/:category - Get badges by category
 * Public endpoint
 */
router.get(
  '/badges/:category',
  standardRateLimiter,
  asyncHandler(async (req, res, next) => {
    const controller = getController();
    await controller.getBadgesByCategory(req, res, next);
  })
);

export default router;
