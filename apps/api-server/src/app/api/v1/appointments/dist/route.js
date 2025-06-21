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
var server_1 = require("next/server");
var shared_1 = require("@altamedica/shared");
var firebase_1 = require("@altamedica/firebase");
var types_1 = require("@altamedica/types");
// GET - Lista todas las citas
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, idToken, decodedToken, uid, searchParams, limit, offset, status, doctorId, patientId, query, snapshot, appointments, enrichedAppointments, responseData, error_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    authHeader = request.headers.get('Authorization');
                    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('MISSING_TOKEN', 'Token de autorización requerido'), { status: 401 })];
                    }
                    idToken = authHeader.substring(7);
                    return [4 /*yield*/, firebase_1.adminAuth.verifyIdToken(idToken)];
                case 1:
                    decodedToken = _a.sent();
                    uid = decodedToken.uid;
                    searchParams = new URL(request.url).searchParams;
                    limit = parseInt(searchParams.get('limit') || '50');
                    offset = parseInt(searchParams.get('offset') || '0');
                    status = searchParams.get('status');
                    doctorId = searchParams.get('doctorId');
                    patientId = searchParams.get('patientId');
                    query = firebase_1.adminDb.collection('appointments').orderBy('scheduledAt', 'desc');
                    // Filtros opcionales
                    if (status) {
                        query = query.where('status', '==', status);
                    }
                    if (doctorId) {
                        query = query.where('doctorId', '==', doctorId);
                    }
                    if (patientId) {
                        query = query.where('patientId', '==', patientId);
                    }
                    // Aplicar paginación
                    query = query.limit(limit).offset(offset);
                    return [4 /*yield*/, query.get()];
                case 2:
                    snapshot = _a.sent();
                    appointments = snapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                    return [4 /*yield*/, Promise.all(appointments.map(function (appointment) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, doctorDoc, patientDoc;
                            var _b, _c, _d, _e, _f, _g;
                            return __generator(this, function (_h) {
                                switch (_h.label) {
                                    case 0: return [4 /*yield*/, Promise.all([
                                            firebase_1.adminDb.collection('users').doc(appointment.doctorId).get(),
                                            firebase_1.adminDb.collection('users').doc(appointment.patientId).get(),
                                        ])];
                                    case 1:
                                        _a = _h.sent(), doctorDoc = _a[0], patientDoc = _a[1];
                                        return [2 /*return*/, __assign(__assign({}, appointment), { doctor: doctorDoc.exists ? {
                                                    uid: doctorDoc.id,
                                                    firstName: (_b = doctorDoc.data()) === null || _b === void 0 ? void 0 : _b.firstName,
                                                    lastName: (_c = doctorDoc.data()) === null || _c === void 0 ? void 0 : _c.lastName,
                                                    email: (_d = doctorDoc.data()) === null || _d === void 0 ? void 0 : _d.email
                                                } : null, patient: patientDoc.exists ? {
                                                    uid: patientDoc.id,
                                                    firstName: (_e = patientDoc.data()) === null || _e === void 0 ? void 0 : _e.firstName,
                                                    lastName: (_f = patientDoc.data()) === null || _f === void 0 ? void 0 : _f.lastName,
                                                    email: (_g = patientDoc.data()) === null || _g === void 0 ? void 0 : _g.email
                                                } : null })];
                                }
                            });
                        }); }))];
                case 3:
                    enrichedAppointments = _a.sent();
                    responseData = {
                        appointments: enrichedAppointments,
                        pagination: {
                            limit: limit,
                            offset: offset,
                            total: snapshot.size
                        }
                    };
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse(responseData), { status: 200 })];
                case 4:
                    error_1 = _a.sent();
                    console.error('Get appointments error:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('GET_APPOINTMENTS_FAILED', 'Error al obtener citas'), { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
// POST - Crear nueva cita
function POST(request) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, idToken, decodedToken, uid, body, validatedData, _c, doctorDoc, patientDoc, conflictQuery, conflictSnapshot, appointmentData, docRef, responseData, error_2;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 6, , 7]);
                    authHeader = request.headers.get('Authorization');
                    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('MISSING_TOKEN', 'Token de autorización requerido'), { status: 401 })];
                    }
                    idToken = authHeader.substring(7);
                    return [4 /*yield*/, firebase_1.adminAuth.verifyIdToken(idToken)];
                case 1:
                    decodedToken = _d.sent();
                    uid = decodedToken.uid;
                    return [4 /*yield*/, request.json()];
                case 2:
                    body = _d.sent();
                    validatedData = types_1.AppointmentSchema.parse(__assign(__assign({}, body), { scheduledAt: new Date(body.scheduledAt) }));
                    return [4 /*yield*/, Promise.all([
                            firebase_1.adminDb.collection('users').doc(validatedData.doctorId).get(),
                            firebase_1.adminDb.collection('users').doc(validatedData.patientId).get(),
                        ])];
                case 3:
                    _c = _d.sent(), doctorDoc = _c[0], patientDoc = _c[1];
                    if (!doctorDoc.exists || ((_a = doctorDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'doctor') {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('INVALID_DOCTOR', 'Doctor no válido'), { status: 400 })];
                    }
                    if (!patientDoc.exists || ((_b = patientDoc.data()) === null || _b === void 0 ? void 0 : _b.role) !== 'patient') {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('INVALID_PATIENT', 'Paciente no válido'), { status: 400 })];
                    }
                    conflictQuery = firebase_1.adminDb
                        .collection('appointments')
                        .where('doctorId', '==', validatedData.doctorId)
                        .where('status', 'in', ['scheduled', 'confirmed', 'in-progress'])
                        .where('scheduledAt', '>=', validatedData.scheduledAt)
                        .where('scheduledAt', '<', new Date(validatedData.scheduledAt.getTime() + validatedData.duration * 60000));
                    return [4 /*yield*/, conflictQuery.get()];
                case 4:
                    conflictSnapshot = _d.sent();
                    if (!conflictSnapshot.empty) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('TIME_CONFLICT', 'El doctor no está disponible en ese horario'), { status: 409 })];
                    }
                    appointmentData = __assign(__assign({}, validatedData), { createdBy: uid, createdAt: new Date(), updatedAt: new Date() });
                    return [4 /*yield*/, firebase_1.adminDb.collection('appointments').add(appointmentData)];
                case 5:
                    docRef = _d.sent();
                    responseData = {
                        appointment: __assign({ id: docRef.id }, appointmentData),
                        message: 'Cita creada exitosamente'
                    };
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse(responseData), { status: 201 })];
                case 6:
                    error_2 = _d.sent();
                    console.error('Create appointment error:', error_2);
                    if (error_2.name === 'ZodError') {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', 'Datos de entrada inválidos', error_2.errors), { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('CREATE_APPOINTMENT_FAILED', 'Error al crear cita'), { status: 500 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
