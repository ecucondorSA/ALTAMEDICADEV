"use strict";
/**
 * 🔔 BULK NOTIFICATION OPERATIONS
 * Mark all notifications as read for authenticated user
 *
 * PUT /api/v1/notifications/mark-all-read
 */
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
exports.PUT = void 0;
var simple_auth_1 = require("@/lib/simple-auth");
var firestore_1 = require("firebase-admin/firestore");
var server_1 = require("next/server");
var db = firestore_1.getFirestore();
/**
 * PUT /api/v1/notifications/mark-all-read
 * Mark all user notifications as read
 */
function PUT(request) {
    return __awaiter(this, void 0, void 0, function () {
        var authResult, snapshot, batch_1, now_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, simple_auth_1.verifyAuthToken(request)];
                case 1:
                    authResult = _a.sent();
                    if (!authResult.success || !authResult.user) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Authentication required'
                            }, { status: 401 })];
                    }
                    return [4 /*yield*/, db.collection('notifications')
                            .where('recipient_id', 'in', [authResult.user.id, 'all'])
                            .where('is_read', '==', false)
                            .get()];
                case 2:
                    snapshot = _a.sent();
                    if (snapshot.empty) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: true,
                                message: 'No unread notifications found',
                                data: { marked_count: 0 }
                            })];
                    }
                    batch_1 = db.batch();
                    now_1 = new Date().toISOString();
                    snapshot.docs.forEach(function (doc) {
                        batch_1.update(doc.ref, {
                            is_read: true,
                            read_at: now_1,
                            updated_at: now_1
                        });
                    });
                    return [4 /*yield*/, batch_1.commit()];
                case 3:
                    _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            message: snapshot.size + " notifications marked as read",
                            data: {
                                marked_count: snapshot.size
                            }
                        })];
                case 4:
                    error_1 = _a.sent();
                    console.error('Bulk mark read error:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: 'Failed to mark notifications as read'
                        }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.PUT = PUT;
