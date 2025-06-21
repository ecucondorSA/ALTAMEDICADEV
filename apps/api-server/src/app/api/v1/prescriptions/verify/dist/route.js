"use strict";
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
var firebase_1 = require("@altamedica/firebase");
var shared_1 = require("@altamedica/shared");
var server_1 = require("next/server");
var zod_1 = require("zod");
// Schema para verificar prescripción
var VerifyPrescriptionSchema = zod_1.z.object({
    prescriptionNumber: zod_1.z.string().min(1, 'Número de prescripción requerido'),
    patientId: zod_1.z.string().optional(),
    pharmacyId: zod_1.z.string().optional(),
    checkDigitalSignature: zod_1.z.boolean()["default"](true)
});
function GET(request) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    return __awaiter(this, void 0, void 0, function () {
        var searchParams, queryParams, verifyData, prescriptionsQuery, prescriptionsSnapshot, prescriptionDoc, prescriptionData, now, validUntil, isExpired, isCancelled, currentStatus, verificationStatus, warnings, digitalSignatureValid, expectedSignature, dispensingHistory, dispensingQuery, dispensingSnapshot, error_1, _t, doctorDoc, patientDoc, doctorProfileDoc, doctorProfile, verificationResult, error_2, error_3;
        return __generator(this, function (_u) {
            switch (_u.label) {
                case 0:
                    _u.trys.push([0, 12, , 13]);
                    searchParams = new URL(request.url).searchParams;
                    queryParams = Object.fromEntries(searchParams.entries());
                    verifyData = VerifyPrescriptionSchema.parse(queryParams);
                    prescriptionsQuery = firebase_1.adminDb
                        .collection('prescriptions')
                        .where('prescriptionNumber', '==', verifyData.prescriptionNumber);
                    return [4 /*yield*/, prescriptionsQuery.get()];
                case 1:
                    prescriptionsSnapshot = _u.sent();
                    if (prescriptionsSnapshot.empty) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('PRESCRIPTION_NOT_FOUND', 'Prescripción no encontrada'), { status: 404 })];
                    }
                    prescriptionDoc = prescriptionsSnapshot.docs[0];
                    prescriptionData = prescriptionDoc.data();
                    // Verificar que la prescripción pertenece al paciente (si se proporciona)
                    if (verifyData.patientId && prescriptionData.patientId !== verifyData.patientId) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('PRESCRIPTION_MISMATCH', 'La prescripción no pertenece al paciente especificado'), { status: 403 })];
                    }
                    now = new Date();
                    validUntil = (_c = (_b = (_a = prescriptionData.validUntil) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : new Date(prescriptionData.validUntil);
                    isExpired = validUntil < now;
                    isCancelled = prescriptionData.status === 'cancelled';
                    currentStatus = 'active';
                    verificationStatus = 'valid';
                    warnings = [];
                    if (isCancelled) {
                        currentStatus = 'cancelled';
                        verificationStatus = 'invalid';
                        warnings.push('Prescripción cancelada');
                    }
                    else if (isExpired) {
                        currentStatus = 'expired';
                        verificationStatus = 'invalid';
                        warnings.push('Prescripción expirada');
                    }
                    digitalSignatureValid = true;
                    if (verifyData.checkDigitalSignature) {
                        expectedSignature = "DR_" + prescriptionData.doctorId + "_" + prescriptionData.prescriptionNumber.split('-')[1];
                        digitalSignatureValid = prescriptionData.digitalSignature === expectedSignature;
                        if (!digitalSignatureValid) {
                            verificationStatus = 'invalid';
                            warnings.push('Firma digital inválida');
                        }
                    }
                    dispensingHistory = [];
                    _u.label = 2;
                case 2:
                    _u.trys.push([2, 4, , 5]);
                    dispensingQuery = firebase_1.adminDb
                        .collection('dispensing_records')
                        .where('prescriptionId', '==', prescriptionDoc.id)
                        .orderBy('dispensedAt', 'desc');
                    return [4 /*yield*/, dispensingQuery.get()];
                case 3:
                    dispensingSnapshot = _u.sent();
                    dispensingHistory = dispensingSnapshot.docs.map(function (doc) {
                        var _a, _b, _c;
                        return (__assign(__assign({ id: doc.id }, doc.data()), { dispensedAt: (_c = (_b = (_a = doc.data().dispensedAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : doc.data().dispensedAt }));
                    });
                    if (dispensingHistory.length > 0) {
                        warnings.push("Prescripci\u00F3n ya dispensada " + dispensingHistory.length + " vez(es)");
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _u.sent();
                    // Si no existe la colección de dispensing, continuar sin error
                    console.log('Dispensing records collection not found');
                    return [3 /*break*/, 5];
                case 5: return [4 /*yield*/, Promise.all([
                        firebase_1.adminDb.collection('users').doc(prescriptionData.doctorId).get(),
                        firebase_1.adminDb.collection('users').doc(prescriptionData.patientId).get(),
                    ])];
                case 6:
                    _t = _u.sent(), doctorDoc = _t[0], patientDoc = _t[1];
                    return [4 /*yield*/, firebase_1.adminDb.collection('doctors').doc(prescriptionData.doctorId).get()];
                case 7:
                    doctorProfileDoc = _u.sent();
                    doctorProfile = doctorProfileDoc.exists ? doctorProfileDoc.data() : null;
                    // Verificar licencia del doctor
                    if (doctorProfile && !doctorProfile.isVerified) {
                        verificationStatus = 'warning';
                        warnings.push('Doctor no verificado');
                    }
                    verificationResult = {
                        prescriptionId: prescriptionDoc.id,
                        prescriptionNumber: prescriptionData.prescriptionNumber,
                        status: currentStatus,
                        verificationStatus: verificationStatus,
                        digitalSignatureValid: digitalSignatureValid,
                        isExpired: isExpired,
                        isCancelled: isCancelled,
                        daysUntilExpiry: Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
                        warnings: warnings,
                        // Información de la prescripción
                        medications: prescriptionData.medications,
                        diagnosis: prescriptionData.diagnosis,
                        createdAt: (_f = (_e = (_d = prescriptionData.createdAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) !== null && _f !== void 0 ? _f : prescriptionData.createdAt,
                        validUntil: (_j = (_h = (_g = prescriptionData.validUntil) === null || _g === void 0 ? void 0 : _g.toDate) === null || _h === void 0 ? void 0 : _h.call(_g)) !== null && _j !== void 0 ? _j : prescriptionData.validUntil,
                        // Información del doctor
                        doctor: doctorDoc.exists ? {
                            id: prescriptionData.doctorId,
                            firstName: (_k = doctorDoc.data()) === null || _k === void 0 ? void 0 : _k.firstName,
                            lastName: (_l = doctorDoc.data()) === null || _l === void 0 ? void 0 : _l.lastName,
                            email: (_m = doctorDoc.data()) === null || _m === void 0 ? void 0 : _m.email,
                            licenseNumber: doctorProfile === null || doctorProfile === void 0 ? void 0 : doctorProfile.licenseNumber,
                            isVerified: (_o = doctorProfile === null || doctorProfile === void 0 ? void 0 : doctorProfile.isVerified) !== null && _o !== void 0 ? _o : false,
                            specialties: (_p = doctorProfile === null || doctorProfile === void 0 ? void 0 : doctorProfile.specialties) !== null && _p !== void 0 ? _p : []
                        } : null,
                        // Información del paciente
                        patient: patientDoc.exists ? {
                            id: prescriptionData.patientId,
                            firstName: (_q = patientDoc.data()) === null || _q === void 0 ? void 0 : _q.firstName,
                            lastName: (_r = patientDoc.data()) === null || _r === void 0 ? void 0 : _r.lastName,
                            email: (_s = patientDoc.data()) === null || _s === void 0 ? void 0 : _s.email
                        } : null,
                        // Historial de dispensing (si existe)
                        dispensingHistory: dispensingHistory.slice(0, 5),
                        // Metadata de verificación
                        verifiedAt: now,
                        verifiedBy: verifyData.pharmacyId ? { pharmacyId: verifyData.pharmacyId } : null
                    };
                    _u.label = 8;
                case 8:
                    _u.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, firebase_1.adminDb.collection('prescription_verifications').add({
                            prescriptionId: prescriptionDoc.id,
                            prescriptionNumber: prescriptionData.prescriptionNumber,
                            verificationStatus: verificationStatus,
                            verifiedAt: now,
                            verifiedBy: verifyData.pharmacyId || 'unknown',
                            warnings: warnings
                        })];
                case 9:
                    _u.sent();
                    return [3 /*break*/, 11];
                case 10:
                    error_2 = _u.sent();
                    console.log('Could not log verification audit trail:', error_2);
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse(verificationResult), { status: 200 })];
                case 12:
                    error_3 = _u.sent();
                    console.error('Error verifying prescription:', error_3);
                    if (error_3 instanceof zod_1.z.ZodError) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', 'Parámetros de verificación inválidos', error_3.errors), { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VERIFY_PRESCRIPTION_FAILED', 'Error al verificar prescripción'), { status: 500 })];
                case 13: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, body, verifyData, prescriptionsQuery, prescriptionsSnapshot, prescriptionDoc, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    authHeader = request.headers.get('Authorization');
                    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'), { status: 401 })];
                    }
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _a.sent();
                    verifyData = VerifyPrescriptionSchema.parse(body);
                    if (!verifyData.pharmacyId) return [3 /*break*/, 4];
                    prescriptionsQuery = firebase_1.adminDb
                        .collection('prescriptions')
                        .where('prescriptionNumber', '==', verifyData.prescriptionNumber);
                    return [4 /*yield*/, prescriptionsQuery.get()];
                case 2:
                    prescriptionsSnapshot = _a.sent();
                    if (!!prescriptionsSnapshot.empty) return [3 /*break*/, 4];
                    prescriptionDoc = prescriptionsSnapshot.docs[0];
                    // Registrar dispensación
                    return [4 /*yield*/, firebase_1.adminDb.collection('dispensing_records').add({
                            prescriptionId: prescriptionDoc.id,
                            prescriptionNumber: verifyData.prescriptionNumber,
                            pharmacyId: verifyData.pharmacyId,
                            dispensedAt: new Date(),
                            dispensedBy: 'pharmacy_system'
                        })];
                case 3:
                    // Registrar dispensación
                    _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse({
                            message: 'Prescripción verificada y marcada como dispensada',
                            prescriptionId: prescriptionDoc.id,
                            dispensedAt: new Date()
                        }), { status: 200 })];
                case 4: 
                // Si no es farmacia o no se encuentra la prescripción, solo verificar
                return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('PRESCRIPTION_NOT_FOUND', 'Prescripción no encontrada para dispensar'), { status: 404 })];
                case 5:
                    error_4 = _a.sent();
                    console.error('Error dispensing prescription:', error_4);
                    if (error_4 instanceof zod_1.z.ZodError) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', 'Datos de dispensación inválidos', error_4.errors), { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('DISPENSE_PRESCRIPTION_FAILED', 'Error al dispensar prescripción'), { status: 500 })];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
