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
exports.POST = void 0;
var firebase_1 = require("@altamedica/firebase");
var shared_1 = require("@altamedica/shared");
var types_1 = require("@altamedica/types");
var server_1 = require("next/server");
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var body, validatedData, email, password, firstName, lastName, role, phoneNumber, userRecord, userProfile, customToken, responseData, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 12, , 13]);
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _a.sent();
                    validatedData = types_1.RegisterSchema.parse(body);
                    email = validatedData.email, password = validatedData.password, firstName = validatedData.firstName, lastName = validatedData.lastName, role = validatedData.role, phoneNumber = validatedData.phoneNumber;
                    return [4 /*yield*/, firebase_1.adminAuth.createUser({
                            email: email,
                            password: password,
                            displayName: firstName + " " + lastName,
                            phoneNumber: phoneNumber,
                            emailVerified: false
                        })];
                case 2:
                    userRecord = _a.sent();
                    // Set custom claims based on role
                    return [4 /*yield*/, firebase_1.adminAuth.setCustomUserClaims(userRecord.uid, {
                            role: role,
                            altamedicaUser: true,
                            createdAt: Date.now()
                        })];
                case 3:
                    // Set custom claims based on role
                    _a.sent();
                    userProfile = {
                        uid: userRecord.uid,
                        email: email,
                        firstName: firstName,
                        lastName: lastName,
                        role: role,
                        phoneNumber: phoneNumber || null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        emailVerified: false,
                        isActive: true,
                        metadata: {
                            lastSignIn: null,
                            signInCount: 0
                        }
                    };
                    return [4 /*yield*/, firebase_1.adminDb.collection('users').doc(userRecord.uid).set(userProfile)];
                case 4:
                    _a.sent();
                    if (!(role === 'doctor')) return [3 /*break*/, 6];
                    return [4 /*yield*/, firebase_1.adminDb.collection('doctors').doc(userRecord.uid).set({
                            userId: userRecord.uid,
                            specialties: [],
                            license: null,
                            education: [],
                            experience: [],
                            availability: {},
                            rating: 0,
                            reviewCount: 0,
                            isVerified: false,
                            createdAt: new Date()
                        })];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 6:
                    if (!(role === 'patient')) return [3 /*break*/, 8];
                    return [4 /*yield*/, firebase_1.adminDb.collection('patients').doc(userRecord.uid).set({
                            userId: userRecord.uid,
                            dateOfBirth: null,
                            gender: null,
                            bloodType: null,
                            allergies: [],
                            medications: [],
                            emergencyContact: null,
                            medicalHistory: [],
                            createdAt: new Date()
                        })];
                case 7:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 8:
                    if (!(role === 'company')) return [3 /*break*/, 10];
                    return [4 /*yield*/, firebase_1.adminDb.collection('companies').doc(userRecord.uid).set({
                            userId: userRecord.uid,
                            companyName: firstName + " " + lastName,
                            industry: null,
                            size: null,
                            description: null,
                            website: null,
                            address: null,
                            isVerified: false,
                            subscription: 'basic',
                            createdAt: new Date()
                        })];
                case 9:
                    _a.sent();
                    _a.label = 10;
                case 10: return [4 /*yield*/, firebase_1.adminAuth.createCustomToken(userRecord.uid)];
                case 11:
                    customToken = _a.sent();
                    responseData = {
                        user: {
                            uid: userRecord.uid,
                            email: userRecord.email,
                            displayName: userRecord.displayName,
                            role: role,
                            emailVerified: userRecord.emailVerified
                        },
                        customToken: customToken,
                        message: 'Usuario registrado exitosamente'
                    };
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse(responseData), { status: 201 })];
                case 12:
                    error_1 = _a.sent();
                    console.error('Registration error:', error_1);
                    // Handle Firebase Auth errors
                    if (error_1.code === 'auth/email-already-exists') {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('EMAIL_EXISTS', 'El email ya está registrado'), { status: 409 })];
                    }
                    if (error_1.code === 'auth/invalid-email') {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('INVALID_EMAIL', 'Email inválido'), { status: 400 })];
                    }
                    if (error_1.code === 'auth/weak-password') {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('WEAK_PASSWORD', 'La contraseña debe tener al menos 6 caracteres'), { status: 400 })];
                    }
                    // Handle Zod validation errors
                    if (error_1.name === 'ZodError') {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', 'Datos de entrada inválidos', error_1.errors), { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('REGISTRATION_FAILED', 'Error en el registro'), { status: 500 })];
                case 13: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
