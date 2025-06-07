"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jwt = __importStar(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
class AuthMiddleware {
    async verifyToken(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'No valid token provided' });
                return;
            }
            const token = authHeader.substring(7);
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                console.error('JWT_SECRET environment variable not set');
                res.status(500).json({ error: 'Server configuration error' });
                return;
            }
            const decoded = jwt.verify(token, jwtSecret);
            const userResult = await database_1.default.executeQuery('SELECT id, email, username, profile, created_at, updated_at FROM users WHERE id = $1', [decoded.userId]);
            if (userResult.rows.length === 0) {
                res.status(401).json({ error: 'User not found' });
                return;
            }
            const sessionResult = await database_1.default.executeQuery('SELECT * FROM user_sessions WHERE user_id = $1 AND session_token = $2 AND expires_at > NOW()', [decoded.userId, token]);
            if (sessionResult.rows.length === 0) {
                res.status(401).json({ error: 'Session expired' });
                return;
            }
            const authReq = req;
            authReq.user = userResult.rows[0];
            authReq.sessionId = sessionResult.rows[0].id;
            authReq.sessionToken = token;
            next();
        }
        catch (error) {
            console.error('Auth middleware error:', error);
            if (error instanceof jwt.JsonWebTokenError) {
                res.status(401).json({ error: 'Invalid token format' });
            }
            else if (error instanceof jwt.TokenExpiredError) {
                res.status(401).json({ error: 'Token expired' });
            }
            else {
                res.status(401).json({ error: 'Authentication failed' });
            }
        }
    }
    requireRole(roles) {
        return (req, res, next) => {
            const authReq = req;
            if (!authReq.user) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }
            const userRole = authReq.user.profile?.role || 'user';
            if (!roles.includes(userRole)) {
                res.status(403).json({
                    error: 'Insufficient permissions',
                    required: roles,
                    current: userRole
                });
                return;
            }
            next();
        };
    }
    async optionalAuth(req, res, next) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        try {
            await this.verifyToken(req, res, next);
        }
        catch (error) {
            console.warn('Optional auth failed:', error);
            next();
        }
    }
    generateToken(user, expiresIn = '24h') {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET environment variable not set');
        }
        const payload = {
            userId: user.id,
            username: user.username
        };
        return jwt.sign(payload, jwtSecret, { expiresIn });
    }
    async createSession(userId, token, expiresIn = 24 * 60 * 60 * 1000) {
        const expiresAt = new Date(Date.now() + expiresIn);
        const result = await database_1.default.executeQuery(`INSERT INTO user_sessions (user_id, session_token, expires_at, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [userId, token, expiresAt, {}]);
        return result.rows[0];
    }
    async revokeSession(sessionId) {
        await database_1.default.executeQuery('DELETE FROM user_sessions WHERE id = $1', [sessionId]);
    }
    async cleanupExpiredSessions() {
        const result = await database_1.default.executeQuery('DELETE FROM user_sessions WHERE expires_at < NOW()');
        return result.rowCount || 0;
    }
}
exports.default = new AuthMiddleware();
//# sourceMappingURL=auth.js.map