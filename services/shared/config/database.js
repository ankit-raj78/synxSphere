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
var pg_1 = require("pg");
var mongodb_1 = require("mongodb");
var redis_1 = require("redis");
var DatabaseManager = /** @class */ (function () {
    function DatabaseManager() {
        this.postgres = null;
        this.mongodb = null;
        this.redis = null;
        this.gridFS = null;
        this.mongoClient = null;
    }
    DatabaseManager.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        // PostgreSQL connection
                        this.postgres = new pg_1.Pool({
                            host: process.env.POSTGRES_HOST || 'localhost',
                            port: parseInt(process.env.POSTGRES_PORT || '5432'),
                            database: process.env.POSTGRES_DB || 'syncsphere',
                            user: process.env.POSTGRES_USER || 'syncsphere',
                            password: process.env.POSTGRES_PASSWORD || 'syncsphere_password',
                            max: 20,
                            idleTimeoutMillis: 30000,
                            connectionTimeoutMillis: 2000,
                        });
                        // Test PostgreSQL connection
                        return [4 /*yield*/, this.postgres.query('SELECT 1')];
                    case 1:
                        // Test PostgreSQL connection
                        _a.sent();
                        // MongoDB connection
                        this.mongoClient = new mongodb_1.MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/syncsphere');
                        return [4 /*yield*/, this.mongoClient.connect()];
                    case 2:
                        _a.sent();
                        this.mongodb = this.mongoClient.db('syncsphere');
                        this.gridFS = new mongodb_1.GridFSBucket(this.mongodb, { bucketName: 'audio_files' });
                        // Test MongoDB connection
                        return [4 /*yield*/, this.mongodb.admin().ping()];
                    case 3:
                        // Test MongoDB connection
                        _a.sent();
                        // Redis connection
                        this.redis = (0, redis_1.createClient)({
                            url: "redis://".concat(process.env.REDIS_HOST || 'localhost', ":").concat(process.env.REDIS_PORT || '6379'),
                            password: process.env.REDIS_PASSWORD || undefined,
                        });
                        return [4 /*yield*/, this.redis.connect()];
                    case 4:
                        _a.sent();
                        // Test Redis connection
                        return [4 /*yield*/, this.redis.ping()];
                    case 5:
                        // Test Redis connection
                        _a.sent();
                        console.log('All databases connected successfully');
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _a.sent();
                        console.error('Database initialization failed:', error_1);
                        throw error_1;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseManager.prototype.healthCheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            var services, allHealthy, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        services = {
                            postgres: false,
                            mongodb: false,
                            redis: false,
                        };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 8, , 9]);
                        if (!this.postgres) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.postgres.query('SELECT 1')];
                    case 2:
                        _a.sent();
                        services.postgres = true;
                        _a.label = 3;
                    case 3:
                        if (!this.mongodb) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.mongodb.admin().ping()];
                    case 4:
                        _a.sent();
                        services.mongodb = true;
                        _a.label = 5;
                    case 5:
                        if (!this.redis) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.redis.ping()];
                    case 6:
                        _a.sent();
                        services.redis = true;
                        _a.label = 7;
                    case 7:
                        allHealthy = Object.values(services).every(Boolean);
                        return [2 /*return*/, {
                                status: allHealthy ? 'healthy' : 'unhealthy',
                                timestamp: new Date(),
                                services: services,
                            }];
                    case 8:
                        error_2 = _a.sent();
                        return [2 /*return*/, {
                                status: 'unhealthy',
                                error: error_2 instanceof Error ? error_2.message : 'Unknown error',
                                timestamp: new Date(),
                                services: services,
                            }];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseManager.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        if (!this.postgres) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.postgres.end()];
                    case 1:
                        _a.sent();
                        this.postgres = null;
                        _a.label = 2;
                    case 2:
                        if (!this.mongoClient) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.mongoClient.close()];
                    case 3:
                        _a.sent();
                        this.mongoClient = null;
                        this.mongodb = null;
                        this.gridFS = null;
                        _a.label = 4;
                    case 4:
                        if (!this.redis) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.redis.quit()];
                    case 5:
                        _a.sent();
                        this.redis = null;
                        _a.label = 6;
                    case 6:
                        console.log('All database connections closed');
                        return [3 /*break*/, 8];
                    case 7:
                        error_3 = _a.sent();
                        console.error('Error closing database connections:', error_3);
                        throw error_3;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    // Helper method to get a PostgreSQL client with transaction support
    DatabaseManager.prototype.getPostgresClient = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!this.postgres) {
                    throw new Error('PostgreSQL not initialized');
                }
                return [2 /*return*/, this.postgres.connect()];
            });
        });
    };
    // Helper method to execute queries with error handling
    DatabaseManager.prototype.executeQuery = function (query_1) {
        return __awaiter(this, arguments, void 0, function (query, params) {
            var result, error_4;
            if (params === void 0) { params = []; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.postgres) {
                            throw new Error('PostgreSQL not initialized');
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.postgres.query(query, params)];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, {
                                rows: result.rows,
                                rowCount: result.rowCount
                            }];
                    case 3:
                        error_4 = _a.sent();
                        console.error('Query execution error:', error_4);
                        throw error_4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return DatabaseManager;
}());
exports.default = new DatabaseManager();
