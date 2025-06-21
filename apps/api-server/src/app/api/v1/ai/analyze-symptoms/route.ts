import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema para análisis de síntomas
const SymptomAnalysisSchema = z.object({
  patientId: z.string().min(1, 'ID del paciente es requerido'),
  symptoms: z.array(z.object({
    name: z.string().min(1, 'Nombre del síntoma requerido'),
    severity: z.enum(['mild', 'moderate', 'severe']),
    duration: z.string().min(1, 'Duración requerida'),
    description: z.string().optional(),
    bodyPart: z.string().optional(),
  })).min(1, 'Al menos un síntoma es requerido'),
  patientInfo: z.object({
    age: z.number().min(0).max(150),
    gender: z.enum(['male', 'female', 'other']),
    medicalHistory: z.array(z.string()).optional(),
    currentMedications: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    vitalSigns: z.object({
      temperature: z.number().optional(),
      bloodPressure: z.string().optional(),
      heartRate: z.number().optional(),
      respiratoryRate: z.number().optional(),
    }).optional(),
  }),
  urgencyLevel: z.enum(['routine', 'urgent', 'emergency']).default('routine'),
  includeRecommendations: z.boolean().default(true),
  language: z.enum(['es', 'en']).default('es'),
});

// Base de conocimiento médico simplificada (en producción sería una IA real)
const medicalKnowledge = {
  symptoms: {
    'fiebre': {
      conditions: ['infección', 'gripe', 'covid-19', 'infección urinaria'],
      urgency: 'moderate',
      severity_multiplier: 1.2,
    },
    'dolor de cabeza': {
      conditions: ['tensión', 'migraña', 'sinusitis', 'hipertensión'],
      urgency: 'low',
      severity_multiplier: 1.0,
    },
    'dolor de pecho': {
      conditions: ['infarto', 'angina', 'reflujo', 'ansiedad'],
      urgency: 'high',
      severity_multiplier: 2.0,
    },
    'dificultad para respirar': {
      conditions: ['asma', 'neumonía', 'covid-19', 'insuficiencia cardiaca'],
      urgency: 'high',
      severity_multiplier: 2.5,
    },
    'náuseas': {
      conditions: ['gastroenteritis', 'embarazo', 'medicamentos', 'migraña'],
      urgency: 'low',
      severity_multiplier: 0.8,
    },
  },
  conditions: {
    'infarto': { urgency: 'emergency', specialist: 'cardiología' },
    'neumonía': { urgency: 'urgent', specialist: 'neumología' },
    'covid-19': { urgency: 'urgent', specialist: 'medicina interna' },
    'migraña': { urgency: 'routine', specialist: 'neurología' },
    'asma': { urgency: 'urgent', specialist: 'neumología' },
  },
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'),
        { status: 401 }
      );
    }

    const body = await request.json();
    const analysisData = SymptomAnalysisSchema.parse(body);

    // Verificar que el paciente existe
    const patientDoc = await adminDb.collection('patients').doc(analysisData.patientId).get();
    if (!patientDoc.exists) {
      return NextResponse.json(
        createErrorResponse('PATIENT_NOT_FOUND', 'Paciente no encontrado'),
        { status: 404 }
      );
    }

    // Análisis de síntomas con IA simulada
    const analysis = performSymptomAnalysis(analysisData);

    // Guardar el análisis para auditoría y aprendizaje
    const analysisRecord = {
      patientId: analysisData.patientId,
      symptoms: analysisData.symptoms,
      analysis: analysis,
      timestamp: new Date(),
      language: analysisData.language,
      urgencyLevel: analysisData.urgencyLevel,
    };

    const docRef = await adminDb.collection('ai_symptom_analyses').add(analysisRecord);

    // Si es una emergencia, crear alerta automática
    if (analysis.urgencyLevel === 'emergency') {
      await createEmergencyAlert(analysisData.patientId, analysis, docRef.id);
    }

    return NextResponse.json(
      createSuccessResponse({
        id: docRef.id,
        ...analysis,
        disclaimer: 'Este análisis es generado por IA y no sustituye el criterio médico profesional. Consulte siempre con un médico calificado.',
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error analyzing symptoms:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos de análisis inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('SYMPTOM_ANALYSIS_FAILED', 'Error al analizar síntomas'),
      { status: 500 }
    );
  }
}

