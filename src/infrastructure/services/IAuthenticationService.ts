export interface AuthResult {
  userId: string;
  email: string;
  isVerified: boolean;
  roles?: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface IAuthenticationService {
  /**
   * Hash a password
   * @param password - The plain text password
   * @returns Promise resolving to hashed password
   */
  hashPassword(password: string): Promise<string>;

  /**
   * Verify a password against a hash
   * @param password - The plain text password
   * @param hash - The hashed password
   * @returns Promise resolving to true if password matches
   */
  verifyPassword(password: string, hash: string): Promise<boolean>;

  /**
   * Authenticate a user using a JWT token
   * @param token - The JWT token to validate
   * @returns Promise resolving to authentication result
   */
  authenticate(token: string): Promise<AuthResult>;

  /**
   * Generate a new JWT token for a user
   * @param userId - The user ID to generate token for
   * @param email - The user's email
   * @param roles - Optional user roles
   * @returns Promise resolving to token pair
   */
  generateToken(userId: string, email: string, roles?: string[]): Promise<TokenPair>;

  /**
   * Refresh an expired access token using a refresh token
   * @param refreshToken - The refresh token
   * @returns Promise resolving to new token pair
   */
  refreshToken(refreshToken: string): Promise<TokenPair>;

  /**
   * Validate a token without full authentication (for middleware)
   * @param token - The token to validate
   * @returns Promise resolving to true if token is valid
   */
  validateToken(token: string): Promise<boolean>;

  /**
   * Revoke a token (logout)
   * @param token - The token to revoke
   * @returns Promise that resolves when token is revoked
   */
  revokeToken(token: string): Promise<void>;

  /**
   * Get user information from a token
   * @param token - The JWT token
   * @returns Promise resolving to user information
   */
  getUserFromToken(token: string): Promise<AuthResult>;
}