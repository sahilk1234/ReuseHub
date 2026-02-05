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

      const passwordHash = await this.userService.getPasswordHashByEmail(dto.email);
      if (!passwordHash) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      const isValidPassword = await this.authService.verifyPassword(dto.password, passwordHash);
      if (!isValidPassword) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

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
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new AppError(401, 'MISSING_AUTH_TOKEN', 'Authorization header is required');
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new AppError(401, 'INVALID_AUTH_FORMAT', 'Authorization header must be in format: Bearer <token>');
      }

      const token = parts[1];

      if (!('verifyAuth0AccessToken' in this.authService)) {
        throw new AppError(500, 'AUTH0_NOT_CONFIGURED', 'Auth0 provider is not configured');
      }

      const decoded = await (this.authService as any).verifyAuth0AccessToken(token);

      const auth0Id = decoded.sub as string | undefined;
      let email = decoded.email as string | undefined;
      let name = decoded.name as string | undefined;
      let picture = decoded.picture as string | undefined;

      // If email/name missing in token, resolve via /userinfo
      if ((!email || !name) && 'getUserInfoFromToken' in this.authService) {
        try {
          const info = await (this.authService as any).getUserInfoFromToken(token);
          email = email || info?.email || info?.userinfo?.email;
          name = name || info?.name || info?.nickname || info?.userinfo?.name;
          picture = picture || info?.picture || info?.userinfo?.picture;
          console.log('[AuthController] Resolved user info via /userinfo:', { email, name });
        } catch (e: any) {
          console.warn('[AuthController] Failed to resolve user info via /userinfo:', e?.message || e);
        }
      }

      console.log('[AuthController] Auth0 token verified:', { auth0Id, email });

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
          email: userEmail,
          password: `auth0_${auth0Id}_${Date.now()}`, // Random password for Auth0 users
          displayName: name || userEmail.split('@')[0],
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
        // Refresh profile fields from Auth0 when available
        const updates: { displayName?: string; avatar?: string } = {};
        if (name && name !== user.profile.displayName) {
          updates.displayName = name;
        }
        if (picture && picture !== user.profile.avatar) {
          updates.avatar = picture;
        }
        if (Object.keys(updates).length > 0) {
          await this.userService.updateUserProfile({
            userId: user.id.value,
            ...updates
          } as any);
          user = await this.userService.getUserProfile(user.id.value);
        }
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

      const isDev = process.env.NODE_ENV !== 'production';
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
          updatedAt: user.updatedAt,
          ...(isDev && {
            authDebug: {
              userId: req.userId,
              roles: req.user?.roles || [],
              isVerified: req.user?.isVerified
            }
          })
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

  /**
   * GET /api/auth/auth0-session - Debug Auth0 session info (dev-only)
   * Returns decoded token + /userinfo (no raw token)
   */
  public auth0SessionInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      if (process.env.NODE_ENV === 'production') {
        throw new AppError(403, 'FORBIDDEN', 'Not available in production');
      }

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new AppError(401, 'MISSING_AUTH_TOKEN', 'Authorization header is required');
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new AppError(401, 'INVALID_AUTH_FORMAT', 'Authorization header must be in format: Bearer <token>');
      }

      const token = parts[1];

      if (!('verifyAuth0AccessToken' in this.authService)) {
        throw new AppError(500, 'AUTH0_NOT_CONFIGURED', 'Auth0 provider is not configured');
      }

      const decoded = await (this.authService as any).verifyAuth0AccessToken(token);
      let userInfo: any = null;

      if ('getUserInfoFromToken' in this.authService) {
        try {
          userInfo = await (this.authService as any).getUserInfoFromToken(token);
        } catch (e: any) {
          userInfo = { error: e?.message || 'Failed to load /userinfo' };
        }
      }

      res.status(200).json({
        success: true,
        data: {
          decoded,
          userInfo
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[AuthController] auth0SessionInfo error:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        500,
        'AUTH0_SESSION_FAILED',
        error.message || 'Failed to read Auth0 session'
      );
    }
  };
}