function performSymptomAnalysis(data: z.infer<typeof SymptomAnalysisSchema>) {
  // Simulación de análisis de IA (en producción sería un modelo real)
  let totalSeverityScore = 0;
  let maxUrgency = 'routine';
  const possibleConditions: Record<string, number> = {};
  const recommendedSpecialists = new Set<string>();

  // Analizar cada síntoma
  for (const symptom of data.symptoms) {
    const symptomName = symptom.name.toLowerCase();
    const knownSymptom = medicalKnowledge.symptoms[symptomName as keyof typeof medicalKnowledge.symptoms];

    if (knownSymptom) {
      // Calcular puntuación de severidad
      const severityMultiplier = knownSymptom.severity_multiplier;
      const severityScore = getSeverityScore(symptom.severity) * severityMultiplier;
      totalSeverityScore += severityScore;

      // Actualizar urgencia máxima
      if (getUrgencyPriority(knownSymptom.urgency) > getUrgencyPriority(maxUrgency)) {
        maxUrgency = knownSymptom.urgency;
      }

      // Agregar condiciones posibles
      for (const condition of knownSymptom.conditions) {
        possibleConditions[condition] = (possibleConditions[condition] || 0) + severityScore;
      }
    }
  }

  // Determinar condiciones más probables
  const sortedConditions = Object.entries(possibleConditions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([condition, score]) => {
      const conditionInfo = medicalKnowledge.conditions[condition as keyof typeof medicalKnowledge.conditions];
      if (conditionInfo?.specialist) {
        recommendedSpecialists.add(conditionInfo.specialist);
      }
      
      return {
        name: condition,
        probability: Math.min(Math.round((score / totalSeverityScore) * 100), 95), // Max 95% de confianza
        urgency: conditionInfo?.urgency || 'routine',
        description: getConditionDescription(condition),
      };
    });

  // Determinar nivel de urgencia final
  let finalUrgency = maxUrgency;
  if (totalSeverityScore > 10) finalUrgency = 'emergency';
  else if (totalSeverityScore > 5) finalUrgency = 'urgent';

  // Generar recomendaciones
  const recommendations = generateRecommendations(data, sortedConditions, finalUrgency);

  return {
    patientId: data.patientId,
    analysisId: `analysis_${Date.now()}`,
    timestamp: new Date(),
    
    // Resultados del análisis
    urgencyLevel: finalUrgency as 'routine' | 'urgent' | 'emergency',
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
      requiresImmediate: finalUrgency === 'emergency',
    },
    
    // Flags de alerta
    redFlags: identifyRedFlags(data.symptoms, sortedConditions),
    
    // Análisis de factores de riesgo
    riskFactors: analyzeRiskFactors(data.patientInfo, sortedConditions),
  };
}

function getSeverityScore(severity: string): number {
  switch (severity) {
    case 'mild': return 1;
    case 'moderate': return 3;
    case 'severe': return 5;
    default: return 1;
  }
}

function getUrgencyPriority(urgency: string): number {
  switch (urgency) {
    case 'low': return 1;
    case 'moderate': return 2;
    case 'high': return 3;
    case 'emergency': return 4;
    default: return 1;
  }
}

function getConditionDescription(condition: string): string {
  const descriptions: Record<string, string> = {
    'infarto': 'Interrupción del flujo sanguíneo al corazón',
    'neumonía': 'Infección de los pulmones',
    'covid-19': 'Infección viral por SARS-CoV-2',
    'migraña': 'Dolor de cabeza intenso y recurrente',
    'asma': 'Inflamación de las vías respiratorias',
    'gastroenteritis': 'Inflamación del estómago e intestinos',
    'hipertensión': 'Presión arterial elevada',
    'ansiedad': 'Trastorno de ansiedad',
  };
  
  return descriptions[condition] || 'Condición médica que requiere evaluación';
}

