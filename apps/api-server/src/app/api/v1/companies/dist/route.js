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
// Schema para crear empresa
var CreateCompanySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nombre de la empresa es requerido'),
    description: zod_1.z.string().optional(),
    type: zod_1.z["enum"](['clinic', 'hospital', 'healthcare_network', 'insurance', 'pharmacy']),
    address: zod_1.z.object({
        street: zod_1.z.string(),
        city: zod_1.z.string(),
        state: zod_1.z.string(),
        zipCode: zod_1.z.string(),
        country: zod_1.z.string()["default"]('Mexico')
    }),
    contact: zod_1.z.object({
        phone: zod_1.z.string(),
        email: zod_1.z.string().email(),
        website: zod_1.z.string().url().optional()
    }),
    specialties: zod_1.z.array(zod_1.z.string()).optional(),
    numberOfEmployees: zod_1.z.number().min(1).optional(),
    licenseNumber: zod_1.z.string().optional(),
    isVerified: zod_1.z.boolean()["default"](false)
});
// Schema para búsqueda de empresas
var CompanySearchSchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(function (val) { return val ? parseInt(val) : undefined; }),
    limit: zod_1.z.string().optional().transform(function (val) { return val ? parseInt(val) : undefined; }),
    type: zod_1.z["enum"](['clinic', 'hospital', 'healthcare_network', 'insurance', 'pharmacy']).optional(),
    city: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    isVerified: zod_1.z.boolean().optional(),
    search: zod_1.z.string().optional(),
    specialty: zod_1.z.string().optional()
});
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var searchParams, queryParams, searchData_1, _a, page, limit, query, totalSnapshot, companies, searchTerm_1, total, startIndex, endIndex, paginatedCompanies, enrichedCompanies, meta, error_1;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    searchParams = new URL(request.url).searchParams;
                    queryParams = Object.fromEntries(searchParams.entries());
                    searchData_1 = CompanySearchSchema.parse(queryParams);
                    _a = shared_1.validatePagination({
                        page: searchData_1.page,
                        limit: searchData_1.limit
                    }), page = _a.page, limit = _a.limit;
                    query = firebase_1.adminDb.collection('companies');
                    // Aplicar filtros
                    if (searchData_1.type) {
                        query = query.where('type', '==', searchData_1.type);
                    }
                    if (searchData_1.isVerified !== undefined) {
                        query = query.where('isVerified', '==', searchData_1.isVerified);
                    }
                    // Ordenar por fecha de creación
                    query = query.orderBy('createdAt', 'desc');
                    return [4 /*yield*/, query.get()];
                case 1:
                    totalSnapshot = _b.sent();
                    companies = totalSnapshot.docs.map(function (doc) {
                        var _a, _b, _c, _d, _e, _f;
                        return (__assign(__assign({ id: doc.id }, doc.data()), { createdAt: (_c = (_b = (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : doc.data().createdAt, updatedAt: (_f = (_e = (_d = doc.data().updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) !== null && _f !== void 0 ? _f : doc.data().updatedAt }));
                    });
                    // Aplicar filtros post-query
                    if (searchData_1.search) {
                        searchTerm_1 = searchData_1.search.toLowerCase();
                        companies = companies.filter(function (company) {
                            var _a, _b;
                            return company.name.toLowerCase().includes(searchTerm_1) || ((_a = company.description) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchTerm_1)) || ((_b = company.address) === null || _b === void 0 ? void 0 : _b.city.toLowerCase().includes(searchTerm_1));
                        });
                    }
                    if (searchData_1.city) {
                        companies = companies.filter(function (company) { var _a; return (_a = company.address) === null || _a === void 0 ? void 0 : _a.city.toLowerCase().includes(searchData_1.city.toLowerCase()); });
                    }
                    if (searchData_1.state) {
                        companies = companies.filter(function (company) { var _a; return (_a = company.address) === null || _a === void 0 ? void 0 : _a.state.toLowerCase().includes(searchData_1.state.toLowerCase()); });
                    }
                    if (searchData_1.specialty) {
                        companies = companies.filter(function (company) { var _a; return (_a = company.specialties) === null || _a === void 0 ? void 0 : _a.some(function (spec) {
                            return spec.toLowerCase().includes(searchData_1.specialty.toLowerCase());
                        }); });
                    }
                    total = companies.length;
                    startIndex = (page - 1) * limit;
                    endIndex = startIndex + limit;
                    paginatedCompanies = companies.slice(startIndex, endIndex);
                    return [4 /*yield*/, Promise.all(paginatedCompanies.map(function (company) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, doctorsSnapshot, jobsSnapshot;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, Promise.all([
                                            firebase_1.adminDb.collection('doctors').where('companyId', '==', company.id).get(),
                                            firebase_1.adminDb.collection('job-listings').where('companyId', '==', company.id).get(),
                                        ])];
                                    case 1:
                                        _a = _b.sent(), doctorsSnapshot = _a[0], jobsSnapshot = _a[1];
                                        return [2 /*return*/, __assign(__assign({}, company), { stats: {
                                                    doctorsCount: doctorsSnapshot.size,
                                                    activeJobsCount: jobsSnapshot.docs.filter(function (doc) { return doc.data().status === 'active'; }).length,
                                                    totalJobsCount: jobsSnapshot.size
                                                } })];
                                }
                            });
                        }); }))];
                case 2:
                    enrichedCompanies = _b.sent();
                    meta = shared_1.createPaginationMeta(page, limit, total);
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse(enrichedCompanies, meta), { status: 200 })];
                case 3:
                    error_1 = _b.sent();
                    console.error('Error fetching companies:', error_1);
                    if (error_1 instanceof zod_1.z.ZodError) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', 'Parámetros de búsqueda inválidos', error_1.errors), { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('FETCH_COMPANIES_FAILED', 'Error al obtener empresas'), { status: 500 })];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, body, companyData, existingCompany, now, company, docRef, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    authHeader = request.headers.get('Authorization');
                    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'), { status: 401 })];
                    }
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _a.sent();
                    companyData = CreateCompanySchema.parse(body);
                    return [4 /*yield*/, firebase_1.adminDb
                            .collection('companies')
                            .where('name', '==', companyData.name)
                            .get()];
                case 2:
                    existingCompany = _a.sent();
                    if (!existingCompany.empty) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('COMPANY_EXISTS', 'Ya existe una empresa con este nombre'), { status: 409 })];
                    }
                    now = new Date();
                    company = __assign(__assign({}, companyData), { createdAt: now, updatedAt: now, stats: {
                            doctorsCount: 0,
                            totalJobsCount: 0,
                            activeJobsCount: 0
                        } });
                    return [4 /*yield*/, firebase_1.adminDb.collection('companies').add(company)];
                case 3:
                    docRef = _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse(__assign({ id: docRef.id }, company)), { status: 201 })];
                case 4:
                    error_2 = _a.sent();
                    console.error('Error creating company:', error_2);
                    if (error_2 instanceof zod_1.z.ZodError) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', 'Datos de empresa inválidos', error_2.errors), { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('CREATE_COMPANY_FAILED', 'Error al crear empresa'), { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
