import { Router } from 'express';
import { DIContainer } from '@/container/Container';
import { TYPES } from '@/container/types';
import { UserController } from '../controllers/user.controller';
import { authenticate, requireVerified, asyncHandler } from '../middleware';
import { validateBody, validateParams } from '../middleware/validation.middleware';
import { authRateLimiter, standardRateLimiter } from '../middleware/rateLimit.middleware';
import { RegisterUserDto, UpdateProfileDto, UpdateLocationDto, VerifyUserDto, UserIdParamDto } from '../dtos/user.dto';

const router = Router();

// Get controller from DI container
const getController = (): UserController => {
  return DIContainer.getInstance().get<UserController>(TYPES.UserController);
};

/**
 * POST /api/users/register - Register a new user
 * Public endpoint
 * Requirements: 5.1
 */
router.post(
  '/register',
  authRateLimiter,
  validateBody(RegisterUserDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.registerUser(req, res);
  })
);

/**
 * POST /api/users/verify - Verify user email
 * Public endpoint
 * Requirements: 5.1
 */
router.post(
  '/verify',
  authRateLimiter,
  validateBody(VerifyUserDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.verifyUser(req, res);
  })
);

/**
 * POST /api/users/resend-verification - Resend verification email
 * Requires authentication
 * Requirements: 5.1
 */
router.post(
  '/resend-verification',
  authenticate,
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.resendVerification(req, res);
  })
);

/**
 * GET /api/users/profile - Get current user's profile
 * Requires authentication
 * Requirements: 5.2
 */
router.get(
  '/profile',
  authenticate,
  standardRateLimiter,
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.getCurrentUserProfile(req, res);
  })
);

/**
 * PUT /api/users/profile - Update current user's profile
 * Requires authentication
 * Requirements: 5.2
 */
router.put(
  '/profile',
  authenticate,
  standardRateLimiter,
  validateBody(UpdateProfileDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.updateProfile(req, res);
  })
);

/**
 * PUT /api/users/location - Update current user's location
 * Requires authentication
 * Requirements: 5.2
 */
router.put(
  '/location',
  authenticate,
  standardRateLimiter,
  validateBody(UpdateLocationDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.updateLocation(req, res);
  })
);

/**
 * GET /api/users/search - Search users by display name
 * Public endpoint
 */
router.get(
  '/search',
  standardRateLimiter,
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.searchUsers(req, res);
  })
);

/**
 * GET /api/users/:userId - Get user profile by ID
 * Public endpoint
 * Requirements: 5.4
 */
router.get(
  '/:userId',
  standardRateLimiter,
  validateParams(UserIdParamDto),
  asyncHandler(async (req, res) => {
    const controller = getController();
    await controller.getUserProfile(req, res);
  })
);

export default router;
