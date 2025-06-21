"use strict";
/**
 * 💼 JOB LISTINGS API
 * CRUD operations for medical job positions
 *
 * GET /api/v1/job-listings - List all job listings with filters
 * POST /api/v1/job-listings - Create new job listing
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
 * GET /api/v1/job-listings
 * List job listings with advanced filtering
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var searchParams, page, limit, specialty, location, type, experience, remote, company_id, status, sort, order, query, offset, snapshot, job_listings, totalSnapshot, total, filteredListings, locationLower_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    searchParams = new URL(request.url).searchParams;
                    page = parseInt(searchParams.get('page') || '1');
                    limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
                    specialty = searchParams.get('specialty');
                    location = searchParams.get('location');
                    type = searchParams.get('type');
                    experience = searchParams.get('experience');
                    remote = searchParams.get('remote') === 'true';
                    company_id = searchParams.get('company_id');
                    status = searchParams.get('status') || 'active';
                    sort = searchParams.get('sort') || 'posted_at';
                    order = searchParams.get('order') || 'desc';
                    query = db.collection('job_listings');
                    // Apply filters
                    if (specialty) {
                        query = query.where('position.specialty', '==', specialty);
                    }
                    if (type) {
                        query = query.where('position.type', '==', type);
                    }
                    if (experience) {
                        query = query.where('position.experience_level', '==', experience);
                    }
                    if (remote) {
                        query = query.where('location.remote', '==', true);
                    }
                    if (company_id) {
                        query = query.where('company.id', '==', company_id);
                    }
                    if (status) {
                        query = query.where('status', '==', status);
                    } // Apply sorting
                    query = query.orderBy(sort, order);
                    offset = (page - 1) * limit;
                    query = query.offset(offset).limit(limit);
                    return [4 /*yield*/, query.get()];
                case 1:
                    snapshot = _a.sent();
                    job_listings = snapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                    return [4 /*yield*/, db.collection('job_listings')
                            .where('status', '==', status)
                            .get()];
                case 2:
                    totalSnapshot = _a.sent();
                    total = totalSnapshot.size;
                    filteredListings = job_listings;
                    if (location) {
                        locationLower_1 = location.toLowerCase();
                        filteredListings = job_listings.filter(function (job) {
                            return job.location.city.toLowerCase().includes(locationLower_1) ||
                                job.location.state.toLowerCase().includes(locationLower_1) ||
                                job.location.country.toLowerCase().includes(locationLower_1);
                        });
                    }
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                job_listings: filteredListings,
                                pagination: {
                                    page: page,
                                    limit: limit,
                                    total: total,
                                    pages: Math.ceil(total / limit),
                                    has_next: page * limit < total,
                                    has_prev: page > 1
                                },
                                filters: {
                                    specialty: specialty,
                                    location: location,
                                    type: type,
                                    experience: experience,
                                    remote: remote,
                                    company_id: company_id,
                                    status: status
                                }
                            }
                        })];
                case 3:
                    error_1 = _a.sent();
                    console.error('Job listings fetch error:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: 'Failed to fetch job listings'
                        }, { status: 500 })];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
/**
 * POST /api/v1/job-listings
 * Create new job listing (Companies/Admins only)
 */
function POST(request) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function () {
        var authResult, body, requiredFields, _i, requiredFields_1, field, companyDoc, companyData, now, expiresAt, jobListing, docRef, error_2;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, simple_auth_1.verifyAuthToken(request)];
                case 1:
                    authResult = _d.sent();
                    if (!authResult.success || !authResult.user) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Authentication required'
                            }, { status: 401 })];
                    }
                    // Check permissions (admin or company representative)
                    if (!['admin', 'company'].includes(authResult.user.role)) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Insufficient permissions'
                            }, { status: 403 })];
                    }
                    return [4 /*yield*/, request.json()];
                case 2:
                    body = _d.sent();
                    requiredFields = ['title', 'description', 'company', 'location', 'position'];
                    for (_i = 0, requiredFields_1 = requiredFields; _i < requiredFields_1.length; _i++) {
                        field = requiredFields_1[_i];
                        if (!body[field]) {
                            return [2 /*return*/, server_1.NextResponse.json({
                                    success: false,
                                    error: "Missing required field: " + field
                                }, { status: 400 })];
                        }
                    }
                    return [4 /*yield*/, db.collection('companies').doc(body.company.id).get()];
                case 3:
                    companyDoc = _d.sent();
                    if (!companyDoc.exists) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Company not found'
                            }, { status: 400 })];
                    }
                    companyData = companyDoc.data();
                    now = new Date().toISOString();
                    expiresAt = body.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                    jobListing = {
                        title: body.title,
                        description: body.description,
                        company: {
                            id: body.company.id,
                            name: (companyData === null || companyData === void 0 ? void 0 : companyData.name) || body.company.name,
                            logo: (companyData === null || companyData === void 0 ? void 0 : companyData.logo) || body.company.logo
                        },
                        location: {
                            city: body.location.city,
                            state: body.location.state,
                            country: body.location.country,
                            remote: body.location.remote || false
                        },
                        position: {
                            type: body.position.type || 'full_time',
                            specialty: body.position.specialty,
                            experience_level: body.position.experience_level || 'mid',
                            salary: {
                                min: ((_a = body.position.salary) === null || _a === void 0 ? void 0 : _a.min) || 0,
                                max: ((_b = body.position.salary) === null || _b === void 0 ? void 0 : _b.max) || 0,
                                currency: ((_c = body.position.salary) === null || _c === void 0 ? void 0 : _c.currency) || 'USD'
                            }
                        },
                        requirements: body.requirements || [],
                        benefits: body.benefits || [],
                        status: 'active',
                        posted_at: now,
                        expires_at: expiresAt,
                        applications_count: 0,
                        created_at: now,
                        updated_at: now
                    };
                    return [4 /*yield*/, db.collection('job_listings').add(jobListing)];
                case 4:
                    docRef = _d.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: __assign({ id: docRef.id }, jobListing),
                            message: 'Job listing created successfully'
                        }, { status: 201 })];
                case 5:
                    error_2 = _d.sent();
                    console.error('Job listing creation error:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: 'Failed to create job listing'
                        }, { status: 500 })];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
