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
// Schema para crear prescripción
var CreatePrescriptionSchema = zod_1.z.object({
    patientId: zod_1.z.string().min(1, 'ID del paciente es requerido'),
    doctorId: zod_1.z.string().min(1, 'ID del doctor es requerido'),
    appointmentId: zod_1.z.string().optional(),
    medications: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().min(1, 'Nombre del medicamento es requerido'),
        dosage: zod_1.z.string().min(1, 'Dosis es requerida'),
        frequency: zod_1.z.string().min(1, 'Frecuencia es requerida'),
        duration: zod_1.z.string().min(1, 'Duración es requerida'),
        instructions: zod_1.z.string().optional()
    })).min(1, 'Al menos un medicamento es requerido'),
    diagnosis: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    validUntil: zod_1.z.string().transform(function (val) { return new Date(val); })
});
// Schema para búsqueda de prescripciones
var PrescriptionSearchSchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(function (val) { return val ? parseInt(val) : undefined; }),
    limit: zod_1.z.string().optional().transform(function (val) { return val ? parseInt(val) : undefined; }),
    patientId: zod_1.z.string().optional(),
    doctorId: zod_1.z.string().optional(),
    status: zod_1.z["enum"](['active', 'expired', 'cancelled', 'all']).optional()["default"]('all'),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    medication: zod_1.z.string().optional()
});
function GET(request) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    return __awaiter(this, void 0, void 0, function () {
        var searchParams, queryParams, searchData_1, _s, page, limit, query, startDate, endDate, totalSnapshot, total, offset, snapshot, prescriptions, _i, _t, doc, prescriptionData, medicationFound, now, validUntil, isExpired, isCancelled, currentStatus, _u, doctorDoc, patientDoc, meta, error_1;
        return __generator(this, function (_v) {
            switch (_v.label) {
                case 0:
                    _v.trys.push([0, 7, , 8]);
                    searchParams = new URL(request.url).searchParams;
                    queryParams = Object.fromEntries(searchParams.entries());
                    searchData_1 = PrescriptionSearchSchema.parse(queryParams);
                    _s = shared_1.validatePagination({
                        page: searchData_1.page,
                        limit: searchData_1.limit
                    }), page = _s.page, limit = _s.limit;
                    query = firebase_1.adminDb.collection('prescriptions');
                    // Aplicar filtros
                    if (searchData_1.patientId) {
                        query = query.where('patientId', '==', searchData_1.patientId);
                    }
                    if (searchData_1.doctorId) {
                        query = query.where('doctorId', '==', searchData_1.doctorId);
                    }
                    // Filtros por fecha
                    if (searchData_1.startDate && searchData_1.endDate) {
                        startDate = new Date(searchData_1.startDate);
                        endDate = new Date(searchData_1.endDate);
                        query = query.where('createdAt', '>=', startDate).where('createdAt', '<=', endDate);
                    }
                    // Ordenar por fecha de creación
                    query = query.orderBy('createdAt', 'desc');
                    return [4 /*yield*/, query.get()];
                case 1:
                    totalSnapshot = _v.sent();
                    total = totalSnapshot.size;
                    offset = (page - 1) * limit;
                    query = query.offset(offset).limit(limit);
                    return [4 /*yield*/, query.get()];
                case 2:
                    snapshot = _v.sent();
                    prescriptions = [];
                    _i = 0, _t = snapshot.docs;
                    _v.label = 3;
                case 3:
                    if (!(_i < _t.length)) return [3 /*break*/, 6];
                    doc = _t[_i];
                    prescriptionData = doc.data();
                    // Aplicar filtro de medicamento (post-query)
                    if (searchData_1.medication) {
                        medicationFound = (_a = prescriptionData.medications) === null || _a === void 0 ? void 0 : _a.some(function (med) {
                            return med.name.toLowerCase().includes(searchData_1.medication.toLowerCase());
                        });
                        if (!medicationFound)
                            return [3 /*break*/, 5];
                    }
                    now = new Date();
                    validUntil = (_d = (_c = (_b = prescriptionData.validUntil) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) !== null && _d !== void 0 ? _d : new Date(prescriptionData.validUntil);
                    isExpired = validUntil < now;
                    isCancelled = prescriptionData.status === 'cancelled';
                    currentStatus = 'active';
                    if (isCancelled)
                        currentStatus = 'cancelled';
                    else if (isExpired)
                        currentStatus = 'expired';
                    if (searchData_1.status !== 'all' && currentStatus !== searchData_1.status) {
                        return [3 /*break*/, 5];
                    }
                    return [4 /*yield*/, Promise.all([
                            firebase_1.adminDb.collection('users').doc(prescriptionData.doctorId).get(),
                            firebase_1.adminDb.collection('users').doc(prescriptionData.patientId).get(),
                        ])];
                case 4:
                    _u = _v.sent(), doctorDoc = _u[0], patientDoc = _u[1];
                    prescriptions.push(__assign(__assign({ id: doc.id }, prescriptionData), { status: currentStatus, createdAt: (_g = (_f = (_e = prescriptionData.createdAt) === null || _e === void 0 ? void 0 : _e.toDate) === null || _f === void 0 ? void 0 : _f.call(_e)) !== null && _g !== void 0 ? _g : prescriptionData.createdAt, validUntil: (_k = (_j = (_h = prescriptionData.validUntil) === null || _h === void 0 ? void 0 : _h.toDate) === null || _j === void 0 ? void 0 : _j.call(_h)) !== null && _k !== void 0 ? _k : prescriptionData.validUntil, doctor: doctorDoc.exists ? {
                            id: prescriptionData.doctorId,
                            firstName: (_l = doctorDoc.data()) === null || _l === void 0 ? void 0 : _l.firstName,
                            lastName: (_m = doctorDoc.data()) === null || _m === void 0 ? void 0 : _m.lastName,
                            email: (_o = doctorDoc.data()) === null || _o === void 0 ? void 0 : _o.email
                        } : null, patient: patientDoc.exists ? {
                            id: prescriptionData.patientId,
                            firstName: (_p = patientDoc.data()) === null || _p === void 0 ? void 0 : _p.firstName,
                            lastName: (_q = patientDoc.data()) === null || _q === void 0 ? void 0 : _q.lastName,
                            email: (_r = patientDoc.data()) === null || _r === void 0 ? void 0 : _r.email
                        } : null }));
                    _v.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    meta = shared_1.createPaginationMeta(page, limit, total);
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse(prescriptions, meta), { status: 200 })];
                case 7:
                    error_1 = _v.sent();
                    console.error('Error fetching prescriptions:', error_1);
                    if (error_1 instanceof zod_1.z.ZodError) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', 'Parámetros de búsqueda inválidos', error_1.errors), { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('FETCH_PRESCRIPTIONS_FAILED', 'Error al obtener prescripciones'), { status: 500 })];
                case 8: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
function POST(request) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, body, prescriptionData, _g, doctorDoc, patientDoc, now, prescription, docRef, error_2;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    _h.trys.push([0, 4, , 5]);
                    authHeader = request.headers.get('Authorization');
                    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'), { status: 401 })];
                    }
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _h.sent();
                    prescriptionData = CreatePrescriptionSchema.parse(body);
                    return [4 /*yield*/, Promise.all([
                            firebase_1.adminDb.collection('users').doc(prescriptionData.doctorId).get(),
                            firebase_1.adminDb.collection('users').doc(prescriptionData.patientId).get(),
                        ])];
                case 2:
                    _g = _h.sent(), doctorDoc = _g[0], patientDoc = _g[1];
                    if (!doctorDoc.exists) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('DOCTOR_NOT_FOUND', 'Doctor no encontrado'), { status: 404 })];
                    }
                    if (!patientDoc.exists) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('PATIENT_NOT_FOUND', 'Paciente no encontrado'), { status: 404 })];
                    }
                    now = new Date();
                    prescription = __assign(__assign({}, prescriptionData), { prescriptionNumber: "RX-" + Date.now(), status: 'active', digitalSignature: "DR_" + prescriptionData.doctorId + "_" + Date.now(), createdAt: now, updatedAt: now });
                    return [4 /*yield*/, firebase_1.adminDb.collection('prescriptions').add(prescription)];
                case 3:
                    docRef = _h.sent();
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse(__assign(__assign({ id: docRef.id }, prescription), { doctor: {
                                id: prescriptionData.doctorId,
                                firstName: (_a = doctorDoc.data()) === null || _a === void 0 ? void 0 : _a.firstName,
                                lastName: (_b = doctorDoc.data()) === null || _b === void 0 ? void 0 : _b.lastName,
                                email: (_c = doctorDoc.data()) === null || _c === void 0 ? void 0 : _c.email
                            }, patient: {
                                id: prescriptionData.patientId,
                                firstName: (_d = patientDoc.data()) === null || _d === void 0 ? void 0 : _d.firstName,
                                lastName: (_e = patientDoc.data()) === null || _e === void 0 ? void 0 : _e.lastName,
                                email: (_f = patientDoc.data()) === null || _f === void 0 ? void 0 : _f.email
                            } })), { status: 201 })];
                case 4:
                    error_2 = _h.sent();
                    console.error('Error creating prescription:', error_2);
                    if (error_2 instanceof zod_1.z.ZodError) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', 'Datos de prescripción inválidos', error_2.errors), { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('CREATE_PRESCRIPTION_FAILED', 'Error al crear prescripción'), { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
