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
// Schema para crear récord médico
var CreateMedicalRecordSchema = zod_1.z.object({
    patientId: zod_1.z.string().min(1, 'ID del paciente es requerido'),
    doctorId: zod_1.z.string().min(1, 'ID del doctor es requerido'),
    appointmentId: zod_1.z.string().optional(),
    type: zod_1.z["enum"](['consultation', 'diagnosis', 'treatment', 'lab_result', 'imaging', 'surgery', 'emergency']),
    title: zod_1.z.string().min(1, 'Título es requerido'),
    description: zod_1.z.string().min(1, 'Descripción es requerida'),
    diagnosis: zod_1.z.array(zod_1.z.string()).optional(),
    symptoms: zod_1.z.array(zod_1.z.string()).optional(),
    treatments: zod_1.z.array(zod_1.z.string()).optional(),
    medications: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        dosage: zod_1.z.string(),
        frequency: zod_1.z.string()
    })).optional(),
    vitals: zod_1.z.object({
        bloodPressure: zod_1.z.string().optional(),
        heartRate: zod_1.z.number().optional(),
        temperature: zod_1.z.number().optional(),
        weight: zod_1.z.number().optional(),
        height: zod_1.z.number().optional()
    }).optional(),
    labResults: zod_1.z.array(zod_1.z.object({
        test: zod_1.z.string(),
        result: zod_1.z.string(),
        normalRange: zod_1.z.string().optional()
    })).optional(),
    attachments: zod_1.z.array(zod_1.z.string()).optional(),
    isConfidential: zod_1.z.boolean()["default"](false)
});
// Schema para búsqueda de récords médicos
var MedicalRecordSearchSchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(function (val) { return val ? parseInt(val) : undefined; }),
    limit: zod_1.z.string().optional().transform(function (val) { return val ? parseInt(val) : undefined; }),
    patientId: zod_1.z.string().optional(),
    doctorId: zod_1.z.string().optional(),
    type: zod_1.z["enum"](['consultation', 'diagnosis', 'treatment', 'lab_result', 'imaging', 'surgery', 'emergency']).optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    search: zod_1.z.string().optional()
});
function GET(request) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    return __awaiter(this, void 0, void 0, function () {
        var searchParams, queryParams, searchData, _o, page, limit, query, startDate, endDate, totalSnapshot, total, offset, snapshot, medicalRecords, _i, _p, doc, recordData, searchTerm, searchableText, _q, doctorDoc, patientDoc, meta, error_1;
        return __generator(this, function (_r) {
            switch (_r.label) {
                case 0:
                    _r.trys.push([0, 7, , 8]);
                    searchParams = new URL(request.url).searchParams;
                    queryParams = Object.fromEntries(searchParams.entries());
                    searchData = MedicalRecordSearchSchema.parse(queryParams);
                    _o = shared_1.validatePagination({
                        page: searchData.page,
                        limit: searchData.limit
                    }), page = _o.page, limit = _o.limit;
                    query = firebase_1.adminDb.collection('medical_records');
                    // Aplicar filtros
                    if (searchData.patientId) {
                        query = query.where('patientId', '==', searchData.patientId);
                    }
                    if (searchData.doctorId) {
                        query = query.where('doctorId', '==', searchData.doctorId);
                    }
                    if (searchData.type) {
                        query = query.where('type', '==', searchData.type);
                    }
                    // Filtros por fecha
                    if (searchData.startDate && searchData.endDate) {
                        startDate = new Date(searchData.startDate);
                        endDate = new Date(searchData.endDate);
                        query = query.where('createdAt', '>=', startDate).where('createdAt', '<=', endDate);
                    }
                    // Ordenar por fecha de creación
                    query = query.orderBy('createdAt', 'desc');
                    return [4 /*yield*/, query.get()];
                case 1:
                    totalSnapshot = _r.sent();
                    total = totalSnapshot.size;
                    offset = (page - 1) * limit;
                    query = query.offset(offset).limit(limit);
                    return [4 /*yield*/, query.get()];
                case 2:
                    snapshot = _r.sent();
                    medicalRecords = [];
                    _i = 0, _p = snapshot.docs;
                    _r.label = 3;
                case 3:
                    if (!(_i < _p.length)) return [3 /*break*/, 6];
                    doc = _p[_i];
                    recordData = doc.data();
                    // Aplicar filtro de búsqueda por texto (post-query)
                    if (searchData.search) {
                        searchTerm = searchData.search.toLowerCase();
                        searchableText = (recordData.title + " " + recordData.description).toLowerCase();
                        if (!searchableText.includes(searchTerm)) {
                            return [3 /*break*/, 5];
                        }
                    }
                    return [4 /*yield*/, Promise.all([
                            firebase_1.adminDb.collection('users').doc(recordData.doctorId).get(),
                            firebase_1.adminDb.collection('users').doc(recordData.patientId).get(),
                        ])];
                case 4:
                    _q = _r.sent(), doctorDoc = _q[0], patientDoc = _q[1];
                    medicalRecords.push(__assign(__assign({ id: doc.id }, recordData), { createdAt: (_c = (_b = (_a = recordData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : recordData.createdAt, updatedAt: (_f = (_e = (_d = recordData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) !== null && _f !== void 0 ? _f : recordData.updatedAt, doctor: doctorDoc.exists ? {
                            id: recordData.doctorId,
                            firstName: (_g = doctorDoc.data()) === null || _g === void 0 ? void 0 : _g.firstName,
                            lastName: (_h = doctorDoc.data()) === null || _h === void 0 ? void 0 : _h.lastName,
                            email: (_j = doctorDoc.data()) === null || _j === void 0 ? void 0 : _j.email
                        } : null, patient: patientDoc.exists ? {
                            id: recordData.patientId,
                            firstName: (_k = patientDoc.data()) === null || _k === void 0 ? void 0 : _k.firstName,
                            lastName: (_l = patientDoc.data()) === null || _l === void 0 ? void 0 : _l.lastName,
                            email: (_m = patientDoc.data()) === null || _m === void 0 ? void 0 : _m.email
                        } : null }));
                    _r.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    meta = shared_1.createPaginationMeta(page, limit, total);
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse(medicalRecords, meta), { status: 200 })];
                case 7:
                    error_1 = _r.sent();
                    console.error('Error fetching medical records:', error_1);
                    if (error_1 instanceof zod_1.z.ZodError) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', 'Parámetros de búsqueda inválidos', error_1.errors), { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('FETCH_MEDICAL_RECORDS_FAILED', 'Error al obtener récords médicos'), { status: 500 })];
                case 8: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
function POST(request) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, body, recordData, _g, doctorDoc, patientDoc, now, medicalRecord, docRef, error_2;
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
                    recordData = CreateMedicalRecordSchema.parse(body);
                    return [4 /*yield*/, Promise.all([
                            firebase_1.adminDb.collection('users').doc(recordData.doctorId).get(),
                            firebase_1.adminDb.collection('users').doc(recordData.patientId).get(),
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
                    medicalRecord = __assign(__assign({}, recordData), { recordNumber: "MR-" + Date.now(), digitalSignature: "DR_" + recordData.doctorId + "_" + Date.now(), encrypted: true, createdAt: now, updatedAt: now });
                    return [4 /*yield*/, firebase_1.adminDb.collection('medical_records').add(medicalRecord)];
                case 3:
                    docRef = _h.sent();
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse(__assign(__assign({ id: docRef.id }, medicalRecord), { doctor: {
                                id: recordData.doctorId,
                                firstName: (_a = doctorDoc.data()) === null || _a === void 0 ? void 0 : _a.firstName,
                                lastName: (_b = doctorDoc.data()) === null || _b === void 0 ? void 0 : _b.lastName,
                                email: (_c = doctorDoc.data()) === null || _c === void 0 ? void 0 : _c.email
                            }, patient: {
                                id: recordData.patientId,
                                firstName: (_d = patientDoc.data()) === null || _d === void 0 ? void 0 : _d.firstName,
                                lastName: (_e = patientDoc.data()) === null || _e === void 0 ? void 0 : _e.lastName,
                                email: (_f = patientDoc.data()) === null || _f === void 0 ? void 0 : _f.email
                            } })), { status: 201 })];
                case 4:
                    error_2 = _h.sent();
                    console.error('Error creating medical record:', error_2);
                    if (error_2 instanceof zod_1.z.ZodError) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', 'Datos del récord médico inválidos', error_2.errors), { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('CREATE_MEDICAL_RECORD_FAILED', 'Error al crear récord médico'), { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
