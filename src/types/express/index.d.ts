import { AuthResult } from '@/infrastructure/services/IAuthenticationService';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: AuthResult;
    }
  }
}

export {};
