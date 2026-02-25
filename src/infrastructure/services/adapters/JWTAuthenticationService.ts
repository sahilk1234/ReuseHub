import jwt from 'jsonwebtoken';
import { hash, compare } from 'bcrypt';
import { AuthResult, IAuthenticationService, TokenPair } from '../IAuthenticationService';

export interface JWTConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  jwtIssuer?: string;
  jwtAudience?: string | string[];
  clockToleranceSec?: number;
}

export class JWTAuthenticationService implements IAuthenticationService {
  private readonly SALT_ROUNDS = 10;

  constructor(private config: JWTConfig) {}

  async hashPassword(password: string): Promise<string> {
    return hash(password, this.SALT_ROUNDS);
  }

  async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return compare(password, passwordHash);
  }

  async authenticate(token: string): Promise<AuthResult> {
    try {
      const decoded = this.verifyAccessToken(token);
      
      return {
        userId: decoded.userId,
        email: decoded.email,
        isVerified: decoded.isVerified || false,
        roles: decoded.roles || []
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async generateToken(userId: string, email: string, roles?: string[]): Promise<TokenPair> {
    const payload = { userId, email, roles, type: 'access' };
    const signOptions: jwt.SignOptions = {
      expiresIn: this.config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
      algorithm: 'HS256'
    };
    if (this.config.jwtIssuer) {
      signOptions.issuer = this.config.jwtIssuer as jwt.SignOptions['issuer'];
    }
    if (this.config.jwtAudience) {
      signOptions.audience = this.config.jwtAudience as jwt.SignOptions['audience'];
    }

    const accessToken = jwt.sign(
      payload,
      this.config.jwtSecret,
      signOptions
    );

    const refreshPayload = { userId, email, type: 'refresh' };
    const refreshOptions: jwt.SignOptions = {
      expiresIn: this.config.refreshTokenExpiresIn as jwt.SignOptions['expiresIn'],
      algorithm: 'HS256'
    };
    if (this.config.jwtIssuer) {
      refreshOptions.issuer = this.config.jwtIssuer as jwt.SignOptions['issuer'];
    }
    if (this.config.jwtAudience) {
      refreshOptions.audience = this.config.jwtAudience as jwt.SignOptions['audience'];
    }

    const refreshToken = jwt.sign(
      refreshPayload,
      this.config.jwtSecret,
      refreshOptions
    );

    // Parse expiration time to seconds
    const expiresIn = this.parseExpirationTime(this.config.jwtExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      return this.generateToken(decoded.userId, decoded.email, decoded.roles);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      this.verifyAccessToken(token);
      return true;
    } catch (error) {
      return false;
    }
  }

  async revokeToken(token: string): Promise<void> {
    // In a production system, you would store revoked tokens in Redis or a database
    // For now, this is a no-op since JWT tokens are stateless
    // Consider implementing a token blacklist if needed
  }

  async getUserFromToken(token: string): Promise<AuthResult> {
    return this.authenticate(token);
  }

  private parseExpirationTime(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default to 1 hour
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }

  private buildVerifyOptions(): jwt.VerifyOptions {
    const options: jwt.VerifyOptions = {
      algorithms: ['HS256']
    };

    if (this.config.jwtIssuer) {
      options.issuer = this.config.jwtIssuer as jwt.VerifyOptions['issuer'];
    }
    if (this.config.jwtAudience) {
      // jsonwebtoken types expect string | RegExp | [..]; cast safely
      options.audience = (Array.isArray(this.config.jwtAudience)
        ? this.config.jwtAudience
        : this.config.jwtAudience) as jwt.VerifyOptions['audience'];
    }
    if (this.config.clockToleranceSec !== undefined) {
      options.clockTolerance = this.config.clockToleranceSec;
    }

    return options;
  }

  private verifyAccessToken(token: string): any {
    const decoded = jwt.verify(token, this.config.jwtSecret, this.buildVerifyOptions()) as any;

    if (decoded.type && decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  }

  private verifyRefreshToken(token: string): any {
    const decoded = jwt.verify(token, this.config.jwtSecret, this.buildVerifyOptions()) as any;

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    return decoded;
  }
}
