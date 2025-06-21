"use strict";
/**
 * 🔔 NOTIFICATIONS API
 * Manage user notifications and alerts
 *
 * GET /api/v1/notifications - List user notifications
 * POST /api/v1/notifications - Create new notification (Admin only)
 */
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
exports.__esModule = true;
exports.POST = exports.GET = void 0;
var simple_auth_1 = require("@/lib/simple-auth");
var firestore_1 = require("firebase-admin/firestore");
var server_1 = require("next/server");
var db = firestore_1.getFirestore();
/**
 * GET /api/v1/notifications
 * List notifications for authenticated user
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var authResult, searchParams, page, limit, unread_only, type, priority, query, now, offset, snapshot, notifications, unreadSnapshot, unread_count, totalSnapshot, total, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, simple_auth_1.verifyAuthToken(request)];
                case 1:
                    authResult = _a.sent();
                    if (!authResult.success || !authResult.user) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Authentication required'
                            }, { status: 401 })];
                    }
                    searchParams = new URL(request.url).searchParams;
                    page = parseInt(searchParams.get('page') || '1');
                    limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
                    unread_only = searchParams.get('unread_only') === 'true';
                    type = searchParams.get('type');
                    priority = searchParams.get('priority');
                    query = db.collection('notifications');
                    // Filter by recipient
                    query = query.where('recipient_id', 'in', [authResult.user.id, 'all']);
                    // Filter by read status
                    if (unread_only) {
                        query = query.where('is_read', '==', false);
                    }
                    // Filter by type
                    if (type) {
                        query = query.where('type', '==', type);
                    }
                    // Filter by priority
                    if (priority) {
                        query = query.where('priority', '==', priority);
                    }
                    now = new Date().toISOString();
                    query = query.where('expires_at', '>', now);
                    // Sort by creation date (newest first)
                    query = query.orderBy('created_at', 'desc');
                    offset = (page - 1) * limit;
                    query = query.offset(offset).limit(limit);
                    return [4 /*yield*/, query.get()];
                case 2:
                    snapshot = _a.sent();
                    notifications = snapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                    return [4 /*yield*/, db.collection('notifications')
                            .where('recipient_id', 'in', [authResult.user.id, 'all'])
                            .where('is_read', '==', false)
                            .where('expires_at', '>', now)
                            .get()];
                case 3:
                    unreadSnapshot = _a.sent();
                    unread_count = unreadSnapshot.size;
                    return [4 /*yield*/, db.collection('notifications')
                            .where('recipient_id', 'in', [authResult.user.id, 'all'])
                            .where('expires_at', '>', now)
                            .get()];
                case 4:
                    totalSnapshot = _a.sent();
                    total = totalSnapshot.size;
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                notifications: notifications,
                                unread_count: unread_count,
                                pagination: {
                                    page: page,
                                    limit: limit,
                                    total: total,
                                    pages: Math.ceil(total / limit),
                                    has_next: page * limit < total,
                                    has_prev: page > 1
                                }
                            }
                        })];
                case 5:
                    error_1 = _a.sent();
                    console.error('Notifications fetch error:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: 'Failed to fetch notifications'
                        }, { status: 500 })];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
/**
 * POST /api/v1/notifications
 * Create new notification (Admin/System only)
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var authResult, body, requiredFields, _i, requiredFields_1, field, validTypes, validPriorities, validRecipientTypes, priority, recipientType, now, expiresAt, notification, notifications, usersSnapshot, _a, _b, userDoc, batch_1, docRef, error_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 8, , 9]);
                    return [4 /*yield*/, simple_auth_1.verifyAuthToken(request)];
                case 1:
                    authResult = _c.sent();
                    if (!authResult.success || !authResult.user) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Authentication required'
                            }, { status: 401 })];
                    }
                    // Check permissions (admin only for manual notifications)
                    if (authResult.user.role !== 'admin') {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Insufficient permissions'
                            }, { status: 403 })];
                    }
                    return [4 /*yield*/, request.json()];
                case 2:
                    body = _c.sent();
                    requiredFields = ['title', 'message', 'recipient_id', 'type'];
                    for (_i = 0, requiredFields_1 = requiredFields; _i < requiredFields_1.length; _i++) {
                        field = requiredFields_1[_i];
                        if (!body[field]) {
                            return [2 /*return*/, server_1.NextResponse.json({
                                    success: false,
                                    error: "Missing required field: " + field
                                }, { status: 400 })];
                        }
                    }
                    validTypes = ['info', 'warning', 'success', 'error', 'appointment', 'prescription', 'system'];
                    validPriorities = ['low', 'medium', 'high', 'urgent'];
                    validRecipientTypes = ['user', 'doctor', 'patient', 'company', 'all'];
                    if (!validTypes.includes(body.type)) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Invalid notification type'
                            }, { status: 400 })];
                    }
                    priority = body.priority || 'medium';
                    if (!validPriorities.includes(priority)) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Invalid priority level'
                            }, { status: 400 })];
                    }
                    recipientType = body.recipient_type || 'user';
                    if (!validRecipientTypes.includes(recipientType)) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Invalid recipient type'
                            }, { status: 400 })];
                    }
                    now = new Date().toISOString();
                    expiresAt = body.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                    notification = {
                        recipient_id: body.recipient_id,
                        recipient_type: recipientType,
                        title: body.title,
                        message: body.message,
                        type: body.type,
                        priority: priority,
                        data: body.data || {},
                        action_url: body.action_url,
                        action_text: body.action_text,
                        is_read: false,
                        expires_at: expiresAt,
                        created_at: now,
                        updated_at: now
                    };
                    if (!(body.recipient_id === 'all')) return [3 /*break*/, 5];
                    notifications = [];
                    return [4 /*yield*/, db.collection('users')
                            .where('status', '==', 'active')
                            .get()];
                case 3:
                    usersSnapshot = _c.sent();
                    for (_a = 0, _b = usersSnapshot.docs; _a < _b.length; _a++) {
                        userDoc = _b[_a];
                        notifications.push(__assign(__assign({}, notification), { recipient_id: userDoc.id }));
                    }
                    batch_1 = db.batch();
                    notifications.forEach(function (notif) {
                        var notifRef = db.collection('notifications').doc();
                        batch_1.set(notifRef, notif);
                    });
                    return [4 /*yield*/, batch_1.commit()];
                case 4:
                    _c.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            message: notifications.length + " notifications created successfully",
                            data: {
                                notifications_sent: notifications.length
                            }
                        }, { status: 201 })];
                case 5: return [4 /*yield*/, db.collection('notifications').add(notification)];
                case 6:
                    docRef = _c.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: __assign({ id: docRef.id }, notification),
                            message: 'Notification created successfully'
                        }, { status: 201 })];
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_2 = _c.sent();
                    console.error('Notification creation error:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: 'Failed to create notification'
                        }, { status: 500 })];
                case 9: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
