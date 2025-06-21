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
exports.POST = void 0;
var firebase_1 = require("@altamedica/firebase");
var shared_1 = require("@altamedica/shared");
var server_1 = require("next/server");
var zod_1 = require("zod");
// Schema para análisis de interacciones medicamentosas
var DrugInteractionSchema = zod_1.z.object({
    patientId: zod_1.z.string().min(1, 'ID del paciente es requerido'),
    medications: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().min(1, 'Nombre del medicamento requerido'),
        activeIngredient: zod_1.z.string().optional(),
        dosage: zod_1.z.string().min(1, 'Dosificación requerida'),
        frequency: zod_1.z.string().min(1, 'Frecuencia requerida'),
        startDate: zod_1.z.string().optional(),
        prescribedBy: zod_1.z.string().optional()
    })).min(1, 'Al menos un medicamento es requerido'),
    newMedication: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Nombre del medicamento requerido'),
        activeIngredient: zod_1.z.string().optional(),
        dosage: zod_1.z.string().min(1, 'Dosificación requerida'),
        frequency: zod_1.z.string().min(1, 'Frecuencia requerida')
    }).optional(),
    patientInfo: zod_1.z.object({
        age: zod_1.z.number().min(0).max(150),
        weight: zod_1.z.number().min(1).max(500).optional(),
        allergies: zod_1.z.array(zod_1.z.string()).optional(),
        conditions: zod_1.z.array(zod_1.z.string()).optional(),
        kidneyFunction: zod_1.z["enum"](['normal', 'mild', 'moderate', 'severe']).optional(),
        liverFunction: zod_1.z["enum"](['normal', 'mild', 'moderate', 'severe']).optional()
    }),
    includeContraindications: zod_1.z.boolean()["default"](true),
    includeDosageAdjustments: zod_1.z.boolean()["default"](true),
    language: zod_1.z["enum"](['es', 'en'])["default"]('es')
});
// Base de datos de interacciones medicamentosas (simulada)
var drugInteractions = {
    'warfarina': {
        interactions: [
            { drug: 'aspirina', severity: 'high', mechanism: 'increased bleeding risk' },
            { drug: 'amoxicilina', severity: 'moderate', mechanism: 'enhanced anticoagulation' },
            { drug: 'paracetamol', severity: 'low', mechanism: 'minimal interaction' },
        ],
        contraindications: ['bleeding disorders', 'peptic ulcer'],
        monitoring: ['INR levels', 'bleeding signs']
    },
    'aspirina': {
        interactions: [
            { drug: 'warfarina', severity: 'high', mechanism: 'increased bleeding risk' },
            { drug: 'ibuprofeno', severity: 'moderate', mechanism: 'increased GI toxicity' },
            { drug: 'metformina', severity: 'low', mechanism: 'minimal interaction' },
        ],
        contraindications: ['asthma', 'peptic ulcer', 'bleeding disorders'],
        monitoring: ['GI symptoms', 'bleeding']
    },
    'metformina': {
        interactions: [
            { drug: 'furosemida', severity: 'moderate', mechanism: 'lactic acidosis risk' },
            { drug: 'alcohol', severity: 'high', mechanism: 'lactic acidosis' },
            { drug: 'insulina', severity: 'moderate', mechanism: 'hypoglycemia risk' },
        ],
        contraindications: ['kidney disease', 'liver disease', 'heart failure'],
        monitoring: ['kidney function', 'lactic acid levels']
    },
    'enalapril': {
        interactions: [
            { drug: 'potasio', severity: 'high', mechanism: 'hyperkalemia' },
            { drug: 'ibuprofeno', severity: 'moderate', mechanism: 'reduced antihypertensive effect' },
            { drug: 'furosemida', severity: 'moderate', mechanism: 'hypotension' },
        ],
        contraindications: ['angioedema history', 'pregnancy'],
        monitoring: ['blood pressure', 'kidney function', 'potassium levels']
    }
};
var allergyInteractions = {
    'penicilina': ['amoxicilina', 'ampicilina', 'penicilina g'],
    'sulfa': ['sulfametoxazol', 'furosemida', 'celecoxib'],
    'aspirina': ['aspirina', 'ácido acetilsalicílico', 'salicilatos']
};
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, body, interactionData, patientDoc, analysis, analysisRecord, docRef, error_1;
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
                    interactionData = DrugInteractionSchema.parse(body);
                    return [4 /*yield*/, firebase_1.adminDb.collection('patients').doc(interactionData.patientId).get()];
                case 2:
                    patientDoc = _a.sent();
                    if (!patientDoc.exists) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('PATIENT_NOT_FOUND', 'Paciente no encontrado'), { status: 404 })];
                    }
                    analysis = performDrugInteractionAnalysis(interactionData);
                    analysisRecord = {
                        patientId: interactionData.patientId,
                        medications: interactionData.medications,
                        newMedication: interactionData.newMedication,
                        analysis: analysis,
                        timestamp: new Date(),
                        language: interactionData.language
                    };
                    return [4 /*yield*/, firebase_1.adminDb.collection('ai_drug_interaction_analyses').add(analysisRecord)];
                case 3:
                    docRef = _a.sent();
                    if (!analysis.hasCriticalInteractions) return [3 /*break*/, 5];
                    return [4 /*yield*/, createDrugInteractionAlert(interactionData.patientId, analysis, docRef.id)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [2 /*return*/, server_1.NextResponse.json(shared_1.createSuccessResponse(__assign(__assign({ id: docRef.id }, analysis), { disclaimer: 'Este análisis es generado por IA y no sustituye el criterio farmacológico profesional. Consulte siempre con un farmacéutico o médico.' })), { status: 200 })];
                case 6:
                    error_1 = _a.sent();
                    console.error('Error analyzing drug interactions:', error_1);
                    if (error_1 instanceof zod_1.z.ZodError) {
                        return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('VALIDATION_ERROR', 'Datos de análisis inválidos', error_1.errors), { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json(shared_1.createErrorResponse('DRUG_INTERACTION_ANALYSIS_FAILED', 'Error al analizar interacciones medicamentosas'), { status: 500 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
function performDrugInteractionAnalysis(data) {
    var allMedications = __spreadArrays(data.medications);
    if (data.newMedication) {
        allMedications.push(data.newMedication);
    }
    var interactions = [];
    var contraindications = [];
    var allergyWarnings = [];
    var dosageAdjustments = [];
    var monitoringRecommendations = new Set();
    var maxSeverity = 'low';
    var hasCriticalInteractions = false;
    // Analizar interacciones entre medicamentos
    for (var i = 0; i < allMedications.length; i++) {
        for (var j = i + 1; j < allMedications.length; j++) {
            var med1 = normalizeDrugName(allMedications[i].name);
            var med2 = normalizeDrugName(allMedications[j].name);
            var interaction = findInteraction(med1, med2);
            if (interaction) {
                interactions.push({
                    medication1: allMedications[i].name,
                    medication2: allMedications[j].name,
                    severity: interaction.severity,
                    mechanism: interaction.mechanism,
                    clinicalSignificance: getClinicalsignificance(interaction.severity),
                    recommendation: getInteractionRecommendation(interaction)
                });
                if (interaction.severity === 'high') {
                    hasCriticalInteractions = true;
                    maxSeverity = 'high';
                }
                else if (interaction.severity === 'moderate' && maxSeverity !== 'high') {
                    maxSeverity = 'moderate';
                }
            }
        }
    }
    // Verificar alergias
    if (data.patientInfo.allergies) {
        for (var _i = 0, allMedications_1 = allMedications; _i < allMedications_1.length; _i++) {
            var medication = allMedications_1[_i];
            var allergyWarning = checkAllergyInteraction(medication.name, data.patientInfo.allergies);
            if (allergyWarning) {
                allergyWarnings.push(allergyWarning);
                hasCriticalInteractions = true;
            }
        }
    }
    // Verificar contraindicaciones por condiciones médicas
    if (data.patientInfo.conditions) {
        for (var _a = 0, allMedications_2 = allMedications; _a < allMedications_2.length; _a++) {
            var medication = allMedications_2[_a];
            var contraindication = checkContraindications(medication.name, data.patientInfo.conditions);
            if (contraindication) {
                contraindications.push(contraindication);
            }
        }
    }
    // Ajustes de dosis por función renal/hepática
    if (data.includeDosageAdjustments) {
        for (var _b = 0, allMedications_3 = allMedications; _b < allMedications_3.length; _b++) {
            var medication = allMedications_3[_b];
            var adjustment = checkDosageAdjustments(medication, data.patientInfo);
            if (adjustment) {
                dosageAdjustments.push(adjustment);
            }
        }
    }
    // Recomendaciones de monitoreo
    for (var _c = 0, allMedications_4 = allMedications; _c < allMedications_4.length; _c++) {
        var medication = allMedications_4[_c];
        var monitoring = getMonitoringRecommendations(medication.name);
        monitoring.forEach(function (rec) { return monitoringRecommendations.add(rec); });
    }
    // Generar resumen de riesgo
    var riskAssessment = generateRiskAssessment(interactions, contraindications, allergyWarnings, data.patientInfo);
    return {
        patientId: data.patientId,
        analysisId: "drug_analysis_" + Date.now(),
        timestamp: new Date(),
        // Resultado del análisis
        overallRisk: maxSeverity,
        hasCriticalInteractions: hasCriticalInteractions,
        interactionCount: interactions.length,
        // Interacciones encontradas
        interactions: interactions,
        contraindications: contraindications,
        allergyWarnings: allergyWarnings,
        // Recomendaciones
        dosageAdjustments: data.includeDosageAdjustments ? dosageAdjustments : null,
        monitoringRecommendations: Array.from(monitoringRecommendations),
        // Evaluación de riesgo
        riskAssessment: riskAssessment,
        // Recomendaciones generales
        recommendations: generateGeneralRecommendations(maxSeverity, hasCriticalInteractions),
        // Medicamentos analizados
        analyzedMedications: allMedications.map(function (med) { return ({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            riskLevel: calculateMedicationRisk(med.name, data.patientInfo)
        }); })
    };
}
function normalizeDrugName(name) {
    return name.toLowerCase().trim();
}
function findInteraction(drug1, drug2) {
    var drug1Data = drugInteractions[drug1];
    if (drug1Data) {
        var interaction = drug1Data.interactions.find(function (int) { return int.drug === drug2; });
        if (interaction)
            return interaction;
    }
    var drug2Data = drugInteractions[drug2];
    if (drug2Data) {
        var interaction = drug2Data.interactions.find(function (int) { return int.drug === drug1; });
        if (interaction)
            return interaction;
    }
    return null;
}
function getClinicalsignificance(severity) {
    switch (severity) {
        case 'high':
            return 'Alto riesgo - Evitar combinación o requer monitoreo estricto';
        case 'moderate':
            return 'Riesgo moderado - Considerar alternativas o ajustar dosis';
        case 'low':
            return 'Riesgo bajo - Monitoreo rutinario';
        default:
            return 'Significancia desconocida';
    }
}
function getInteractionRecommendation(interaction) {
    switch (interaction.severity) {
        case 'high':
            return 'Evitar combinación. Considerar medicamentos alternativos.';
        case 'moderate':
            return 'Usar con precaución. Monitorear efectos adversos y ajustar dosis si es necesario.';
        case 'low':
            return 'Interacción menor. Monitoreo rutinario recomendado.';
        default:
            return 'Consultar con farmacéutico o médico.';
    }
}
function checkAllergyInteraction(medication, allergies) {
    var medName = normalizeDrugName(medication);
    for (var _i = 0, allergies_1 = allergies; _i < allergies_1.length; _i++) {
        var allergy = allergies_1[_i];
        var allergyGroup = allergyInteractions[allergy.toLowerCase()];
        if (allergyGroup && allergyGroup.includes(medName)) {
            return {
                medication: medication,
                allergy: allergy,
                severity: 'critical',
                warning: "ALERTA: Posible reacci\u00F3n al\u00E9rgica a " + medication + " debido a alergia conocida a " + allergy,
                recommendation: 'NO ADMINISTRAR. Buscar alternativa inmediatamente.'
            };
        }
    }
    return null;
}
function checkContraindications(medication, conditions) {
    var medName = normalizeDrugName(medication);
    var drugData = drugInteractions[medName];
    if (drugData && drugData.contraindications) {
        var _loop_1 = function (condition) {
            if (drugData.contraindications.some(function (contra) {
                return condition.toLowerCase().includes(contra.toLowerCase());
            })) {
                return { value: {
                        medication: medication,
                        condition: condition,
                        severity: 'high',
                        warning: "Contraindicaci\u00F3n: " + medication + " no recomendado en pacientes con " + condition,
                        recommendation: 'Considerar medicamento alternativo.'
                    } };
            }
        };
        for (var _i = 0, conditions_1 = conditions; _i < conditions_1.length; _i++) {
            var condition = conditions_1[_i];
            var state_1 = _loop_1(condition);
            if (typeof state_1 === "object")
                return state_1.value;
        }
    }
    return null;
}
function checkDosageAdjustments(medication, patientInfo) {
    var adjustments = [];
    // Ajustes por función renal
    if (patientInfo.kidneyFunction && patientInfo.kidneyFunction !== 'normal') {
        adjustments.push({
            medication: medication.name,
            reason: "Funci\u00F3n renal " + patientInfo.kidneyFunction,
            recommendation: getKidneyAdjustment(medication.name, patientInfo.kidneyFunction)
        });
    }
    // Ajustes por función hepática
    if (patientInfo.liverFunction && patientInfo.liverFunction !== 'normal') {
        adjustments.push({
            medication: medication.name,
            reason: "Funci\u00F3n hep\u00E1tica " + patientInfo.liverFunction,
            recommendation: getLiverAdjustment(medication.name, patientInfo.liverFunction)
        });
    }
    // Ajustes por edad
    if (patientInfo.age > 65) {
        adjustments.push({
            medication: medication.name,
            reason: 'Paciente geriátrico',
            recommendation: 'Considerar reducir dosis inicial y titular gradualmente'
        });
    }
    return adjustments.length > 0 ? adjustments : null;
}
function getKidneyAdjustment(medication, kidneyFunction) {
    switch (kidneyFunction) {
        case 'mild':
            return 'Reducir dosis en 25% o extender intervalo de dosificación';
        case 'moderate':
            return 'Reducir dosis en 50% o extender intervalo significativamente';
        case 'severe':
            return 'Considerar medicamento alternativo o reducir dosis drásticamente';
        default:
            return 'Ajuste de dosis requerido';
    }
}
function getLiverAdjustment(medication, liverFunction) {
    switch (liverFunction) {
        case 'mild':
            return 'Monitoreo hepático aumentado, posible reducción de dosis';
        case 'moderate':
            return 'Reducir dosis en 50%, monitoreo hepático estricto';
        case 'severe':
            return 'Evitar medicamento o usar dosis mínima con monitoreo intensivo';
        default:
            return 'Ajuste de dosis requerido por función hepática';
    }
}
function getMonitoringRecommendations(medication) {
    var medName = normalizeDrugName(medication);
    var drugData = drugInteractions[medName];
    return (drugData === null || drugData === void 0 ? void 0 : drugData.monitoring) || ['Monitoreo clínico rutinario'];
}
function calculateMedicationRisk(medication, patientInfo) {
    // Simplificado: en producción sería más complejo
    if (patientInfo.age > 75)
        return 'high';
    if (patientInfo.conditions && patientInfo.conditions.length > 2)
        return 'moderate';
    return 'low';
}
function generateRiskAssessment(interactions, contraindications, allergyWarnings, patientInfo) {
    var riskScore = 0;
    // Puntuación por interacciones
    riskScore += interactions.filter(function (i) { return i.severity === 'high'; }).length * 3;
    riskScore += interactions.filter(function (i) { return i.severity === 'moderate'; }).length * 2;
    riskScore += interactions.filter(function (i) { return i.severity === 'low'; }).length * 1;
    // Puntuación por contraindicaciones
    riskScore += contraindications.length * 4;
    // Puntuación crítica por alergias
    riskScore += allergyWarnings.length * 5;
    // Factores del paciente
    if (patientInfo.age > 75)
        riskScore += 2;
    if (patientInfo.conditions && patientInfo.conditions.length > 3)
        riskScore += 2;
    var riskLevel = 'low';
    var recommendation = 'Perfil de medicamentos seguro con monitoreo rutinario';
    if (riskScore >= 10) {
        riskLevel = 'critical';
        recommendation = 'REVISIÓN URGENTE REQUERIDA - Consultar farmacéutico clínico inmediatamente';
    }
    else if (riskScore >= 5) {
        riskLevel = 'high';
        recommendation = 'Revisión farmacéutica requerida antes de dispensar';
    }
    else if (riskScore >= 2) {
        riskLevel = 'moderate';
        recommendation = 'Monitoreo aumentado recomendado';
    }
    return {
        riskScore: riskScore,
        riskLevel: riskLevel,
        recommendation: recommendation,
        factors: [
            interactions.length + " interacciones detectadas",
            contraindications.length + " contraindicaciones",
            allergyWarnings.length + " alertas de alergia",
        ]
    };
}
function generateGeneralRecommendations(severity, hasCritical) {
    var recommendations = [];
    if (hasCritical) {
        recommendations.push('🚨 ATENCIÓN: Interacciones críticas detectadas');
        recommendations.push('Revisar con farmacéutico antes de dispensar');
        recommendations.push('Considerar medicamentos alternativos');
    }
    if (severity === 'high') {
        recommendations.push('Monitoreo clínico estricto requerido');
        recommendations.push('Educar al paciente sobre efectos adversos');
    }
    recommendations.push('Mantener lista actualizada de medicamentos');
    recommendations.push('Informar a todos los proveedores de salud');
    recommendations.push('Revisar interacciones periódicamente');
    return recommendations;
}
function createDrugInteractionAlert(patientId, analysis, analysisId) {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, firebase_1.adminDb.collection('drug_interaction_alerts').add({
                            patientId: patientId,
                            analysisId: analysisId,
                            type: 'critical_drug_interaction',
                            severity: 'high',
                            message: 'Interacciones medicamentosas críticas detectadas por IA',
                            interactions: analysis.interactions.filter(function (i) { return i.severity === 'high'; }),
                            allergyWarnings: analysis.allergyWarnings,
                            createdAt: new Date(),
                            resolved: false
                        })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    console.error('Error creating drug interaction alert:', error_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
