"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var jwt = require("jsonwebtoken");
var database_1 = require("../config/database");
var AuthMiddleware = /** @class */ (function () {
    function AuthMiddleware() {
    }
    /**
     * Middleware to verify JWT token and attach user to request
     */
    AuthMiddleware.prototype.verifyToken = function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var authHeader, token, jwtSecret, decoded, userResult, sessionResult, authReq, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        authHeader = req.headers.authorization;
                        if (!authHeader || !authHeader.startsWith('Bearer ')) {
                            res.status(401).json({ error: 'No valid token provided' });
                            return [2 /*return*/];
                        }
                        token = authHeader.substring(7);
                        jwtSecret = process.env.JWT_SECRET;
                        if (!jwtSecret) {
                            console.error('JWT_SECRET environment variable not set');
                            res.status(500).json({ error: 'Server configuration error' });
                            return [2 /*return*/];
                        }
                        decoded = jwt.verify(token, jwtSecret);
                        return [4 /*yield*/, database_1.default.executeQuery('SELECT id, email, username, profile, created_at, updated_at FROM users WHERE id = $1', [decoded.userId])];
                    case 1:
                        userResult = _a.sent();
                        if (userResult.rows.length === 0) {
                            res.status(401).json({ error: 'User not found' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, database_1.default.executeQuery('SELECT * FROM user_sessions WHERE user_id = $1 AND session_token = $2 AND expires_at > NOW()', [decoded.userId, token])];
                    case 2:
                        sessionResult = _a.sent();
                        if (sessionResult.rows.length === 0) {
                            res.status(401).json({ error: 'Session expired' });
                            return [2 /*return*/];
                        }
                        authReq = req;
                        authReq.user = userResult.rows[0];
                        authReq.sessionId = sessionResult.rows[0].id;
                        authReq.sessionToken = token;
                        next();
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Auth middleware error:', error_1);
                        if (error_1 instanceof jwt.JsonWebTokenError) {
                            res.status(401).json({ error: 'Invalid token format' });
                        }
                        else if (error_1 instanceof jwt.TokenExpiredError) {
                            res.status(401).json({ error: 'Token expired' });
                        }
                        else {
                            res.status(401).json({ error: 'Authentication failed' });
                        }
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Middleware to require specific user roles
     */
    AuthMiddleware.prototype.requireRole = function (roles) {
        return function (req, res, next) {
            var _a;
            var authReq = req;
            if (!authReq.user) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }
            var userRole = ((_a = authReq.user.profile) === null || _a === void 0 ? void 0 : _a.role) || 'user';
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
    };
    /**
     * Optional authentication middleware - doesn't fail if no token provided
     */
    AuthMiddleware.prototype.optionalAuth = function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var authHeader, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        authHeader = req.headers.authorization;
                        if (!authHeader || !authHeader.startsWith('Bearer ')) {
                            next();
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.verifyToken(req, res, next)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        // Don't fail on optional auth - just continue without user
                        console.warn('Optional auth failed:', error_2);
                        next();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate JWT token for user
     */
    AuthMiddleware.prototype.generateToken = function (user, expiresIn) {
        if (expiresIn === void 0) { expiresIn = '24h'; }
        var jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET environment variable not set');
        }
        var payload = {
            userId: user.id,
            username: user.username
        };
        return jwt.sign(payload, jwtSecret, { expiresIn: expiresIn });
    };
    /**
     * Create user session in database
     */
    AuthMiddleware.prototype.createSession = function (userId_1, token_1) {
        return __awaiter(this, arguments, void 0, function (userId, token, expiresIn) {
            var expiresAt, result;
            if (expiresIn === void 0) { expiresIn = 24 * 60 * 60 * 1000; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        expiresAt = new Date(Date.now() + expiresIn);
                        return [4 /*yield*/, database_1.default.executeQuery("INSERT INTO user_sessions (user_id, session_token, expires_at, metadata)\n       VALUES ($1, $2, $3, $4)\n       RETURNING *", [userId, token, expiresAt, {}])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0]];
                }
            });
        });
    };
    /**
     * Revoke user session
     */
    AuthMiddleware.prototype.revokeSession = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, database_1.default.executeQuery('DELETE FROM user_sessions WHERE id = $1', [sessionId])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Clean up expired sessions
     */
    AuthMiddleware.prototype.cleanupExpiredSessions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, database_1.default.executeQuery('DELETE FROM user_sessions WHERE expires_at < NOW()')];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount || 0];
                }
            });
        });
    };
    return AuthMiddleware;
}());
exports.default = new AuthMiddleware();
