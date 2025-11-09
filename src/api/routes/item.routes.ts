import { Router } from 'express';
import { DIContainer } from '@/container/Container';
import { TYPES } from '@/container/types';
import { ItemController } from '../controllers/item.controller';
import { authenticate, requireVerified, asyncHandler } from '../middleware';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware';
import { uploadRateLimiter, searchRateLimiter, standardRateLimiter } from '../middleware/rateLimit.middleware';
import { CreateItemDto, UpdateItemDto, UpdateItemStatusDto, SearchItemsDto, ItemIdParamDto } from '../dtos/item.dto';

const router = Router();

// Get controller from DI container
const getController = (): ItemController => {
  return DIContainer.getInstance().get<ItemController>(TYPES.ItemController);
};

/**
 * POST /api/items - Create a new item
 * Requires authentication and verification
 * Requirements: 1.1, 1.2
 */
router.post(
  '/',
  authenticate,
  requireVerified,
  uploadRateLimiter,
  (req, res, next) => {
    const controller = getController();
    controller.uploadMiddleware(req, res, (err) => {
      if (err) {
        return next(err);
      }
      next();
    });
  },
  validateBody(CreateItemDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.createItem(req, res);
  })
);

/**
 * GET /api/items - Search items with filtering and pagination
 * Public endpoint (no authentication required)
 * Requirements: 2.1, 2.2, 2.3
 */
router.get(
  '/',
  searchRateLimiter,
  validateQuery(SearchItemsDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.searchItems(req, res);
  })
);

/**
 * GET /api/items/tags - Get popular tags
 * Public endpoint
 */
router.get(
  '/tags',
  standardRateLimiter,
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.getPopularTags(req, res);
  })
);

/**
 * GET /api/items/user/:userId - Get user's items
 * Public endpoint
 */
router.get(
  '/user/:userId',
  standardRateLimiter,
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.getUserItems(req, res);
  })
);

/**
 * GET /api/items/:id - Get item details
 * Public endpoint
 * Requirements: 2.3
 */
router.get(
  '/:id',
  standardRateLimiter,
  validateParams(ItemIdParamDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.getItemDetails(req, res);
  })
);

/**
 * PUT /api/items/:id - Update item details
 * Requires authentication and verification
 * Requirements: 1.2, 1.4
 */
router.put(
  '/:id',
  authenticate,
  requireVerified,
  standardRateLimiter,
  validateParams(ItemIdParamDto),
  validateBody(UpdateItemDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.updateItem(req, res);
  })
);

/**
 * PUT /api/items/:id/status - Update item status
 * Requires authentication and verification
 * Requirements: 1.4
 */
router.put(
  '/:id/status',
  authenticate,
  requireVerified,
  standardRateLimiter,
  validateParams(ItemIdParamDto),
  validateBody(UpdateItemStatusDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.updateItemStatus(req, res);
  })
);

/**
 * DELETE /api/items/:id - Delete an item
 * Requires authentication and verification
 * Requirements: 1.4
 */
router.delete(
  '/:id',
  authenticate,
  requireVerified,
  standardRateLimiter,
  validateParams(ItemIdParamDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.deleteItem(req, res);
  })
);

export default router;
