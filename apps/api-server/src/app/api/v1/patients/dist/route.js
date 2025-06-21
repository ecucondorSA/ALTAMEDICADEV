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
var types_1 = require("@altamedica/types");
var server_1 = require("next/server");
var zod_1 = require("zod");
// Schema para query parameters de búsqueda de pacientes
var PatientSearchSchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(function (val) { return val ? parseInt(val) : undefined; }),
    limit: zod_1.z.string().optional().transform(function (val) { return val ? parseInt(val) : undefined; }),
    gender: zod_1.z["enum"](['male', 'female', 'other']).optional(),
    bloodType: zod_1.z["enum"](['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
    city: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    isActive: zod_1.z.string().optional().transform(function (val) { return val === 'true'; }),
    hasInsurance: zod_1.z.string().optional().transform(function (val) { return val === 'true'; })
});
function GET(request) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    return __awaiter(this, void 0, void 0, function () {
        var searchParams, queryParams, searchData, _k, page, limit, query, totalSnapshot, total, offset, snapshot, patients, _i, _l, doc, patientData, searchTerm, searchableText, hasInsurance, userDoc, userData, meta, error_1;
        return __generator(this, function (_m) {
            switch (_m.label) {
                case 0:
                    _m.trys.push([0, 7, , 8]);
                    searchParams = new URL(request.url).searchParams;
                    queryParams = Object.fromEntries(searchParams.entries());
                    searchData = PatientSearchSchema.parse(queryParams);
                    _k = shared_1.validatePagination({
                        page: searchData.page,
                        limit: searchData.limit
                    }), page = _k.page, limit = _k.limit;
                    query = firebase_1.adminDb.collection('patients');
                    // Aplicar filtros
                    if (searchData.gender) {
                        query = query.where('gender', '==', searchData.gender);
                    }
                    if (searchData.bloodType) {
                        query = query.where('bloodType', '==', searchData.bloodType);
                    }
                    if (searchData.isActive !== undefined) {
                        query = query.where('isActive', '==', searchData.isActive);
                    }
                    // Ordenar por fecha de creación
                    query = query.orderBy('createdAt', 'desc');
                    return [4 /*yield*/, query.get()];
                case 1:
                    totalSnapshot = _m.sent();
                    total = totalSnapshot.size;
                    offset = (page - 1) * limit;
                    query = query.offset(offset).limit(limit);
                    return [4 /*yield*/, query.get()];
                case 2:
                    snapshot = _m.sent();
                    patients = [];
                    _i = 0, _l = snapshot.docs;
                    _m.label = 3;
                case 3:
                    if (!(_i < _l.length)) return [3 /*break*/, 6];
                    doc = _l[_i];
                    patientData = doc.data();
                    // Aplicar filtro de búsqueda por texto (post-query)
                    if (searchData.search) {
                        searchTerm = searchData.search.toLowerCase();
                        searchableText = (((_a = patientData.firstName) !== null && _a !== void 0 ? _a : '') + " " + ((_b = patientData.lastName) !== null && _b !== void 0 ? _b : '') + " " + ((_c = patientData.email) !== null && _c !== void 0 ? _c : '')).toLowerCase();
                        if (!searchableText.includes(searchTerm)) {
                            return [3 /*break*/, 5];
                        }
                    }
                    // Aplicar filtro de seguro (post-query)
                    if (searchData.hasInsurance !== undefined) {
                        hasInsurance = patientData.insurance && Object.keys(patientData.insurance).length > 0;
                        if (searchData.hasInsurance && !hasInsurance)
                            return [3 /*break*/, 5];
                        if (!searchData.hasInsurance && hasInsurance)
                            return [3 /*break*/, 5];
                    }
                    return [4 /*yield*/, firebase_1.adminDb.collection('users').doc(doc.id).get()];
                case 4:
                    userDoc = _m.sent();
                    userData = userDoc.data();
                    if (userData) {
                        patients.push(__assign(__assign({ id: doc.id }, patientData), { 
                            // Incluir datos del usuario (datos no sensibles)
                            firstName: userData.firstName, lastName: userData.lastName, email: userData.email, phone: userData.phone, avatar: userData.avatar, isActive: userData.isActive, createdAt: (_f = (_e = (_d = patientData.createdAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) !== null && _f !== void 0 ? _f : patientData.createdAt, updatedAt: (_j = (_h = (_g = patientData.updatedAt) === null || _g === void 0 ? void 0 : _g.toDate) === null || _h === void 0 ? void 0 : _h.call(_g)) !== null && _j !== void 0 ? _j : patientData.updatedAt }));
                    }
                    _m.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    meta = shared_1.createPaginationMeta(page, limit, total);
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse(patients, meta), { status: 200 })];
                case 7:
                    error_1 = _m.sent();
                    console.error('Error fetching patients:', error_1);
                    if (error_1 instanceof zod_1.z.ZodError) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', 'Parámetros de búsqueda inválidos', error_1.errors), { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('FETCH_PATIENTS_FAILED', 'Error al obtener lista de pacientes'), { status: 500 })];
                case 8: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, body, patientData, userDoc, userData, existingPatient, now, patientProfile, error_2;
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
                    patientData = types_1.CreatePatientProfileSchema.parse(body);
                    return [4 /*yield*/, firebase_1.adminDb.collection('users').doc(body.uid).get()];
                case 2:
                    userDoc = _a.sent();
                    if (!userDoc.exists) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('USER_NOT_FOUND', 'Usuario no encontrado'), { status: 404 })];
                    }
                    userData = userDoc.data();
                    if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'patient') {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('INVALID_ROLE', 'El usuario debe tener rol de paciente'), { status: 400 })];
                    }
                    return [4 /*yield*/, firebase_1.adminDb.collection('patients').doc(body.uid).get()];
                case 3:
                    existingPatient = _a.sent();
                    if (existingPatient.exists) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('PATIENT_PROFILE_EXISTS', 'Ya existe un perfil de paciente para este usuario'), { status: 409 })];
                    }
                    now = new Date();
                    patientProfile = __assign(__assign({}, patientData), { isActive: true, createdAt: now, updatedAt: now });
                    return [4 /*yield*/, firebase_1.adminDb.collection('patients').doc(body.uid).set(patientProfile)];
                case 4:
                    _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse(__assign(__assign({ id: body.uid }, patientProfile), { 
                            // Incluir datos del usuario
                            firstName: userData.firstName, lastName: userData.lastName, email: userData.email, phone: userData.phone, avatar: userData.avatar })), { status: 201 })];
                case 5:
                    error_2 = _a.sent();
                    console.error('Error creating patient profile:', error_2);
                    if (error_2 instanceof zod_1.z.ZodError) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', 'Datos del paciente inválidos', error_2.errors), { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('CREATE_PATIENT_FAILED', 'Error al crear perfil de paciente'), { status: 500 })];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
