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
exports.POST = void 0;
var firebase_1 = require("@altamedica/firebase");
var shared_1 = require("@altamedica/shared");
var server_1 = require("next/server");
var zod_1 = require("zod");
// Schema para análisis de síntomas
var SymptomAnalysisSchema = zod_1.z.object({
    patientId: zod_1.z.string().min(1, 'ID del paciente es requerido'),
    symptoms: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().min(1, 'Nombre del síntoma requerido'),
        severity: zod_1.z["enum"](['mild', 'moderate', 'severe']),
        duration: zod_1.z.string().min(1, 'Duración requerida'),
        description: zod_1.z.string().optional(),
        bodyPart: zod_1.z.string().optional()
    })).min(1, 'Al menos un síntoma es requerido'),
    patientInfo: zod_1.z.object({
        age: zod_1.z.number().min(0).max(150),
        gender: zod_1.z["enum"](['male', 'female', 'other']),
        medicalHistory: zod_1.z.array(zod_1.z.string()).optional(),
        currentMedications: zod_1.z.array(zod_1.z.string()).optional(),
        allergies: zod_1.z.array(zod_1.z.string()).optional(),
        vitalSigns: zod_1.z.object({
            temperature: zod_1.z.number().optional(),
            bloodPressure: zod_1.z.string().optional(),
            heartRate: zod_1.z.number().optional(),
            respiratoryRate: zod_1.z.number().optional()
        }).optional()
    }),
    urgencyLevel: zod_1.z["enum"](['routine', 'urgent', 'emergency'])["default"]('routine'),
    includeRecommendations: zod_1.z.boolean()["default"](true),
    language: zod_1.z["enum"](['es', 'en'])["default"]('es')
});
// Base de conocimiento médico simplificada (en producción sería una IA real)
var medicalKnowledge = {
    symptoms: {
        'fiebre': {
            conditions: ['infección', 'gripe', 'covid-19', 'infección urinaria'],
            urgency: 'moderate',
            severity_multiplier: 1.2
        },
        'dolor de cabeza': {
            conditions: ['tensión', 'migraña', 'sinusitis', 'hipertensión'],
            urgency: 'low',
            severity_multiplier: 1.0
        },
        'dolor de pecho': {
            conditions: ['infarto', 'angina', 'reflujo', 'ansiedad'],
            urgency: 'high',
            severity_multiplier: 2.0
        },
        'dificultad para respirar': {
            conditions: ['asma', 'neumonía', 'covid-19', 'insuficiencia cardiaca'],
            urgency: 'high',
            severity_multiplier: 2.5
        },
        'náuseas': {
            conditions: ['gastroenteritis', 'embarazo', 'medicamentos', 'migraña'],
            urgency: 'low',
            severity_multiplier: 0.8
        }
    },
    conditions: {
        'infarto': { urgency: 'emergency', specialist: 'cardiología' },
        'neumonía': { urgency: 'urgent', specialist: 'neumología' },
        'covid-19': { urgency: 'urgent', specialist: 'medicina interna' },
        'migraña': { urgency: 'routine', specialist: 'neurología' },
        'asma': { urgency: 'urgent', specialist: 'neumología' }
    }
};
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, body, analysisData, patientDoc, analysis, analysisRecord, docRef, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    authHeader = request.headers.get('Authorization');
                    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'), { status: 401 })];
                    }
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _a.sent();
                    analysisData = SymptomAnalysisSchema.parse(body);
                    return [4 /*yield*/, firebase_1.adminDb.collection('patients').doc(analysisData.patientId).get()];
                case 2:
                    patientDoc = _a.sent();
                    if (!patientDoc.exists) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('PATIENT_NOT_FOUND', 'Paciente no encontrado'), { status: 404 })];
                    }
                    analysis = performSymptomAnalysis(analysisData);
                    analysisRecord = {
                        patientId: analysisData.patientId,
                        symptoms: analysisData.symptoms,
                        analysis: analysis,
                        timestamp: new Date(),
                        language: analysisData.language,
                        urgencyLevel: analysisData.urgencyLevel
                    };
                    return [4 /*yield*/, firebase_1.adminDb.collection('ai_symptom_analyses').add(analysisRecord)];
                case 3:
                    docRef = _a.sent();
                    if (!(analysis.urgencyLevel === 'emergency')) return [3 /*break*/, 5];
                    return [4 /*yield*/, createEmergencyAlert(analysisData.patientId, analysis, docRef.id)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse(__assign(__assign({ id: docRef.id }, analysis), { disclaimer: 'Este análisis es generado por IA y no sustituye el criterio médico profesional. Consulte siempre con un médico calificado.' })), { status: 200 })];
                case 6:
                    error_1 = _a.sent();
                    console.error('Error analyzing symptoms:', error_1);
                    if (error_1 instanceof zod_1.z.ZodError) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', 'Datos de análisis inválidos', error_1.errors), { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('SYMPTOM_ANALYSIS_FAILED', 'Error al analizar síntomas'), { status: 500 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
