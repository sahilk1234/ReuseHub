import { Router } from 'express';
import { DIContainer } from '@/container/Container';
import { TYPES } from '@/container/types';
import { AuthController } from '../controllers/auth.controller';
import { authenticate, asyncHandler } from '../middleware';
import { validateBody } from '../middleware/validation.middleware';
import { authRateLimiter, standardRateLimiter } from '../middleware/rateLimit.middleware';
import { LoginDto, RefreshTokenDto } from '../dtos/auth.dto';

const router = Router();

// Get controller from DI container
const getController = (): AuthController => {
  return DIContainer.getInstance().get<AuthController>(TYPES.AuthController);
};

/**
 * POST /api/auth/login - Login user
 * Public endpoint
 * Requirements: 5.1, 5.2
 */
router.post(
  '/login',
  authRateLimiter,
  validateBody(LoginDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.login(req, res);
  })
);

/**
 * POST /api/auth/auth0-login - Login/Register user via Auth0
 * Public endpoint
 * Requirements: 5.1, 5.2
 */
router.post(
  '/auth0-login',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.auth0Login(req, res);
  })
);

/**
 * POST /api/auth/refresh - Refresh access token
 * Public endpoint
 * Requirements: 5.2
 */
router.post(
  '/refresh',
  authRateLimiter,
  validateBody(RefreshTokenDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.refresh(req, res);
  })
);

/**
 * POST /api/auth/logout - Logout user
 * Requires authentication
 * Requirements: 5.2
 */
router.post(
  '/logout',
  authenticate,
  standardRateLimiter,
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.logout(req, res);
  })
);

/**
 * GET /api/auth/me - Get current authenticated user
 * Requires authentication
 * Requirements: 5.2
 */
router.get(
  '/me',
  authenticate,
  standardRateLimiter,
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.getCurrentUser(req, res);
  })
);

export default router;
