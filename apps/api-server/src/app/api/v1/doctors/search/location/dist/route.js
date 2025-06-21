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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.GET = void 0;
var firebase_1 = require("@altamedica/firebase");
var shared_1 = require("@altamedica/shared");
var server_1 = require("next/server");
var zod_1 = require("zod");
// Schema para búsqueda por ubicación
var LocationSearchSchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(function (val) { return val ? parseInt(val) : undefined; }),
    limit: zod_1.z.string().optional().transform(function (val) { return val ? parseInt(val) : undefined; }),
    latitude: zod_1.z.string().transform(function (val) { return parseFloat(val); }),
    longitude: zod_1.z.string().transform(function (val) { return parseFloat(val); }),
    radiusKm: zod_1.z.string().optional().transform(function (val) { return val ? parseFloat(val) : 10; }),
    specialty: zod_1.z.string().optional(),
    isVerified: zod_1.z.string().optional().transform(function (val) { return val === 'true'; }),
    minRating: zod_1.z.string().optional().transform(function (val) { return val ? parseFloat(val) : undefined; }),
    sortBy: zod_1.z["enum"](['distance', 'rating', 'reviews', 'price']).optional()["default"]('distance')
});
// Función para calcular distancia entre dos puntos geográficos
function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radio de la Tierra en km
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function GET(request) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function () {
        var searchParams, queryParams, searchData_1, _g, page, limit, latitude, longitude, radiusKm, query, snapshot, doctorsWithDistance, _i, _h, doc, doctorData, userDoc, userData, distance, clinicInfo, clinicDoc, clinicData, error_1, total, startIndex, endIndex, paginatedDoctors, stats, meta, error_2;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    _j.trys.push([0, 10, , 11]);
                    searchParams = new URL(request.url).searchParams;
                    queryParams = Object.fromEntries(searchParams.entries());
                    searchData_1 = LocationSearchSchema.parse(queryParams);
                    _g = shared_1.validatePagination({
                        page: searchData_1.page,
                        limit: searchData_1.limit
                    }), page = _g.page, limit = _g.limit;
                    latitude = searchData_1.latitude, longitude = searchData_1.longitude, radiusKm = searchData_1.radiusKm;
                    query = firebase_1.adminDb.collection('doctors');
                    // Aplicar filtros
                    if (searchData_1.specialty) {
                        query = query.where('specialties', 'array-contains', searchData_1.specialty);
                    }
                    if (searchData_1.isVerified !== undefined) {
                        query = query.where('isVerified', '==', searchData_1.isVerified);
                    }
                    if (searchData_1.minRating !== undefined) {
                        query = query.where('rating', '>=', searchData_1.minRating);
                    }
                    return [4 /*yield*/, query.get()];
                case 1:
                    snapshot = _j.sent();
                    doctorsWithDistance = [];
                    _i = 0, _h = snapshot.docs;
                    _j.label = 2;
                case 2:
                    if (!(_i < _h.length)) return [3 /*break*/, 9];
                    doc = _h[_i];
                    doctorData = doc.data();
                    return [4 /*yield*/, firebase_1.adminDb.collection('users').doc(doc.id).get()];
                case 3:
                    userDoc = _j.sent();
                    userData = userDoc.data();
                    if (!(doctorData.location && doctorData.location.latitude && doctorData.location.longitude)) return [3 /*break*/, 8];
                    distance = calculateDistance(latitude, longitude, doctorData.location.latitude, doctorData.location.longitude);
                    if (!(distance <= radiusKm)) return [3 /*break*/, 8];
                    clinicInfo = null;
                    if (!doctorData.clinicId) return [3 /*break*/, 7];
                    _j.label = 4;
                case 4:
                    _j.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, firebase_1.adminDb.collection('clinics').doc(doctorData.clinicId).get()];
                case 5:
                    clinicDoc = _j.sent();
                    if (clinicDoc.exists) {
                        clinicData = clinicDoc.data();
                        clinicInfo = {
                            id: doctorData.clinicId,
                            name: clinicData === null || clinicData === void 0 ? void 0 : clinicData.name,
                            address: clinicData === null || clinicData === void 0 ? void 0 : clinicData.address,
                            phone: clinicData === null || clinicData === void 0 ? void 0 : clinicData.phone,
                            facilities: clinicData === null || clinicData === void 0 ? void 0 : clinicData.facilities
                        };
                    }
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _j.sent();
                    console.error('Error fetching clinic data:', error_1);
                    return [3 /*break*/, 7];
                case 7:
                    doctorsWithDistance.push(__assign(__assign({ id: doc.id, distance: Math.round(distance * 100) / 100 }, doctorData), { 
                        // Datos del usuario
                        firstName: userData === null || userData === void 0 ? void 0 : userData.firstName, lastName: userData === null || userData === void 0 ? void 0 : userData.lastName, email: userData === null || userData === void 0 ? void 0 : userData.email, phone: userData === null || userData === void 0 ? void 0 : userData.phone, avatar: userData === null || userData === void 0 ? void 0 : userData.avatar, 
                        // Información de la clínica
                        clinic: clinicInfo, 
                        // Convertir timestamps
                        createdAt: (_c = (_b = (_a = doctorData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : doctorData.createdAt, updatedAt: (_f = (_e = (_d = doctorData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) !== null && _f !== void 0 ? _f : doctorData.updatedAt }));
                    _j.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 2];
                case 9:
                    // Aplicar ordenamiento
                    doctorsWithDistance.sort(function (a, b) {
                        var _a, _b, _c, _d, _e, _f;
                        switch (searchData_1.sortBy) {
                            case 'distance':
                                return a.distance - b.distance;
                            case 'rating':
                                return ((_a = b.rating) !== null && _a !== void 0 ? _a : 0) - ((_b = a.rating) !== null && _b !== void 0 ? _b : 0);
                            case 'reviews':
                                return ((_c = b.reviewCount) !== null && _c !== void 0 ? _c : 0) - ((_d = a.reviewCount) !== null && _d !== void 0 ? _d : 0);
                            case 'price':
                                return ((_e = a.consultationFee) !== null && _e !== void 0 ? _e : 0) - ((_f = b.consultationFee) !== null && _f !== void 0 ? _f : 0);
                            default:
                                return a.distance - b.distance;
                        }
                    });
                    total = doctorsWithDistance.length;
                    startIndex = (page - 1) * limit;
                    endIndex = startIndex + limit;
                    paginatedDoctors = doctorsWithDistance.slice(startIndex, endIndex);
                    stats = {
                        totalDoctors: total,
                        averageDistance: doctorsWithDistance.length > 0
                            ? doctorsWithDistance.reduce(function (sum, doc) { return sum + doc.distance; }, 0) / doctorsWithDistance.length
                            : 0,
                        nearestDoctor: doctorsWithDistance.length > 0 ? doctorsWithDistance[0] : null,
                        specialties: __spreadArrays(new Set(doctorsWithDistance.flatMap(function (doc) { var _a; return (_a = doc.specialties) !== null && _a !== void 0 ? _a : []; }))),
                        searchRadius: radiusKm,
                        searchLocation: { latitude: latitude, longitude: longitude }
                    };
                    meta = shared_1.createPaginationMeta(page, limit, total);
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse({
                            doctors: paginatedDoctors,
                            stats: stats
                        }, meta), { status: 200 })];
                case 10:
                    error_2 = _j.sent();
                    console.error('Error searching doctors by location:', error_2);
                    if (error_2 instanceof zod_1.z.ZodError) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', 'Parámetros de búsqueda inválidos', error_2.errors), { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('LOCATION_SEARCH_FAILED', 'Error en la búsqueda por ubicación'), { status: 500 })];
                case 11: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