function performSymptomAnalysis(data) {
    // Simulación de análisis de IA (en producción sería un modelo real)
    var totalSeverityScore = 0;
    var maxUrgency = 'routine';
    var possibleConditions = {};
    var recommendedSpecialists = new Set();
    // Analizar cada síntoma
    for (var _i = 0, _a = data.symptoms; _i < _a.length; _i++) {
        var symptom = _a[_i];
        var symptomName = symptom.name.toLowerCase();
        var knownSymptom = medicalKnowledge.symptoms[symptomName];
        if (knownSymptom) {
            // Calcular puntuación de severidad
            var severityMultiplier = knownSymptom.severity_multiplier;
            var severityScore = getSeverityScore(symptom.severity) * severityMultiplier;
            totalSeverityScore += severityScore;
            // Actualizar urgencia máxima
            if (getUrgencyPriority(knownSymptom.urgency) > getUrgencyPriority(maxUrgency)) {
                maxUrgency = knownSymptom.urgency;
            }
            // Agregar condiciones posibles
            for (var _b = 0, _c = knownSymptom.conditions; _b < _c.length; _b++) {
                var condition = _c[_b];
                possibleConditions[condition] = (possibleConditions[condition] || 0) + severityScore;
            }
        }
    }
    // Determinar condiciones más probables
    var sortedConditions = Object.entries(possibleConditions)
        .sort(function (_a, _b) {
        var a = _a[1];
        var b = _b[1];
        return b - a;
    })
        .slice(0, 5)
        .map(function (_a) {
        var condition = _a[0], score = _a[1];
        var conditionInfo = medicalKnowledge.conditions[condition];
        if (conditionInfo === null || conditionInfo === void 0 ? void 0 : conditionInfo.specialist) {
            recommendedSpecialists.add(conditionInfo.specialist);
        }
        return {
            name: condition,
            probability: Math.min(Math.round((score / totalSeverityScore) * 100), 95),
            urgency: (conditionInfo === null || conditionInfo === void 0 ? void 0 : conditionInfo.urgency) || 'routine',
            description: getConditionDescription(condition)
        };
    });
    // Determinar nivel de urgencia final
    var finalUrgency = maxUrgency;
    if (totalSeverityScore > 10)
        finalUrgency = 'emergency';
    else if (totalSeverityScore > 5)
        finalUrgency = 'urgent';
    // Generar recomendaciones
    var recommendations = generateRecommendations(data, sortedConditions, finalUrgency);
    return {
        patientId: data.patientId,
        analysisId: "analysis_" + Date.now(),
        timestamp: new Date(),
        // Resultados del análisis
        urgencyLevel: finalUrgency,
        overallSeverityScore: Math.round(totalSeverityScore * 10) / 10,
        confidence: Math.min(Math.round((sortedConditions.length / data.symptoms.length) * 100), 90),
        // Condiciones identificadas
        possibleConditions: sortedConditions,
        // Recomendaciones
        recommendations: data.includeRecommendations ? recommendations : null,
        recommendedSpecialists: Array.from(recommendedSpecialists),
        // Seguimiento recomendado
        followUp: {
            timeframe: getFollowUpTimeframe(finalUrgency),
            priority: finalUrgency,
            requiresImmediate: finalUrgency === 'emergency'
        },
        // Flags de alerta
        redFlags: identifyRedFlags(data.symptoms, sortedConditions),
        // Análisis de factores de riesgo
        riskFactors: analyzeRiskFactors(data.patientInfo, sortedConditions)
    };
}
function getSeverityScore(severity) {
    switch (severity) {
        case 'mild': return 1;
        case 'moderate': return 3;
        case 'severe': return 5;
        default: return 1;
    }
}
function getUrgencyPriority(urgency) {
    switch (urgency) {
        case 'low': return 1;
        case 'moderate': return 2;
        case 'high': return 3;
        case 'emergency': return 4;
        default: return 1;
    }
}
function getConditionDescription(condition) {
    var descriptions = {
        'infarto': 'Interrupción del flujo sanguíneo al corazón',
        'neumonía': 'Infección de los pulmones',
        'covid-19': 'Infección viral por SARS-CoV-2',
        'migraña': 'Dolor de cabeza intenso y recurrente',
        'asma': 'Inflamación de las vías respiratorias',
        'gastroenteritis': 'Inflamación del estómago e intestinos',
        'hipertensión': 'Presión arterial elevada',
        'ansiedad': 'Trastorno de ansiedad'
    };
    return descriptions[condition] || 'Condición médica que requiere evaluación';
}
function generateRecommendations(data, conditions, urgency) {
    var recommendations = [];
    // Recomendaciones basadas en urgencia
    if (urgency === 'emergency') {
        recommendations.push('🚨 BUSQUE ATENCIÓN MÉDICA INMEDIATA - Vaya a urgencias');
        recommendations.push('No conduzca, pida que alguien lo lleve al hospital');
        recommendations.push('Si los síntomas empeoran, llame a emergencias (911)');
    }
    else if (urgency === 'urgent') {
        recommendations.push('Busque atención médica en las próximas 24 horas');
        recommendations.push('Considere visitar un centro de atención urgente');
        recommendations.push('Monitoree los síntomas de cerca');
    }
    else {
        recommendations.push('Programe una cita con su médico de cabecera');
        recommendations.push('Mantenga un registro de los síntomas');
    }
    // Recomendaciones específicas por condición
    var hasRespiratory = conditions.some(function (c) { return ['neumonía', 'asma', 'covid-19'].includes(c.name); });
    if (hasRespiratory) {
        recommendations.push('Descanse y manténgase hidratado');
        recommendations.push('Evite el esfuerzo físico excesivo');
    }
    var hasCardiac = conditions.some(function (c) { return ['infarto', 'angina'].includes(c.name); });
    if (hasCardiac) {
        recommendations.push('Evite actividades físicas intensas');
        recommendations.push('Tome los medicamentos cardíacos según prescripción');
    }
    // Recomendaciones generales
    recommendations.push('Mantenga un registro detallado de síntomas');
    recommendations.push('Siga las recomendaciones de su médico');
    return recommendations;
}
function getFollowUpTimeframe(urgency) {
    switch (urgency) {
        case 'emergency': return 'Inmediato';
        case 'urgent': return '24-48 horas';
        case 'moderate': return '1-3 días';
        default: return '1-2 semanas';
    }
}
function identifyRedFlags(symptoms, conditions) {
    var redFlags = [];
    // Banderas rojas basadas en síntomas
    var dangerousSymptoms = ['dolor de pecho', 'dificultad para respirar', 'pérdida de conciencia'];
    for (var _i = 0, symptoms_1 = symptoms; _i < symptoms_1.length; _i++) {
        var symptom = symptoms_1[_i];
        if (dangerousSymptoms.includes(symptom.name.toLowerCase()) && symptom.severity === 'severe') {
            redFlags.push("S\u00EDntoma grave: " + symptom.name);
        }
    }
    // Banderas rojas basadas en condiciones
    var emergencyConditions = conditions.filter(function (c) { return c.urgency === 'emergency'; });
    if (emergencyConditions.length > 0) {
        redFlags.push('Posible condición de emergencia detectada');
    }
    return redFlags;
}
function analyzeRiskFactors(patientInfo, conditions) {
    var _a, _b, _c;
    var riskFactors = [];
    // Factores de riesgo por edad
    if (patientInfo.age > 65) {
        riskFactors.push('Edad avanzada aumenta riesgo de complicaciones');
    }
    // Factores de riesgo por historial médico
    if ((_a = patientInfo.medicalHistory) === null || _a === void 0 ? void 0 : _a.includes('diabetes')) {
        riskFactors.push('Diabetes puede complicar infecciones');
    }
    if ((_b = patientInfo.medicalHistory) === null || _b === void 0 ? void 0 : _b.includes('hipertensión')) {
        riskFactors.push('Hipertensión requiere monitoreo cuidadoso');
    }
    // Factores de riesgo por medicamentos
    if (((_c = patientInfo.currentMedications) === null || _c === void 0 ? void 0 : _c.length) > 5) {
        riskFactors.push('Polifarmacia puede causar interacciones');
    }
    return riskFactors;
}
function createEmergencyAlert(patientId, analysis, analysisId) {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, firebase_1.adminDb.collection('emergency_alerts').add({
                            patientId: patientId,
                            analysisId: analysisId,
                            type: 'ai_symptom_emergency',
                            urgency: 'emergency',
                            message: 'Análisis de IA detectó posible emergencia médica',
                            conditions: analysis.possibleConditions,
                            createdAt: new Date(),
                            resolved: false
                        })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    console.error('Error creating emergency alert:', error_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
