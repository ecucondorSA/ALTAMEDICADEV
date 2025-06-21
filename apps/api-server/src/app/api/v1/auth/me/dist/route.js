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
exports.GET = void 0;
var firebase_1 = require("@altamedica/firebase");
var shared_1 = require("@altamedica/shared");
var server_1 = require("next/server");
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, idToken, decodedToken, uid, userDoc, userData, roleProfile, doctorDoc, patientDoc, companyDoc, responseData, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, , 10]);
                    authHeader = request.headers.get('Authorization');
                    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('MISSING_TOKEN', 'Token de autorización requerido'), { status: 401 })];
                    }
                    idToken = authHeader.substring(7);
                    return [4 /*yield*/, firebase_1.adminAuth.verifyIdToken(idToken)];
                case 1:
                    decodedToken = _a.sent();
                    uid = decodedToken.uid;
                    return [4 /*yield*/, firebase_1.adminDb.collection('users').doc(uid).get()];
                case 2:
                    userDoc = _a.sent();
                    if (!userDoc.exists) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('USER_NOT_FOUND', 'Usuario no encontrado'), { status: 404 })];
                    }
                    userData = userDoc.data();
                    // Check if user is active
                    if (!(userData === null || userData === void 0 ? void 0 : userData.isActive)) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('USER_INACTIVE', 'Usuario inactivo'), { status: 403 })];
                    }
                    roleProfile = null;
                    if (!(userData.role === 'doctor')) return [3 /*break*/, 4];
                    return [4 /*yield*/, firebase_1.adminDb.collection('doctors').doc(uid).get()];
                case 3:
                    doctorDoc = _a.sent();
                    roleProfile = doctorDoc.exists ? doctorDoc.data() : null;
                    return [3 /*break*/, 8];
                case 4:
                    if (!(userData.role === 'patient')) return [3 /*break*/, 6];
                    return [4 /*yield*/, firebase_1.adminDb.collection('patients').doc(uid).get()];
                case 5:
                    patientDoc = _a.sent();
                    roleProfile = patientDoc.exists ? patientDoc.data() : null;
                    return [3 /*break*/, 8];
                case 6:
                    if (!(userData.role === 'company')) return [3 /*break*/, 8];
                    return [4 /*yield*/, firebase_1.adminDb.collection('companies').doc(uid).get()];
                case 7:
                    companyDoc = _a.sent();
                    roleProfile = companyDoc.exists ? companyDoc.data() : null;
                    _a.label = 8;
                case 8:
                    responseData = {
                        user: {
                            uid: uid,
                            email: userData.email,
                            firstName: userData.firstName,
                            lastName: userData.lastName,
                            role: userData.role,
                            emailVerified: userData.emailVerified,
                            phoneNumber: userData.phoneNumber,
                            isActive: userData.isActive,
                            createdAt: userData.createdAt,
                            updatedAt: userData.updatedAt,
                            metadata: userData.metadata
                        },
                        roleProfile: roleProfile
                    };
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse(responseData), { status: 200 })];
                case 9:
                    error_1 = _a.sent();
                    console.error('Get user error:', error_1);
                    // Handle Firebase Auth errors
                    if (error_1.code === 'auth/id-token-expired') {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('TOKEN_EXPIRED', 'Token expirado'), { status: 401 })];
                    }
                    if (error_1.code === 'auth/id-token-revoked') {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('TOKEN_REVOKED', 'Token revocado'), { status: 401 })];
                    }
                    if (error_1.code === 'auth/invalid-id-token') {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('INVALID_TOKEN', 'Token inválido'), { status: 401 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('GET_USER_FAILED', 'Error al obtener información del usuario'), { status: 500 })];
                case 10: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
