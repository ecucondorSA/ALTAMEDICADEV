import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema para análisis de interacciones medicamentosas
const DrugInteractionSchema = z.object({
  patientId: z.string().min(1, 'ID del paciente es requerido'),
  medications: z.array(z.object({
    name: z.string().min(1, 'Nombre del medicamento requerido'),
    activeIngredient: z.string().optional(),
    dosage: z.string().min(1, 'Dosificación requerida'),
    frequency: z.string().min(1, 'Frecuencia requerida'),
    startDate: z.string().optional(),
    prescribedBy: z.string().optional(),
  })).min(1, 'Al menos un medicamento es requerido'),
  newMedication: z.object({
    name: z.string().min(1, 'Nombre del medicamento requerido'),
    activeIngredient: z.string().optional(),
    dosage: z.string().min(1, 'Dosificación requerida'),
    frequency: z.string().min(1, 'Frecuencia requerida'),
  }).optional(),
  patientInfo: z.object({
    age: z.number().min(0).max(150),
    weight: z.number().min(1).max(500).optional(),
    allergies: z.array(z.string()).optional(),
    conditions: z.array(z.string()).optional(),
    kidneyFunction: z.enum(['normal', 'mild', 'moderate', 'severe']).optional(),
    liverFunction: z.enum(['normal', 'mild', 'moderate', 'severe']).optional(),
  }),
  includeContraindications: z.boolean().default(true),
  includeDosageAdjustments: z.boolean().default(true),
  language: z.enum(['es', 'en']).default('es'),
});

// Base de datos de interacciones medicamentosas (simulada)
const drugInteractions = {
  'warfarina': {
    interactions: [
      { drug: 'aspirina', severity: 'high', mechanism: 'increased bleeding risk' },
      { drug: 'amoxicilina', severity: 'moderate', mechanism: 'enhanced anticoagulation' },
      { drug: 'paracetamol', severity: 'low', mechanism: 'minimal interaction' },
    ],
    contraindications: ['bleeding disorders', 'peptic ulcer'],
    monitoring: ['INR levels', 'bleeding signs'],
  },
  'aspirina': {
    interactions: [
      { drug: 'warfarina', severity: 'high', mechanism: 'increased bleeding risk' },
      { drug: 'ibuprofeno', severity: 'moderate', mechanism: 'increased GI toxicity' },
      { drug: 'metformina', severity: 'low', mechanism: 'minimal interaction' },
    ],
    contraindications: ['asthma', 'peptic ulcer', 'bleeding disorders'],
    monitoring: ['GI symptoms', 'bleeding'],
  },
  'metformina': {
    interactions: [
      { drug: 'furosemida', severity: 'moderate', mechanism: 'lactic acidosis risk' },
      { drug: 'alcohol', severity: 'high', mechanism: 'lactic acidosis' },
      { drug: 'insulina', severity: 'moderate', mechanism: 'hypoglycemia risk' },
    ],
    contraindications: ['kidney disease', 'liver disease', 'heart failure'],
    monitoring: ['kidney function', 'lactic acid levels'],
  },
  'enalapril': {
    interactions: [
      { drug: 'potasio', severity: 'high', mechanism: 'hyperkalemia' },
      { drug: 'ibuprofeno', severity: 'moderate', mechanism: 'reduced antihypertensive effect' },
      { drug: 'furosemida', severity: 'moderate', mechanism: 'hypotension' },
    ],
    contraindications: ['angioedema history', 'pregnancy'],
    monitoring: ['blood pressure', 'kidney function', 'potassium levels'],
  },
};

