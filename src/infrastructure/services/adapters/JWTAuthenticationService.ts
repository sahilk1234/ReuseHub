import jwt from 'jsonwebtoken';
import { hash, compare } from 'bcrypt';
import { AuthResult, IAuthenticationService, TokenPair } from '../IAuthenticationService';

export interface JWTConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
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
      const decoded = jwt.verify(token, this.config.jwtSecret) as any;
      
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
    const payload = { userId, email, roles };
    const accessToken = jwt.sign(
      payload,
      this.config.jwtSecret,
      { expiresIn: this.config.jwtExpiresIn } as jwt.SignOptions
    );

    const refreshPayload = { userId, email, type: 'refresh' };
    const refreshToken = jwt.sign(
      refreshPayload,
      this.config.jwtSecret,
      { expiresIn: this.config.refreshTokenExpiresIn } as jwt.SignOptions
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
      const decoded = jwt.verify(refreshToken, this.config.jwtSecret) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      return this.generateToken(decoded.userId, decoded.email, decoded.roles);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      jwt.verify(token, this.config.jwtSecret);
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
}
