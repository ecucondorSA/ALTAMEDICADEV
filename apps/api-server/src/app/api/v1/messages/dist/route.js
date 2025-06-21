"use strict";
/**
 * 💬 MESSAGES API
 * User-to-user messaging and conversations
 *
 * GET /api/v1/messages - List conversations for user
 * POST /api/v1/messages - Send new message
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
 * GET /api/v1/messages
 * List conversations for authenticated user
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var authResult, searchParams, page, limit, type, status, query, offset, snapshot, conversations, _i, _a, doc, conversationData, unreadSnapshot, conversation, totalSnapshot, total, totalUnreadSnapshot, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 9, , 10]);
                    return [4 /*yield*/, simple_auth_1.verifyAuthToken(request)];
                case 1:
                    authResult = _b.sent();
                    if (!authResult.success || !authResult.user) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Authentication required'
                            }, { status: 401 })];
                    }
                    searchParams = new URL(request.url).searchParams;
                    page = parseInt(searchParams.get('page') || '1');
                    limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
                    type = searchParams.get('type');
                    status = searchParams.get('status') || 'active';
                    query = db.collection('conversations')
                        .where('participants', 'array-contains', authResult.user.id);
                    // Apply filters
                    if (type) {
                        query = query.where('type', '==', type);
                    }
                    if (status) {
                        query = query.where('status', '==', status);
                    }
                    // Sort by last message time
                    query = query.orderBy('updated_at', 'desc');
                    offset = (page - 1) * limit;
                    query = query.offset(offset).limit(limit);
                    return [4 /*yield*/, query.get()];
                case 2:
                    snapshot = _b.sent();
                    conversations = [];
                    _i = 0, _a = snapshot.docs;
                    _b.label = 3;
                case 3:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    doc = _a[_i];
                    conversationData = doc.data();
                    return [4 /*yield*/, db.collection('messages')
                            .where('conversation_id', '==', doc.id)
                            .where('recipient_id', '==', authResult.user.id)
                            .where('is_read', '==', false)
                            .get()];
                case 4:
                    unreadSnapshot = _b.sent();
                    conversation = __assign(__assign({ id: doc.id }, conversationData), { unread_count: unreadSnapshot.size });
                    conversations.push(conversation);
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: return [4 /*yield*/, db.collection('conversations')
                        .where('participants', 'array-contains', authResult.user.id)
                        .where('status', '==', status)
                        .get()];
                case 7:
                    totalSnapshot = _b.sent();
                    total = totalSnapshot.size;
                    return [4 /*yield*/, db.collection('messages')
                            .where('recipient_id', '==', authResult.user.id)
                            .where('is_read', '==', false)
                            .get()];
                case 8:
                    totalUnreadSnapshot = _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                conversations: conversations,
                                total_unread: totalUnreadSnapshot.size,
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
                case 9:
                    error_1 = _b.sent();
                    console.error('Conversations fetch error:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: 'Failed to fetch conversations'
                        }, { status: 500 })];
                case 10: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
/**
 * POST /api/v1/messages
 * Send new message
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var authResult, body, requiredFields, _i, requiredFields_1, field, recipientDoc, recipientData, senderData, conversationId, existingConversations, existingConversation, _a, _b, doc, data, newConversation, conversationRef, now, message, messageRef, error_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 10, , 11]);
                    return [4 /*yield*/, simple_auth_1.verifyAuthToken(request)];
                case 1:
                    authResult = _c.sent();
                    if (!authResult.success || !authResult.user) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Authentication required'
                            }, { status: 401 })];
                    }
                    return [4 /*yield*/, request.json()];
                case 2:
                    body = _c.sent();
                    requiredFields = ['recipient_id', 'content'];
                    for (_i = 0, requiredFields_1 = requiredFields; _i < requiredFields_1.length; _i++) {
                        field = requiredFields_1[_i];
                        if (!body[field]) {
                            return [2 /*return*/, server_1.NextResponse.json({
                                    success: false,
                                    error: "Missing required field: " + field
                                }, { status: 400 })];
                        }
                    }
                    return [4 /*yield*/, db.collection('users').doc(body.recipient_id).get()];
                case 3:
                    recipientDoc = _c.sent();
                    if (!recipientDoc.exists) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Recipient not found'
                            }, { status: 400 })];
                    }
                    recipientData = recipientDoc.data();
                    senderData = authResult.user;
                    conversationId = body.conversation_id;
                    if (!!conversationId) return [3 /*break*/, 7];
                    return [4 /*yield*/, db.collection('conversations')
                            .where('participants', 'array-contains', authResult.user.id)
                            .where('type', '==', 'direct')
                            .get()];
                case 4:
                    existingConversations = _c.sent();
                    existingConversation = null;
                    for (_a = 0, _b = existingConversations.docs; _a < _b.length; _a++) {
                        doc = _b[_a];
                        data = doc.data();
                        if (data.participants.includes(body.recipient_id) && data.participants.length === 2) {
                            existingConversation = doc;
                            break;
                        }
                    }
                    if (!existingConversation) return [3 /*break*/, 5];
                    conversationId = existingConversation.id;
                    return [3 /*break*/, 7];
                case 5:
                    newConversation = {
                        participants: [authResult.user.id, body.recipient_id],
                        participant_details: [
                            {
                                id: senderData.id,
                                name: senderData.name,
                                role: senderData.role,
                                avatar: senderData.avatar
                            },
                            {
                                id: recipientData.id,
                                name: recipientData.name,
                                role: recipientData.role,
                                avatar: recipientData.avatar
                            }
                        ],
                        type: 'direct',
                        status: 'active',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    return [4 /*yield*/, db.collection('conversations').add(newConversation)];
                case 6:
                    conversationRef = _c.sent();
                    conversationId = conversationRef.id;
                    _c.label = 7;
                case 7:
                    now = new Date().toISOString();
                    message = {
                        conversation_id: conversationId,
                        sender_id: authResult.user.id,
                        sender: {
                            id: senderData.id,
                            name: senderData.name,
                            role: senderData.role,
                            avatar: senderData.avatar
                        },
                        recipient_id: body.recipient_id,
                        recipient: {
                            id: recipientData.id,
                            name: recipientData.name,
                            role: recipientData.role,
                            avatar: recipientData.avatar
                        },
                        content: body.content,
                        type: body.type || 'text',
                        metadata: body.metadata || {},
                        is_read: false,
                        created_at: now,
                        updated_at: now
                    };
                    return [4 /*yield*/, db.collection('messages').add(message)];
                case 8:
                    messageRef = _c.sent();
                    // Update conversation with last message
                    return [4 /*yield*/, db.collection('conversations').doc(conversationId).update({
                            last_message: {
                                content: body.content,
                                sender_id: authResult.user.id,
                                created_at: now
                            },
                            updated_at: now
                        })];
                case 9:
                    // Update conversation with last message
                    _c.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: __assign(__assign({ id: messageRef.id }, message), { conversation_id: conversationId }),
                            message: 'Message sent successfully'
                        }, { status: 201 })];
                case 10:
                    error_2 = _c.sent();
                    console.error('Message send error:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: 'Failed to send message'
                        }, { status: 500 })];
                case 11: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
