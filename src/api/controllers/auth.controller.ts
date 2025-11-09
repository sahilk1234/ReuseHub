import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IAuthenticationService } from '@/infrastructure/services/IAuthenticationService';
import { IUserApplicationService } from '@/application/services/UserApplicationService';
import { LoginDto, RefreshTokenDto } from '../dtos/auth.dto';
import { AppError } from '../errors/AppError';

@injectable()
export class AuthController {
  constructor(
    @inject(TYPES.IAuthenticationService)
    private readonly authService: IAuthenticationService,
    @inject(TYPES.IUserApplicationService)
    private readonly userService: IUserApplicationService
  ) {}

  /**
   * POST /api/auth/login - Login user
   * Requirements: 5.1, 5.2
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: LoginDto = req.body;

      // Find user by email
      const user = await this.userService.getUserByEmail(dto.email);
      
      if (!user) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      // In a real implementation, you would verify the password here
      // For now, we'll generate a token assuming the password is correct
      // TODO: Implement password verification

      // Generate tokens
      const tokens = await this.authService.generateToken(
        user.id.value,
        user.email.value,
        []
      );

      res.status(200).json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          user: {
            id: user.id.value,
            email: user.email.value,
            displayName: user.profile.displayName,
            avatar: user.profile.avatar,
            isVerified: user.profile.isVerified
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        401,
        'LOGIN_FAILED',
        'Invalid email or password'
      );
    }
  };

  /**
   * POST /api/auth/refresh - Refresh access token
   * Requirements: 5.2
   */
  public refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: RefreshTokenDto = req.body;

      const tokens = await this.authService.refreshToken(dto.refreshToken);

      res.status(200).json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        401,
        'REFRESH_FAILED',
        'Invalid or expired refresh token'
      );
    }
  };

  /**
   * POST /api/auth/logout - Logout user
   * Requirements: 5.2
   */
  public logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        await this.authService.revokeToken(token);
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        500,
        'LOGOUT_FAILED',
        'Failed to logout'
      );
    }
  };

  /**
   * POST /api/auth/auth0-login - Login/Register user via Auth0
   * Requirements: 5.1, 5.2
   */
  public auth0Login = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('[AuthController] Auth0 login request received');
      const { email, name, auth0Id, picture } = req.body;

      console.log('[AuthController] Auth0 user data:', { email, name, auth0Id });

      if (!auth0Id) {
        throw new AppError(400, 'INVALID_REQUEST', 'Auth0 ID is required');
      }

      // If no email provided, generate one from auth0Id
      const userEmail = email || `${auth0Id.replace(/[^a-zA-Z0-9]/g, '_')}@auth0.user`;
      console.log('[AuthController] Using email:', userEmail);

      // Try to find existing user by email
      console.log('[AuthController] Looking for existing user with email:', userEmail);
      let user = await this.userService.getUserByEmail(userEmail);

      if (!user) {
        console.log('[AuthController] User not found, creating new user');
        // Create new user if doesn't exist
        const result = await this.userService.registerUser({
          email,
          password: `auth0_${auth0Id}_${Date.now()}`, // Random password for Auth0 users
          displayName: name || email.split('@')[0],
          accountType: 'individual',
          location: {
            latitude: 0, // Default location, user can update later
            longitude: 0,
            address: 'Not specified'
          },
          phone: undefined
        });
        console.log('[AuthController] New user created:', result.userId);
        
        // Fetch the newly created user
        user = await this.userService.getUserProfile(result.userId);
        console.log('[AuthController] User profile fetched');
      } else {
        console.log('[AuthController] Existing user found:', user.id.value);
      }

      // Generate tokens
      console.log('[AuthController] Generating tokens for user:', user.id.value);
      const tokens = await this.authService.generateToken(
        user.id.value,
        user.email.value,
        []
      );

      console.log('[AuthController] Tokens generated successfully');

      res.status(200).json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          user: {
            id: user.id.value,
            email: user.email.value,
            displayName: user.profile.displayName,
            avatar: user.profile.avatar || picture,
            isVerified: true, // Auth0 users are considered verified
            accountType: user.profile.accountType,
            location: user.location.toData(),
            ecoPoints: user.ecoPoints.value,
            rating: user.rating,
            totalExchanges: user.totalExchanges
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[AuthController] Auth0 login error:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        500,
        'AUTH0_LOGIN_FAILED',
        error.message || 'Failed to authenticate with Auth0'
      );
    }
  };

  /**
   * GET /api/auth/me - Get current authenticated user
   * Requirements: 5.2
   */
  public getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('[AuthController] getCurrentUser - userId:', req.userId);
      
      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const user = await this.userService.getUserProfile(req.userId);
      console.log('[AuthController] User profile retrieved:', user.email.value);

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
      console.error('[AuthController] getCurrentUser error:', error);
      throw new AppError(
        error.statusCode || 404,
        error.code || 'USER_NOT_FOUND',
        error.message || 'User not found'
      );
    }
  };
}
