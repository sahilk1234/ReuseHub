import { Router } from 'express';
import { DIContainer } from '@/container/Container';
import { TYPES } from '@/container/types';
import { MatchingController } from '../controllers/matching.controller';
import { authenticate, requireVerified, optionalAuthenticate, asyncHandler } from '../middleware';
import { validateQuery, validateParams } from '../middleware/validation.middleware';
import { standardRateLimiter, searchRateLimiter } from '../middleware/rateLimit.middleware';
import { GetRecommendationsDto, FindSimilarItemsDto, ItemIdParamDto } from '../dtos/matching.dto';

const router = Router();

// Get controller from DI container
const getController = (): MatchingController => {
  return DIContainer.getInstance().get<MatchingController>(TYPES.MatchingController);
};

/**
 * GET /api/matching/suggestions - Get personalized item recommendations
 * Requires authentication
 * Requirements: 3.2, 3.3, 3.5
 */
router.get(
  '/suggestions',
  authenticate,
  requireVerified,
  searchRateLimiter,
  validateQuery(GetRecommendationsDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.getRecommendations(req, res);
  })
);

/**
 * GET /api/matching/similar/:itemId - Find similar items
 * Public endpoint (works better with authentication)
 * Requirements: 3.2, 3.3, 3.5
 */
router.get(
  '/similar/:itemId',
  optionalAuthenticate,
  searchRateLimiter,
  validateParams(ItemIdParamDto),
  validateQuery(FindSimilarItemsDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.findSimilarItems(req, res);
  })
);

/**
 * GET /api/matching/matches/:itemId - Find potential user matches for an item
 * Requires authentication
 * Requirements: 3.2, 3.4
 */
router.get(
  '/matches/:itemId',
  authenticate,
  requireVerified,
  standardRateLimiter,
  validateParams(ItemIdParamDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.findMatchesForItem(req, res);
  })
);

/**
 * POST /api/matching/notify/:itemId - Notify potential matches about an item
 * Requires authentication and verification
 * Requirements: 3.3
 */
router.post(
  '/notify/:itemId',
  authenticate,
  requireVerified,
  standardRateLimiter,
  validateParams(ItemIdParamDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.notifyPotentialMatches(req, res);
  })
);

/**
 * POST /api/matching/categorize/:itemId - Categorize an item using AI
 * Requires authentication and verification
 * Requirements: 3.1
 */
router.post(
  '/categorize/:itemId',
  authenticate,
  requireVerified,
  standardRateLimiter,
  validateParams(ItemIdParamDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.categorizeItem(req, res);
  })
);

export default router;