const allergyInteractions = {
  'penicilina': ['amoxicilina', 'ampicilina', 'penicilina g'],
  'sulfa': ['sulfametoxazol', 'furosemida', 'celecoxib'],
  'aspirina': ['aspirina', 'ácido acetilsalicílico', 'salicilatos'],
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
    const interactionData = DrugInteractionSchema.parse(body);

    // Verificar que el paciente existe
    const patientDoc = await adminDb.collection('patients').doc(interactionData.patientId).get();
    if (!patientDoc.exists) {
      return NextResponse.json(
        createErrorResponse('PATIENT_NOT_FOUND', 'Paciente no encontrado'),
        { status: 404 }
      );
    }

    // Realizar análisis de interacciones
    const analysis = performDrugInteractionAnalysis(interactionData);

    // Guardar el análisis para auditoría
    const analysisRecord = {
      patientId: interactionData.patientId,
      medications: interactionData.medications,
      newMedication: interactionData.newMedication,
      analysis: analysis,
      timestamp: new Date(),
      language: interactionData.language,
    };

    const docRef = await adminDb.collection('ai_drug_interaction_analyses').add(analysisRecord);

    // Si hay interacciones de alta severidad, crear alerta
    if (analysis.hasCriticalInteractions) {
      await createDrugInteractionAlert(interactionData.patientId, analysis, docRef.id);
    }

    return NextResponse.json(
      createSuccessResponse({
        id: docRef.id,
        ...analysis,
        disclaimer: 'Este análisis es generado por IA y no sustituye el criterio farmacológico profesional. Consulte siempre con un farmacéutico o médico.',
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error analyzing drug interactions:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos de análisis inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('DRUG_INTERACTION_ANALYSIS_FAILED', 'Error al analizar interacciones medicamentosas'),
      { status: 500 }
    );
  }
}

function performDrugInteractionAnalysis(data: z.infer<typeof DrugInteractionSchema>) {
  const allMedications = [...data.medications];
  if (data.newMedication) {
    allMedications.push(data.newMedication);
  }

  const interactions = [];
  const contraindications = [];
  const allergyWarnings = [];
  const dosageAdjustments = [];
  const monitoringRecommendations = new Set<string>();

  let maxSeverity = 'low';
  let hasCriticalInteractions = false;

  // Analizar interacciones entre medicamentos
  for (let i = 0; i < allMedications.length; i++) {
    for (let j = i + 1; j < allMedications.length; j++) {
      const med1 = normalizeDrugName(allMedications[i].name);
      const med2 = normalizeDrugName(allMedications[j].name);

      const interaction = findInteraction(med1, med2);
      if (interaction) {
        interactions.push({
          medication1: allMedications[i].name,
          medication2: allMedications[j].name,
          severity: interaction.severity,
          mechanism: interaction.mechanism,
          clinicalSignificance: getClinicalsignificance(interaction.severity),
          recommendation: getInteractionRecommendation(interaction),
        });

        if (interaction.severity === 'high') {
          hasCriticalInteractions = true;
          maxSeverity = 'high';
        } else if (interaction.severity === 'moderate' && maxSeverity !== 'high') {
          maxSeverity = 'moderate';
        }
      }
    }
  }

  // Verificar alergias
  if (data.patientInfo.allergies) {
    for (const medication of allMedications) {
      const allergyWarning = checkAllergyInteraction(medication.name, data.patientInfo.allergies);
      if (allergyWarning) {
        allergyWarnings.push(allergyWarning);
        hasCriticalInteractions = true;
      }
    }
  }

  // Verificar contraindicaciones por condiciones médicas
  if (data.patientInfo.conditions) {
    for (const medication of allMedications) {
      const contraindication = checkContraindications(medication.name, data.patientInfo.conditions);
      if (contraindication) {
        contraindications.push(contraindication);
      }
    }
  }

  // Ajustes de dosis por función renal/hepática
  if (data.includeDosageAdjustments) {
    for (const medication of allMedications) {
      const adjustment = checkDosageAdjustments(medication, data.patientInfo);
      if (adjustment) {
        dosageAdjustments.push(adjustment);
      }
    }
  }

  // Recomendaciones de monitoreo
  for (const medication of allMedications) {
    const monitoring = getMonitoringRecommendations(medication.name);
    monitoring.forEach(rec => monitoringRecommendations.add(rec));
  }

  // Generar resumen de riesgo
  const riskAssessment = generateRiskAssessment(
    interactions,
    contraindications,
    allergyWarnings,
    data.patientInfo
  );

  return {
    patientId: data.patientId,
    analysisId: `drug_analysis_${Date.now()}`,
    timestamp: new Date(),
    
    // Resultado del análisis
    overallRisk: maxSeverity as 'low' | 'moderate' | 'high',
    hasCriticalInteractions,
    interactionCount: interactions.length,
    
    // Interacciones encontradas
    interactions,
    contraindications,
    allergyWarnings,
    
    // Recomendaciones
    dosageAdjustments: data.includeDosageAdjustments ? dosageAdjustments : null,
    monitoringRecommendations: Array.from(monitoringRecommendations),
    
    // Evaluación de riesgo
    riskAssessment,
    
    // Recomendaciones generales
    recommendations: generateGeneralRecommendations(maxSeverity, hasCriticalInteractions),
    
    // Medicamentos analizados
    analyzedMedications: allMedications.map(med => ({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      riskLevel: calculateMedicationRisk(med.name, data.patientInfo),
    })),
  };
}

function normalizeDrugName(name: string): string {
  return name.toLowerCase().trim();
}

function findInteraction(drug1: string, drug2: string) {
  const drug1Data = drugInteractions[drug1 as keyof typeof drugInteractions];
  if (drug1Data) {
    const interaction = drug1Data.interactions.find(int => int.drug === drug2);
    if (interaction) return interaction;
  }

  const drug2Data = drugInteractions[drug2 as keyof typeof drugInteractions];
  if (drug2Data) {
    const interaction = drug2Data.interactions.find(int => int.drug === drug1);
    if (interaction) return interaction;
  }

  return null;
}

function getClinicalsignificance(severity: string): string {
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

function getInteractionRecommendation(interaction: any): string {
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

function checkAllergyInteraction(medication: string, allergies: string[]): any {
  const medName = normalizeDrugName(medication);
  
  for (const allergy of allergies) {
    const allergyGroup = allergyInteractions[allergy.toLowerCase() as keyof typeof allergyInteractions];
    if (allergyGroup && allergyGroup.includes(medName)) {
      return {
        medication,
        allergy,
        severity: 'critical',
        warning: `ALERTA: Posible reacción alérgica a ${medication} debido a alergia conocida a ${allergy}`,
        recommendation: 'NO ADMINISTRAR. Buscar alternativa inmediatamente.',
      };
    }
  }
  
  return null;
}

function checkContraindications(medication: string, conditions: string[]): any {
  const medName = normalizeDrugName(medication);
  const drugData = drugInteractions[medName as keyof typeof drugInteractions];
  
  if (drugData && drugData.contraindications) {
    for (const condition of conditions) {
      if (drugData.contraindications.some(contra => 
        condition.toLowerCase().includes(contra.toLowerCase())
      )) {
        return {
          medication,
          condition,
          severity: 'high',
          warning: `Contraindicación: ${medication} no recomendado en pacientes con ${condition}`,
          recommendation: 'Considerar medicamento alternativo.',
        };
      }
    }
  }
  
  return null;
}

function checkDosageAdjustments(medication: any, patientInfo: any): any {
  const adjustments = [];
  
  // Ajustes por función renal
  if (patientInfo.kidneyFunction && patientInfo.kidneyFunction !== 'normal') {
    adjustments.push({
      medication: medication.name,
      reason: `Función renal ${patientInfo.kidneyFunction}`,
      recommendation: getKidneyAdjustment(medication.name, patientInfo.kidneyFunction),
    });
  }
  
  // Ajustes por función hepática
  if (patientInfo.liverFunction && patientInfo.liverFunction !== 'normal') {
    adjustments.push({
      medication: medication.name,
      reason: `Función hepática ${patientInfo.liverFunction}`,
      recommendation: getLiverAdjustment(medication.name, patientInfo.liverFunction),
    });
  }
  
  // Ajustes por edad
  if (patientInfo.age > 65) {
    adjustments.push({
      medication: medication.name,
      reason: 'Paciente geriátrico',
      recommendation: 'Considerar reducir dosis inicial y titular gradualmente',
    });
  }
  
  return adjustments.length > 0 ? adjustments : null;
}

function getKidneyAdjustment(medication: string, kidneyFunction: string): string {
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

function getLiverAdjustment(medication: string, liverFunction: string): string {
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

function getMonitoringRecommendations(medication: string): string[] {
  const medName = normalizeDrugName(medication);
  const drugData = drugInteractions[medName as keyof typeof drugInteractions];
  
  return drugData?.monitoring || ['Monitoreo clínico rutinario'];
}

function calculateMedicationRisk(medication: string, patientInfo: any): string {
  // Simplificado: en producción sería más complejo
  if (patientInfo.age > 75) return 'high';
  if (patientInfo.conditions && patientInfo.conditions.length > 2) return 'moderate';
  return 'low';
}

function generateRiskAssessment(interactions: any[], contraindications: any[], allergyWarnings: any[], patientInfo: any) {
  let riskScore = 0;
  
  // Puntuación por interacciones
  riskScore += interactions.filter(i => i.severity === 'high').length * 3;
  riskScore += interactions.filter(i => i.severity === 'moderate').length * 2;
  riskScore += interactions.filter(i => i.severity === 'low').length * 1;
  
  // Puntuación por contraindicaciones
  riskScore += contraindications.length * 4;
  
  // Puntuación crítica por alergias
  riskScore += allergyWarnings.length * 5;
  
  // Factores del paciente
  if (patientInfo.age > 75) riskScore += 2;
  if (patientInfo.conditions && patientInfo.conditions.length > 3) riskScore += 2;
  
  let riskLevel = 'low';
  let recommendation = 'Perfil de medicamentos seguro con monitoreo rutinario';
  
  if (riskScore >= 10) {
    riskLevel = 'critical';
    recommendation = 'REVISIÓN URGENTE REQUERIDA - Consultar farmacéutico clínico inmediatamente';
  } else if (riskScore >= 5) {
    riskLevel = 'high';
    recommendation = 'Revisión farmacéutica requerida antes de dispensar';
  } else if (riskScore >= 2) {
    riskLevel = 'moderate';
    recommendation = 'Monitoreo aumentado recomendado';
  }
  
  return {
    riskScore,
    riskLevel,
    recommendation,
    factors: [
      `${interactions.length} interacciones detectadas`,
      `${contraindications.length} contraindicaciones`,
      `${allergyWarnings.length} alertas de alergia`,
    ],
  };
}

function generateGeneralRecommendations(severity: string, hasCritical: boolean): string[] {
  const recommendations = [];
  
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

async function createDrugInteractionAlert(patientId: string, analysis: any, analysisId: string) {
  try {
    await adminDb.collection('drug_interaction_alerts').add({
      patientId,
      analysisId,
      type: 'critical_drug_interaction',
      severity: 'high',
      message: 'Interacciones medicamentosas críticas detectadas por IA',
      interactions: analysis.interactions.filter((i: any) => i.severity === 'high'),
      allergyWarnings: analysis.allergyWarnings,
      createdAt: new Date(),
      resolved: false,
    });
  } catch (error) {
    console.error('Error creating drug interaction alert:', error);
  }
}