function generateRecommendations(
  data: z.infer<typeof SymptomAnalysisSchema>,
  conditions: Array<{ name: string; urgency: string }>,
  urgency: string
): string[] {
  const recommendations = [];

  // Recomendaciones basadas en urgencia
  if (urgency === 'emergency') {
    recommendations.push('🚨 BUSQUE ATENCIÓN MÉDICA INMEDIATA - Vaya a urgencias');
    recommendations.push('No conduzca, pida que alguien lo lleve al hospital');
    recommendations.push('Si los síntomas empeoran, llame a emergencias (911)');
  } else if (urgency === 'urgent') {
    recommendations.push('Busque atención médica en las próximas 24 horas');
    recommendations.push('Considere visitar un centro de atención urgente');
    recommendations.push('Monitoree los síntomas de cerca');
  } else {
    recommendations.push('Programe una cita con su médico de cabecera');
    recommendations.push('Mantenga un registro de los síntomas');
  }

  // Recomendaciones específicas por condición
  const hasRespiratory = conditions.some(c => ['neumonía', 'asma', 'covid-19'].includes(c.name));
  if (hasRespiratory) {
    recommendations.push('Descanse y manténgase hidratado');
    recommendations.push('Evite el esfuerzo físico excesivo');
  }

  const hasCardiac = conditions.some(c => ['infarto', 'angina'].includes(c.name));
  if (hasCardiac) {
    recommendations.push('Evite actividades físicas intensas');
    recommendations.push('Tome los medicamentos cardíacos según prescripción');
  }

  // Recomendaciones generales
  recommendations.push('Mantenga un registro detallado de síntomas');
  recommendations.push('Siga las recomendaciones de su médico');

  return recommendations;
}

function getFollowUpTimeframe(urgency: string): string {
  switch (urgency) {
    case 'emergency': return 'Inmediato';
    case 'urgent': return '24-48 horas';
    case 'moderate': return '1-3 días';
    default: return '1-2 semanas';
  }
}

function identifyRedFlags(symptoms: Array<any>, conditions: Array<any>): string[] {
  const redFlags = [];

  // Banderas rojas basadas en síntomas
  const dangerousSymptoms = ['dolor de pecho', 'dificultad para respirar', 'pérdida de conciencia'];
  for (const symptom of symptoms) {
    if (dangerousSymptoms.includes(symptom.name.toLowerCase()) && symptom.severity === 'severe') {
      redFlags.push(`Síntoma grave: ${symptom.name}`);
    }
  }

  // Banderas rojas basadas en condiciones
  const emergencyConditions = conditions.filter(c => c.urgency === 'emergency');
  if (emergencyConditions.length > 0) {
    redFlags.push('Posible condición de emergencia detectada');
  }

  return redFlags;
}

function analyzeRiskFactors(patientInfo: any, conditions: Array<any>): string[] {
  const riskFactors = [];

  // Factores de riesgo por edad
  if (patientInfo.age > 65) {
    riskFactors.push('Edad avanzada aumenta riesgo de complicaciones');
  }

  // Factores de riesgo por historial médico
  if (patientInfo.medicalHistory?.includes('diabetes')) {
    riskFactors.push('Diabetes puede complicar infecciones');
  }

  if (patientInfo.medicalHistory?.includes('hipertensión')) {
    riskFactors.push('Hipertensión requiere monitoreo cuidadoso');
  }

  // Factores de riesgo por medicamentos
  if (patientInfo.currentMedications?.length > 5) {
    riskFactors.push('Polifarmacia puede causar interacciones');
  }

  return riskFactors;
}

async function createEmergencyAlert(patientId: string, analysis: any, analysisId: string) {
  try {
    await adminDb.collection('emergency_alerts').add({
      patientId,
      analysisId,
      type: 'ai_symptom_emergency',
      urgency: 'emergency',
      message: 'Análisis de IA detectó posible emergencia médica',
      conditions: analysis.possibleConditions,
      createdAt: new Date(),
      resolved: false,
    });
  } catch (error) {
    console.error('Error creating emergency alert:', error);
  }
}
