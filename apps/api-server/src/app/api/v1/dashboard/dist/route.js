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
exports.GET = void 0;
var firebase_1 = require("@altamedica/firebase");
var shared_1 = require("@altamedica/shared");
var server_1 = require("next/server");
var zod_1 = require("zod");
// Schema para query de dashboard
var DashboardQuerySchema = zod_1.z.object({
    role: zod_1.z["enum"](['doctor', 'patient', 'admin']).optional(),
    period: zod_1.z["enum"](['today', 'week', 'month', 'year']).optional()["default"]('week')
});
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var searchParams, queryParams, queryData, now_1, startDate, endDate, dayOfWeek, _a, doctorsSnapshot, patientsSnapshot, appointmentsSnapshot, prescriptionsSnapshot, appointments, prescriptions, dashboardData, completedAppointments, upcomingAppointments, upcomingAppointments, activePrescriptions, totalDoctors, totalPatients, verifiedDoctors, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    searchParams = new URL(request.url).searchParams;
                    queryParams = Object.fromEntries(searchParams.entries());
                    queryData = DashboardQuerySchema.parse(queryParams);
                    now_1 = new Date();
                    startDate = void 0;
                    endDate = new Date(now_1);
                    switch (queryData.period) {
                        case 'today':
                            startDate = new Date(now_1.getFullYear(), now_1.getMonth(), now_1.getDate());
                            break;
                        case 'week':
                            dayOfWeek = now_1.getDay();
                            startDate = new Date(now_1);
                            startDate.setDate(now_1.getDate() - dayOfWeek);
                            startDate.setHours(0, 0, 0, 0);
                            break;
                        case 'month':
                            startDate = new Date(now_1.getFullYear(), now_1.getMonth(), 1);
                            break;
                        case 'year':
                            startDate = new Date(now_1.getFullYear(), 0, 1);
                            break;
                        default:
                            startDate = new Date(now_1.getFullYear(), now_1.getMonth(), 1);
                    }
                    return [4 /*yield*/, Promise.all([
                            firebase_1.adminDb.collection('doctors').get(),
                            firebase_1.adminDb.collection('patients').get(),
                            firebase_1.adminDb.collection('appointments')
                                .where('scheduledAt', '>=', startDate)
                                .where('scheduledAt', '<=', endDate)
                                .get(),
                            firebase_1.adminDb.collection('prescriptions')
                                .where('createdAt', '>=', startDate)
                                .where('createdAt', '<=', endDate)
                                .get()
                        ])];
                case 1:
                    _a = _b.sent(), doctorsSnapshot = _a[0], patientsSnapshot = _a[1], appointmentsSnapshot = _a[2], prescriptionsSnapshot = _a[3];
                    appointments = appointmentsSnapshot.docs.map(function (doc) {
                        var _a, _b, _c;
                        return (__assign(__assign({ id: doc.id }, doc.data()), { scheduledAt: (_c = (_b = (_a = doc.data().scheduledAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : doc.data().scheduledAt }));
                    });
                    prescriptions = prescriptionsSnapshot.docs.map(function (doc) {
                        var _a, _b, _c;
                        return (__assign(__assign({ id: doc.id }, doc.data()), { createdAt: (_c = (_b = (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : doc.data().createdAt }));
                    });
                    dashboardData = void 0;
                    if (queryData.role === 'doctor') {
                        completedAppointments = appointments.filter(function (apt) { return apt.status === 'completed'; });
                        upcomingAppointments = appointments.filter(function (apt) {
                            return ['scheduled', 'confirmed'].includes(apt.status) &&
                                new Date(apt.scheduledAt) > now_1;
                        });
                        dashboardData = {
                            overview: {
                                totalAppointments: appointments.length,
                                completedAppointments: completedAppointments.length,
                                upcomingAppointments: upcomingAppointments.length,
                                prescriptionsIssued: prescriptions.length
                            },
                            recentActivity: appointments
                                .sort(function (a, b) { return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(); })
                                .slice(0, 5),
                            upcomingToday: upcomingAppointments
                                .filter(function (apt) {
                                var aptDate = new Date(apt.scheduledAt);
                                return aptDate.toDateString() === now_1.toDateString();
                            })
                                .slice(0, 3)
                        };
                    }
                    else if (queryData.role === 'patient') {
                        upcomingAppointments = appointments.filter(function (apt) {
                            return ['scheduled', 'confirmed'].includes(apt.status) &&
                                new Date(apt.scheduledAt) > now_1;
                        });
                        activePrescriptions = prescriptions.filter(function (pres) {
                            var _a, _b, _c;
                            var validUntil = (_c = (_b = (_a = pres.validUntil) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : new Date(pres.validUntil);
                            return validUntil > now_1 && pres.status !== 'cancelled';
                        });
                        dashboardData = {
                            overview: {
                                upcomingAppointments: upcomingAppointments.length,
                                activePrescriptions: activePrescriptions.length,
                                completedAppointments: appointments.filter(function (apt) { return apt.status === 'completed'; }).length
                            },
                            nextAppointment: upcomingAppointments[0] || null,
                            activePrescriptions: activePrescriptions.slice(0, 3),
                            recentActivity: appointments
                                .sort(function (a, b) { return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(); })
                                .slice(0, 5)
                        };
                    }
                    else {
                        totalDoctors = doctorsSnapshot.size;
                        totalPatients = patientsSnapshot.size;
                        verifiedDoctors = doctorsSnapshot.docs.filter(function (doc) { return doc.data().isVerified; }).length;
                        dashboardData = {
                            overview: {
                                totalDoctors: totalDoctors,
                                totalPatients: totalPatients,
                                verifiedDoctors: verifiedDoctors,
                                totalAppointments: appointments.length,
                                totalPrescriptions: prescriptions.length
                            },
                            appointmentsByStatus: appointments.reduce(function (acc, apt) {
                                acc[apt.status] = (acc[apt.status] || 0) + 1;
                                return acc;
                            }, {}),
                            dailyStats: generateDailyStats(appointments, startDate, endDate),
                            recentRegistrations: {
                                doctors: doctorsSnapshot.docs
                                    .sort(function (a, b) {
                                    var _a, _b, _c, _d, _e, _f;
                                    var aDate = (_c = (_b = (_a = a.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : new Date(a.data().createdAt);
                                    var bDate = (_f = (_e = (_d = b.data().createdAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) !== null && _f !== void 0 ? _f : new Date(b.data().createdAt);
                                    return bDate.getTime() - aDate.getTime();
                                })
                                    .slice(0, 5)
                                    .map(function (doc) { return (__assign({ id: doc.id }, doc.data())); }),
                                patients: patientsSnapshot.docs
                                    .sort(function (a, b) {
                                    var _a, _b, _c, _d, _e, _f;
                                    var aDate = (_c = (_b = (_a = a.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : new Date(a.data().createdAt);
                                    var bDate = (_f = (_e = (_d = b.data().createdAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) !== null && _f !== void 0 ? _f : new Date(b.data().createdAt);
                                    return bDate.getTime() - aDate.getTime();
                                })
                                    .slice(0, 5)
                                    .map(function (doc) { return (__assign({ id: doc.id }, doc.data())); })
                            }
                        };
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse({
                            period: queryData.period,
                            dateRange: {
                                start: startDate.toISOString(),
                                end: endDate.toISOString()
                            },
                            data: dashboardData
                        }), { status: 200 })];
                case 2:
                    error_1 = _b.sent();
                    console.error('Error fetching dashboard data:', error_1);
                    if (error_1 instanceof zod_1.z.ZodError) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', 'Parámetros de consulta inválidos', error_1.errors), { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('FETCH_DASHBOARD_FAILED', 'Error al obtener datos del dashboard'), { status: 500 })];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
// Helper function para generar estadísticas diarias
function generateDailyStats(appointments, startDate, endDate) {
    var dailyStats = {};
    var currentDate = new Date(startDate);
    var _loop_1 = function () {
        var dateKey = currentDate.toISOString().split('T')[0];
        var dayAppointments = appointments.filter(function (apt) {
            var aptDate = new Date(apt.scheduledAt);
            return aptDate.toISOString().split('T')[0] === dateKey;
        });
        dailyStats[dateKey] = {
            date: dateKey,
            total: dayAppointments.length,
            completed: dayAppointments.filter(function (apt) { return apt.status === 'completed'; }).length,
            cancelled: dayAppointments.filter(function (apt) { return apt.status === 'cancelled'; }).length
        };
        currentDate.setDate(currentDate.getDate() + 1);
    };
    while (currentDate <= endDate) {
        _loop_1();
    }
    return Object.values(dailyStats);
}
