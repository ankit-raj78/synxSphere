import { Request, Response, NextFunction } from 'express';
import { User, UserSession } from '../types';
export interface AuthTokenPayload {
    userId: string;
    username: string;
    iat?: number;
    exp?: number;
}
declare class AuthMiddleware {
    verifyToken(req: Request, res: Response, next: NextFunction): Promise<void>;
    requireRole(roles: string[]): (req: Request, res: Response, next: NextFunction) => void;
    optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
    generateToken(user: User, expiresIn?: string): string;
    createSession(userId: string, token: string, expiresIn?: number): Promise<UserSession>;
    revokeSession(sessionId: string): Promise<void>;
    cleanupExpiredSessions(): Promise<number>;
}
declare const _default: AuthMiddleware;
export default _default;
//# sourceMappingURL=auth.d.ts.map