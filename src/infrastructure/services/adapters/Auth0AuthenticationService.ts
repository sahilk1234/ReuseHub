import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { AuthResult, IAuthenticationService, TokenPair } from '../IAuthenticationService';

export interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience: string;
  issuer: string;
  jwksUri: string;
}

export class Auth0AuthenticationService implements IAuthenticationService {
  private jwksClient: jwksClient.JwksClient;

  constructor(private config: Auth0Config) {
    this.jwksClient = jwksClient({
      jwksUri: config.jwksUri,
      requestHeaders: {},
      timeout: 30000,
    });
  }

  async hashPassword(password: string): Promise<string> {
    throw new Error('Password hashing not supported with Auth0. Use Auth0 for authentication.');
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    throw new Error('Password verification not supported with Auth0. Use Auth0 for authentication.');
  }

  async authenticate(token: string): Promise<AuthResult> {
    try {
      const decoded = await this.verifyToken(token);
      
      return {
        userId: decoded.sub,
        email: decoded.email || decoded['https://reusenet.com/email'],
        isVerified: decoded.email_verified || false,
        roles: decoded['https://reusenet.com/roles'] || [],
      };
    } catch (error) {
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Invalid token'}`);
    }
  }

  async generateToken(userId: string, email: string, roles: string[] = []): Promise<TokenPair> {
    // Note: In a real Auth0 implementation, you would typically use Auth0's Management API
    // to create tokens. This is a simplified implementation for demonstration.
    const payload = {
      sub: userId,
      email,
      email_verified: true,
      'https://reusenet.com/roles': roles,
      iss: this.config.issuer,
      aud: this.config.audience,
    };

    const accessToken = jwt.sign(payload, this.config.clientSecret, {
      expiresIn: '1h',
      algorithm: 'HS256',
    });

    const refreshToken = jwt.sign(
      { sub: userId, type: 'refresh' },
      this.config.clientSecret,
      {
        expiresIn: '7d',
        algorithm: 'HS256',
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = jwt.verify(refreshToken, this.config.clientSecret) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      // In a real implementation, you would fetch user data from Auth0
      // For now, we'll create a new token with basic info
      return this.generateToken(decoded.sub, '', []);
    } catch (error) {
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Invalid refresh token'}`);
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      await this.verifyToken(token);
      return true;
    } catch {
      return false;
    }
  }

  async revokeToken(token: string): Promise<void> {
    // In a real Auth0 implementation, you would call Auth0's revoke endpoint
    // For now, we'll just validate the token exists
    await this.verifyToken(token);
    // Token revocation would be handled by Auth0's infrastructure
  }

  async getUserFromToken(token: string): Promise<AuthResult> {
    return this.authenticate(token);
  }

  private async verifyToken(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // First, try to decode the token to get the header
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded || !decoded.header || !decoded.header.kid) {
        return reject(new Error('Invalid token format'));
      }

      // Get the signing key from JWKS
      this.jwksClient.getSigningKey(decoded.header.kid, (err: any, key: any) => {
        if (err) {
          return reject(err);
        }

        const signingKey = key?.getPublicKey();
        
        if (!signingKey) {
          return reject(new Error('Unable to get signing key'));
        }

        // Verify the token
        jwt.verify(token, signingKey, {
          audience: this.config.audience,
          issuer: this.config.issuer,
          algorithms: ['RS256'],
        }, (verifyErr, payload) => {
          if (verifyErr) {
            return reject(verifyErr);
          }
          resolve(payload);
        });
      });
    });
  }
}