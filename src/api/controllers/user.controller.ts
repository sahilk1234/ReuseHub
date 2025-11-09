import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IUserApplicationService, RegisterUserCommand, UpdateProfileCommand, UpdateLocationCommand, VerifyUserCommand } from '@/application/services/UserApplicationService';
import { RegisterUserDto, UpdateProfileDto, UpdateLocationDto, VerifyUserDto } from '../dtos/user.dto';
import { AppError } from '../errors/AppError';

@injectable()
export class UserController {
  constructor(
    @inject(TYPES.IUserApplicationService)
    private readonly userService: IUserApplicationService
  ) {}

  /**
   * POST /api/users/register - Register a new user
   * Requirements: 5.1
   */
  public registerUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: RegisterUserDto = req.body;

      const command: RegisterUserCommand = {
        email: dto.email,
        displayName: dto.displayName,
        phone: dto.phone,
        accountType: dto.accountType,
        location: {
          latitude: dto.latitude,
          longitude: dto.longitude,
          address: dto.address
        }
      };

      const result = await this.userService.registerUser(command);

      res.status(201).json({
        success: true,
        data: {
          userId: result.userId,
          verificationEmailSent: result.verificationEmailSent,
          message: 'User registered successfully. Please check your email to verify your account.'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'REGISTRATION_FAILED',
        error.message || 'Failed to register user'
      );
    }
  };

  /**
   * POST /api/users/verify - Verify user email
   * Requirements: 5.1
   */
  public verifyUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: VerifyUserDto = req.body;
      const { userId } = req.query;

      if (!userId || typeof userId !== 'string') {
        throw new AppError(400, 'MISSING_USER_ID', 'User ID is required');
      }

      const command: VerifyUserCommand = {
        userId,
        verificationToken: dto.verificationToken
      };

      await this.userService.verifyUser(command);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully. You can now start using Re:UseNet!',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'VERIFICATION_FAILED',
        error.message || 'Failed to verify user'
      );
    }
  };

  /**
   * POST /api/users/resend-verification - Resend verification email
   * Requirements: 5.1
   */
  public resendVerification = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      await this.userService.resendVerificationEmail(req.userId);

      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'RESEND_FAILED',
        error.message || 'Failed to resend verification email'
      );
    }
  };

  /**
   * GET /api/users/profile - Get current user's profile
   * Requirements: 5.2
   */
  public getCurrentUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const user = await this.userService.getUserProfile(req.userId);

      res.status(200).json({
        success: true,
        data: {
          id: user.id.value,
          email: user.email.value,
          displayName: user.profile.displayName,
          phone: user.profile.phone,
          avatar: user.profile.avatar,
          accountType: user.profile.accountType,
          isVerified: user.profile.isVerified,
          location: user.location.toData(),
          ecoPoints: user.ecoPoints.value,
          rating: user.rating,
          totalExchanges: user.totalExchanges,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 404,
        error.code || 'USER_NOT_FOUND',
        error.message || 'User not found'
      );
    }
  };

  /**
   * GET /api/users/:userId - Get user profile by ID
   * Requirements: 5.4
   */
  public getUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      const user = await this.userService.getUserProfile(userId);

      // Return public profile information only
      res.status(200).json({
        success: true,
        data: {
          id: user.id.value,
          displayName: user.profile.displayName,
          avatar: user.profile.avatar,
          accountType: user.profile.accountType,
          isVerified: user.profile.isVerified,
          location: {
            // Only return approximate location for privacy
            address: user.location.toData().address
          },
          rating: user.rating,
          totalExchanges: user.totalExchanges,
          createdAt: user.createdAt
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 404,
        error.code || 'USER_NOT_FOUND',
        error.message || 'User not found'
      );
    }
  };

  /**
   * PUT /api/users/profile - Update current user's profile
   * Requirements: 5.2
   */
  public updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: UpdateProfileDto = req.body;

      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const command: UpdateProfileCommand = {
        userId: req.userId,
        displayName: dto.displayName,
        phone: dto.phone,
        avatar: dto.avatar
      };

      await this.userService.updateUserProfile(command);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'UPDATE_FAILED',
        error.message || 'Failed to update profile'
      );
    }
  };

  /**
   * PUT /api/users/location - Update current user's location
   * Requirements: 5.2
   */
  public updateLocation = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: UpdateLocationDto = req.body;

      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const command: UpdateLocationCommand = {
        userId: req.userId,
        location: {
          latitude: dto.latitude,
          longitude: dto.longitude,
          address: dto.address
        }
      };

      await this.userService.updateUserLocation(command);

      res.status(200).json({
        success: true,
        message: 'Location updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'UPDATE_FAILED',
        error.message || 'Failed to update location'
      );
    }
  };

  /**
   * GET /api/users/search - Search users by display name
   */
  public searchUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q, limit } = req.query;

      if (!q || typeof q !== 'string') {
        throw new AppError(400, 'MISSING_QUERY', 'Search query is required');
      }

      const searchLimit = limit ? parseInt(limit as string, 10) : 10;
      const users = await this.userService.searchUsers(q, searchLimit);

      const usersData = users.map(user => ({
        id: user.id.value,
        displayName: user.profile.displayName,
        avatar: user.profile.avatar,
        accountType: user.profile.accountType,
        isVerified: user.profile.isVerified,
        rating: user.rating,
        totalExchanges: user.totalExchanges
      }));

      res.status(200).json({
        success: true,
        data: {
          users: usersData,
          count: usersData.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'SEARCH_FAILED',
        error.message || 'Failed to search users'
      );
    }
  };
}
