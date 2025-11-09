import { Router } from 'express';
import { DIContainer } from '@/container/Container';
import { TYPES } from '@/container/types';
import { ExchangeController } from '../controllers/exchange.controller';
import { authenticate, requireVerified, asyncHandler } from '../middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { standardRateLimiter } from '../middleware/rateLimit.middleware';
import { InitiateExchangeDto, AcceptExchangeDto, CompleteExchangeDto, CancelExchangeDto, RateExchangeDto, ExchangeIdParamDto, GetExchangeHistoryDto } from '../dtos/exchange.dto';

const router = Router();

// Get controller from DI container
const getController = (): ExchangeController => {
  return DIContainer.getInstance().get<ExchangeController>(TYPES.ExchangeController);
};

/**
 * POST /api/exchanges - Initiate a new exchange
 * Requires authentication and verification
 * Requirements: 2.4
 */
router.post(
  '/',
  authenticate,
  requireVerified,
  standardRateLimiter,
  validateBody(InitiateExchangeDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.initiateExchange(req, res);
  })
);

/**
 * GET /api/exchanges/history - Get user's exchange history
 * Requires authentication
 */
router.get(
  '/history',
  authenticate,
  standardRateLimiter,
  validateQuery(GetExchangeHistoryDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.getExchangeHistory(req, res);
  })
);

/**
 * GET /api/exchanges/active - Get user's active exchanges
 * Requires authentication
 */
router.get(
  '/active',
  authenticate,
  standardRateLimiter,
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.getActiveExchanges(req, res);
  })
);

/**
 * GET /api/exchanges/unrated - Get user's unrated exchanges
 * Requires authentication
 */
router.get(
  '/unrated',
  authenticate,
  standardRateLimiter,
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.getUnratedExchanges(req, res);
  })
);

/**
 * GET /api/exchanges/:id - Get exchange details
 * Requires authentication
 */
router.get(
  '/:id',
  authenticate,
  standardRateLimiter,
  validateParams(ExchangeIdParamDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.getExchangeDetails(req, res);
  })
);

/**
 * PUT /api/exchanges/:id/accept - Accept an exchange request
 * Requires authentication and verification
 * Requirements: 2.5
 */
router.put(
  '/:id/accept',
  authenticate,
  requireVerified,
  standardRateLimiter,
  validateParams(ExchangeIdParamDto),
  validateBody(AcceptExchangeDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.acceptExchange(req, res);
  })
);

/**
 * POST /api/exchanges/:id/complete - Complete an exchange
 * Requires authentication and verification
 * Requirements: 2.5, 4.2
 */
router.post(
  '/:id/complete',
  authenticate,
  requireVerified,
  standardRateLimiter,
  validateParams(ExchangeIdParamDto),
  validateBody(CompleteExchangeDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.completeExchange(req, res);
  })
);

/**
 * POST /api/exchanges/:id/cancel - Cancel an exchange
 * Requires authentication
 * Requirements: 2.5
 */
router.post(
  '/:id/cancel',
  authenticate,
  standardRateLimiter,
  validateParams(ExchangeIdParamDto),
  validateBody(CancelExchangeDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.cancelExchange(req, res);
  })
);

/**
 * POST /api/exchanges/:id/rate - Rate an exchange
 * Requires authentication and verification
 * Requirements: 5.4
 */
router.post(
  '/:id/rate',
  authenticate,
  requireVerified,
  standardRateLimiter,
  validateParams(ExchangeIdParamDto),
  validateBody(RateExchangeDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.rateExchange(req, res);
  })
);

export default router;
