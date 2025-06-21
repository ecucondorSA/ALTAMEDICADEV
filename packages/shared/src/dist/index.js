"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.logger = exports.ConsoleLogger = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = exports.retry = exports.delay = exports.round = exports.clamp = exports.formatNumber = exports.formatCurrency = exports.pick = exports.omit = exports.groupBy = exports.chunk = exports.unique = exports.truncate = exports.capitalizeWords = exports.capitalize = exports.slugify = exports.generateId = exports.isPast = exports.isFuture = exports.isToday = exports.isSameDay = exports.addMinutes = exports.addHours = exports.addDays = exports.isValidDate = exports.parseDate = exports.formatDate = exports.createPaginationMeta = exports.validatePagination = exports.validateSchema = exports.createErrorResponse = exports.createSuccessResponse = void 0;
var zod_1 = require("zod");
// API Response helpers
function createSuccessResponse(data, meta) {
    return {
        success: true,
        data: data,
        meta: meta
    };
}
exports.createSuccessResponse = createSuccessResponse;
function createErrorResponse(code, message, details) {
    return {
        success: false,
        error: {
            code: code,
            message: message,
            details: details
        }
    };
}
exports.createErrorResponse = createErrorResponse;
// Validation helpers
function validateSchema(schema, data) {
    try {
        var validatedData = schema.parse(data);
        return { success: true, data: validatedData };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            var errorMessage = error.errors.map(function (err) { return err.path.join('.') + ": " + err.message; }).join(', ');
            return { success: false, error: errorMessage };
        }
        return { success: false, error: 'Validation failed' };
    }
}
exports.validateSchema = validateSchema;
function validatePagination(params) {
    var page = Math.max(1, params.page || 1);
    var limit = Math.min(100, Math.max(1, params.limit || 10));
    return { page: page, limit: limit };
}
exports.validatePagination = validatePagination;
function createPaginationMeta(page, limit, total) {
    var totalPages = Math.ceil(total / limit);
    return {
        page: page,
        limit: limit,
        total: total,
        totalPages: totalPages
    };
}
exports.createPaginationMeta = createPaginationMeta;
// Date helpers
function formatDate(date) {
    return date.toISOString();
}
exports.formatDate = formatDate;
function parseDate(dateString) {
    return new Date(dateString);
}
exports.parseDate = parseDate;
function isValidDate(date) {
    return date instanceof Date && !isNaN(date.getTime());
}
exports.isValidDate = isValidDate;
function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
exports.addDays = addDays;
function addHours(date, hours) {
    var result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
}
exports.addHours = addHours;
function addMinutes(date, minutes) {
    var result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
}
exports.addMinutes = addMinutes;
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
}
exports.isSameDay = isSameDay;
function isToday(date) {
    return isSameDay(date, new Date());
}
exports.isToday = isToday;
function isFuture(date) {
    return date.getTime() > Date.now();
}
exports.isFuture = isFuture;
function isPast(date) {
    return date.getTime() < Date.now();
}
exports.isPast = isPast;
// String helpers
function generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
exports.generateId = generateId;
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
}
exports.slugify = slugify;
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
exports.capitalize = capitalize;
function capitalizeWords(text) {
    return text.split(' ').map(capitalize).join(' ');
}
exports.capitalizeWords = capitalizeWords;
function truncate(text, length) {
    if (text.length <= length)
        return text;
    return text.substring(0, length) + '...';
}
exports.truncate = truncate;
// Array helpers
function unique(array) {
    return __spreadArrays(new Set(array));
}
exports.unique = unique;
function chunk(array, size) {
    var chunks = [];
    for (var i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
exports.chunk = chunk;
function groupBy(array, keyFn) {
    return array.reduce(function (groups, item) {
        var key = keyFn(item);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
        return groups;
    }, {});
}
exports.groupBy = groupBy;
// Object helpers
function omit(obj, keys) {
    var result = __assign({}, obj);
    keys.forEach(function (key) { return delete result[key]; });
    return result;
}
exports.omit = omit;
function pick(obj, keys) {
    var result = {};
    keys.forEach(function (key) {
        if (key in obj) {
            result[key] = obj[key];
        }
    });
    return result;
}
exports.pick = pick;
// Number helpers
function formatCurrency(amount, currency) {
    if (currency === void 0) { currency = 'USD'; }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}
exports.formatCurrency = formatCurrency;
function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}
exports.formatNumber = formatNumber;
function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}
exports.clamp = clamp;
function round(num, decimals) {
    if (decimals === void 0) { decimals = 2; }
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
exports.round = round;
// Async helpers
function delay(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
exports.delay = delay;
function retry(fn, retries, delayMs) {
    if (retries === void 0) { retries = 3; }
    if (delayMs === void 0) { delayMs = 1000; }
    return __awaiter(this, void 0, Promise, function () {
        var lastError, i, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i <= retries)) return [3 /*break*/, 8];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 7]);
                    return [4 /*yield*/, fn()];
                case 3: return [2 /*return*/, _a.sent()];
                case 4:
                    error_1 = _a.sent();
                    lastError = error_1;
                    if (!(i < retries)) return [3 /*break*/, 6];
                    return [4 /*yield*/, delay(delayMs)];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [3 /*break*/, 7];
                case 7:
                    i++;
                    return [3 /*break*/, 1];
                case 8: throw lastError || new Error('Retry failed');
            }
        });
    });
}
exports.retry = retry;
// Error helpers
var AppError = /** @class */ (function (_super) {
    __extends(AppError, _super);
    function AppError(code, message, statusCode, details) {
        if (statusCode === void 0) { statusCode = 500; }
        var _this = _super.call(this, message) || this;
        _this.code = code;
        _this.statusCode = statusCode;
        _this.details = details;
        _this.name = 'AppError';
        return _this;
    }
    return AppError;
}(Error));
exports.AppError = AppError;
var ValidationError = /** @class */ (function (_super) {
    __extends(ValidationError, _super);
    function ValidationError(message, details) {
        var _this = _super.call(this, 'VALIDATION_ERROR', message, 400, details) || this;
        _this.name = 'ValidationError';
        return _this;
    }
    return ValidationError;
}(AppError));
exports.ValidationError = ValidationError;
var NotFoundError = /** @class */ (function (_super) {
    __extends(NotFoundError, _super);
    function NotFoundError(resource) {
        var _this = _super.call(this, 'NOT_FOUND', resource + " not found", 404) || this;
        _this.name = 'NotFoundError';
        return _this;
    }
    return NotFoundError;
}(AppError));
exports.NotFoundError = NotFoundError;
var UnauthorizedError = /** @class */ (function (_super) {
    __extends(UnauthorizedError, _super);
    function UnauthorizedError(message) {
        if (message === void 0) { message = 'Unauthorized'; }
        var _this = _super.call(this, 'UNAUTHORIZED', message, 401) || this;
        _this.name = 'UnauthorizedError';
        return _this;
    }
    return UnauthorizedError;
}(AppError));
exports.UnauthorizedError = UnauthorizedError;
var ForbiddenError = /** @class */ (function (_super) {
    __extends(ForbiddenError, _super);
    function ForbiddenError(message) {
        if (message === void 0) { message = 'Forbidden'; }
        var _this = _super.call(this, 'FORBIDDEN', message, 403) || this;
        _this.name = 'ForbiddenError';
        return _this;
    }
    return ForbiddenError;
}(AppError));
exports.ForbiddenError = ForbiddenError;
var ConsoleLogger = /** @class */ (function () {
    function ConsoleLogger() {
    }
    ConsoleLogger.prototype.info = function (message, data) {
        console.log("[INFO] " + message, data ? JSON.stringify(data, null, 2) : '');
    };
    ConsoleLogger.prototype.warn = function (message, data) {
        console.warn("[WARN] " + message, data ? JSON.stringify(data, null, 2) : '');
    };
    ConsoleLogger.prototype.error = function (message, error) {
        console.error("[ERROR] " + message, error);
    };
    ConsoleLogger.prototype.debug = function (message, data) {
        if (process.env.NODE_ENV === 'development') {
            console.debug("[DEBUG] " + message, data ? JSON.stringify(data, null, 2) : '');
        }
    };
    return ConsoleLogger;
}());
exports.ConsoleLogger = ConsoleLogger;
exports.logger = new ConsoleLogger();
