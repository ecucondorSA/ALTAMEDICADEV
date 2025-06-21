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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.compose = exports.withCORS = exports.withLogging = exports.withErrorHandling = exports.withValidation = void 0;
var shared_1 = require("@altamedica/shared");
var server_1 = require("next/server");
function withValidation(schema) {
    return function (handler) {
        var _this = this;
        return function (request) { return __awaiter(_this, void 0, void 0, function () {
            var body, validation, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, request.json()];
                    case 1:
                        body = _a.sent();
                        validation = shared_1.validateSchema(schema, body);
                        if (!validation.success) {
                            return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', validation.error), { status: 400 })];
                        }
                        return [4 /*yield*/, handler(request, validation.data)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        error_1 = _a.sent();
                        if (error_1 instanceof SyntaxError) {
                            return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('INVALID_JSON', 'Invalid JSON in request body'), { status: 400 })];
                        }
                        shared_1.logger.error('Request validation error', error_1);
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('INTERNAL_ERROR', 'Internal server error'), { status: 500 })];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
    };
}
exports.withValidation = withValidation;
function withErrorHandling(handler) {
    var _this = this;
    return function (request) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return __awaiter(_this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, handler.apply(void 0, __spreadArrays([request], args))];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_2 = _a.sent();
                        shared_1.logger.error('API error', error_2);
                        if (error_2 instanceof shared_1.AppError) {
                            return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse(error_2.code, error_2.message, error_2.details), { status: error_2.statusCode })];
                        }
                        // Unexpected error
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('INTERNAL_ERROR', 'Internal server error'), { status: 500 })];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
}
exports.withErrorHandling = withErrorHandling;
function withLogging(handler) {
    var _this = this;
    return function (request) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return __awaiter(_this, void 0, void 0, function () {
            var start, method, url, response, duration, error_3, duration;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        start = Date.now();
                        method = request.method, url = request.url;
                        shared_1.logger.info(method + " " + url + " - Started");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, handler.apply(void 0, __spreadArrays([request], args))];
                    case 2:
                        response = _a.sent();
                        duration = Date.now() - start;
                        shared_1.logger.info(method + " " + url + " - " + response.status + " (" + duration + "ms)");
                        return [2 /*return*/, response];
                    case 3:
                        error_3 = _a.sent();
                        duration = Date.now() - start;
                        shared_1.logger.error(method + " " + url + " - Error (" + duration + "ms)", error_3);
                        throw error_3;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
}
exports.withLogging = withLogging;
function withCORS(handler) {
    var _this = this;
    return function (request) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return __awaiter(_this, void 0, void 0, function () {
            var response, headers;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Handle preflight requests
                        if (request.method === 'OPTIONS') {
                            return [2 /*return*/, new server_1.NextResponse(null, {
                                    status: 200,
                                    headers: {
                                        'Access-Control-Allow-Origin': '*',
                                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                                        'Access-Control-Max-Age': '86400'
                                    }
                                })];
                        }
                        return [4 /*yield*/, handler.apply(void 0, __spreadArrays([request], args))];
                    case 1:
                        response = _a.sent();
                        headers = new Headers(response.headers);
                        headers.set('Access-Control-Allow-Origin', '*');
                        headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                        return [2 /*return*/, new server_1.NextResponse(response.body, {
                                status: response.status,
                                statusText: response.statusText,
                                headers: headers
                            })];
                }
            });
        });
    };
}
exports.withCORS = withCORS;
function compose() {
    var middlewares = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        middlewares[_i] = arguments[_i];
    }
    return function (handler) {
        return middlewares.reduceRight(function (acc, middleware) { return middleware(acc); }, handler);
    };
}
exports.compose = compose;
