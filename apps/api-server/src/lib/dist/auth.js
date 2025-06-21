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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
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
exports.__esModule = true;
exports.verifyAuthToken = exports.optionalAuth = exports.requireRole = exports.requireAuth = exports.authenticateRequest = void 0;
var firebase_1 = require("@altamedica/firebase");
var shared_1 = require("@altamedica/shared");
function authenticateRequest(request) {
    return __awaiter(this, void 0, Promise, function () {
        var authHeader, idToken, decodedToken, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    authHeader = request.headers.get('authorization');
                    if (!authHeader || !authHeader.startsWith('Bearer ')) {
                        throw new shared_1.UnauthorizedError('Missing or invalid authorization header');
                    }
                    idToken = authHeader.substring(7);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, firebase_1.verifyIdToken(idToken)];
                case 2:
                    decodedToken = _a.sent();
                    return [2 /*return*/, {
                            uid: decodedToken.uid,
                            email: decodedToken.email || '',
                            role: decodedToken.role || 'patient',
                            isEmailVerified: decodedToken.email_verified || false
                        }];
                case 3:
                    error_1 = _a.sent();
                    shared_1.logger.error('Token verification failed', error_1);
                    throw new shared_1.UnauthorizedError('Invalid or expired token');
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.authenticateRequest = authenticateRequest;
function requireAuth(handler) {
    var _this = this;
    return function (request) { return __awaiter(_this, void 0, void 0, function () {
        var auth, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, authenticateRequest(request)];
                case 1:
                    auth = _a.sent();
                    return [4 /*yield*/, handler(request, auth)];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    error_2 = _a.sent();
                    if (error_2 instanceof shared_1.UnauthorizedError || error_2 instanceof shared_1.ForbiddenError) {
                        return [2 /*return*/, Response.json({
                                success: false,
                                error: {
                                    code: error_2.code,
                                    message: error_2.message
                                }
                            }, { status: error_2.statusCode })];
                    }
                    shared_1.logger.error('Authentication error', error_2);
                    return [2 /*return*/, Response.json({
                            success: false,
                            error: {
                                code: 'INTERNAL_ERROR',
                                message: 'Internal server error'
                            }
                        }, { status: 500 })];
                case 4: return [2 /*return*/];
            }
        });
    }); };
}
exports.requireAuth = requireAuth;
function requireRole(roles) {
    var allowedRoles = Array.isArray(roles) ? roles : [roles];
    return function (handler) {
        var _this = this;
        return requireAuth(function (request, auth) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!allowedRoles.includes(auth.role)) {
                            throw new shared_1.ForbiddenError("Access denied. Required roles: " + allowedRoles.join(', '));
                        }
                        return [4 /*yield*/, handler(request, auth)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); });
    };
}
exports.requireRole = requireRole;
function optionalAuth(handler) {
    var _this = this;
    return function (request) { return __awaiter(_this, void 0, void 0, function () {
        var auth, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 5]);
                    return [4 /*yield*/, authenticateRequest(request)];
                case 1:
                    auth = _a.sent();
                    return [4 /*yield*/, handler(request, auth)];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    error_3 = _a.sent();
                    return [4 /*yield*/, handler(request, undefined)];
                case 4: 
                // If authentication fails, continue without auth context
                return [2 /*return*/, _a.sent()];
                case 5: return [2 /*return*/];
            }
        });
    }); };
}
exports.optionalAuth = optionalAuth;
function verifyAuthToken(request) {
    return __awaiter(this, void 0, Promise, function () {
        var auth, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, authenticateRequest(request)];
                case 1:
                    auth = _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            user: {
                                id: auth.uid,
                                email: auth.email,
                                role: auth.role,
                                name: auth.email.split('@')[0],
                                avatar: undefined,
                                company_id: undefined
                            }
                        }];
                case 2:
                    error_4 = _a.sent();
                    return [2 /*return*/, {
                            success: false,
                            error: error_4 instanceof Error ? error_4.message : 'Authentication failed'
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.verifyAuthToken = verifyAuthToken;
