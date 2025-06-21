import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema para verificar prescripción
const VerifyPrescriptionSchema = z.object({
  prescriptionNumber: z.string().min(1, 'Número de prescripción requerido'),
  patientId: z.string().optional(),
  pharmacyId: z.string().optional(),
  checkDigitalSignature: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validar parámetros de verificación
    const verifyData = VerifyPrescriptionSchema.parse(queryParams);

    // Buscar prescripción por número
    const prescriptionsQuery = adminDb
      .collection('prescriptions')
      .where('prescriptionNumber', '==', verifyData.prescriptionNumber);

    const prescriptionsSnapshot = await prescriptionsQuery.get();

    if (prescriptionsSnapshot.empty) {
      return NextResponse.json(
        createErrorResponse('PRESCRIPTION_NOT_FOUND', 'Prescripción no encontrada'),
        { status: 404 }
      );
    }

    const prescriptionDoc = prescriptionsSnapshot.docs[0];
    const prescriptionData = prescriptionDoc.data();

    // Verificar que la prescripción pertenece al paciente (si se proporciona)
    if (verifyData.patientId && prescriptionData.patientId !== verifyData.patientId) {
      return NextResponse.json(
        createErrorResponse('PRESCRIPTION_MISMATCH', 'La prescripción no pertenece al paciente especificado'),
        { status: 403 }
      );
    }

    // Calcular estado actual de la prescripción
    const now = new Date();
    const validUntil = prescriptionData.validUntil?.toDate?.() ?? new Date(prescriptionData.validUntil);
    const isExpired = validUntil < now;
    const isCancelled = prescriptionData.status === 'cancelled';
      let currentStatus = 'active';
    let verificationStatus = 'valid';
    const warnings: string[] = [];

    if (isCancelled) {
      currentStatus = 'cancelled';
      verificationStatus = 'invalid';
      warnings.push('Prescripción cancelada');
    } else if (isExpired) {
      currentStatus = 'expired';
      verificationStatus = 'invalid';
      warnings.push('Prescripción expirada');
    }

    // Verificar firma digital (simulación)
    let digitalSignatureValid = true;
    if (verifyData.checkDigitalSignature) {
      // En un sistema real, aquí verificaríamos la firma digital criptográfica
      const expectedSignature = `DR_${prescriptionData.doctorId}_${prescriptionData.prescriptionNumber.split('-')[1]}`;
      digitalSignatureValid = prescriptionData.digitalSignature === expectedSignature;
      
      if (!digitalSignatureValid) {
        verificationStatus = 'invalid';
        warnings.push('Firma digital inválida');
      }
    }

    // Verificar si ya fue dispensada
    let dispensingHistory = [];
    try {
      const dispensingQuery = adminDb
        .collection('dispensing_records')
        .where('prescriptionId', '==', prescriptionDoc.id)
        .orderBy('dispensedAt', 'desc');
      
      const dispensingSnapshot = await dispensingQuery.get();
      dispensingHistory = dispensingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dispensedAt: doc.data().dispensedAt?.toDate?.() ?? doc.data().dispensedAt,
      }));

      if (dispensingHistory.length > 0) {
        warnings.push(`Prescripción ya dispensada ${dispensingHistory.length} vez(es)`);
      }
    } catch (error) {
      // Si no existe la colección de dispensing, continuar sin error
      console.log('Dispensing records collection not found');
    }

    // Obtener información del doctor y paciente
    const [doctorDoc, patientDoc] = await Promise.all([
      adminDb.collection('users').doc(prescriptionData.doctorId).get(),
      adminDb.collection('users').doc(prescriptionData.patientId).get(),
    ]);

    // Obtener perfil del doctor para licencia
    const doctorProfileDoc = await adminDb.collection('doctors').doc(prescriptionData.doctorId).get();
    const doctorProfile = doctorProfileDoc.exists ? doctorProfileDoc.data() : null;

    // Verificar licencia del doctor
    if (doctorProfile && !doctorProfile.isVerified) {
      verificationStatus = 'warning';
      warnings.push('Doctor no verificado');
    }

    const verificationResult = {
      prescriptionId: prescriptionDoc.id,
      prescriptionNumber: prescriptionData.prescriptionNumber,
      status: currentStatus,
      verificationStatus, // 'valid', 'invalid', 'warning'
      digitalSignatureValid,
      isExpired,
      isCancelled,
      daysUntilExpiry: Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      warnings,
      
      // Información de la prescripción
      medications: prescriptionData.medications,
      diagnosis: prescriptionData.diagnosis,
      createdAt: prescriptionData.createdAt?.toDate?.() ?? prescriptionData.createdAt,
      validUntil: prescriptionData.validUntil?.toDate?.() ?? prescriptionData.validUntil,
      
      // Información del doctor
      doctor: doctorDoc.exists ? {
        id: prescriptionData.doctorId,
        firstName: doctorDoc.data()?.firstName,
        lastName: doctorDoc.data()?.lastName,
        email: doctorDoc.data()?.email,
        licenseNumber: doctorProfile?.licenseNumber,
        isVerified: doctorProfile?.isVerified ?? false,
        specialties: doctorProfile?.specialties ?? [],
      } : null,
      
      // Información del paciente
      patient: patientDoc.exists ? {
        id: prescriptionData.patientId,
        firstName: patientDoc.data()?.firstName,
        lastName: patientDoc.data()?.lastName,
        email: patientDoc.data()?.email,
      } : null,
      
      // Historial de dispensing (si existe)
      dispensingHistory: dispensingHistory.slice(0, 5), // Últimas 5 dispensaciones
      
      // Metadata de verificación
      verifiedAt: now,
      verifiedBy: verifyData.pharmacyId ? { pharmacyId: verifyData.pharmacyId } : null,
    };

    // Registrar la verificación para auditoría
    try {
      await adminDb.collection('prescription_verifications').add({
        prescriptionId: prescriptionDoc.id,
        prescriptionNumber: prescriptionData.prescriptionNumber,
        verificationStatus,
        verifiedAt: now,
        verifiedBy: verifyData.pharmacyId || 'unknown',
        warnings,
      });
    } catch (error) {
      console.log('Could not log verification audit trail:', error);
    }

    return NextResponse.json(
      createSuccessResponse(verificationResult),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error verifying prescription:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Parámetros de verificación inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('VERIFY_PRESCRIPTION_FAILED', 'Error al verificar prescripción'),
      { status: 500 }
    );
  }
}

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
    
    // Validar datos de verificación
    const verifyData = VerifyPrescriptionSchema.parse(body);

    // Marcar como dispensada si es una farmacia
    if (verifyData.pharmacyId) {
      // Buscar prescripción
      const prescriptionsQuery = adminDb
        .collection('prescriptions')
        .where('prescriptionNumber', '==', verifyData.prescriptionNumber);

      const prescriptionsSnapshot = await prescriptionsQuery.get();

      if (!prescriptionsSnapshot.empty) {
        const prescriptionDoc = prescriptionsSnapshot.docs[0];
        
        // Registrar dispensación
        await adminDb.collection('dispensing_records').add({
          prescriptionId: prescriptionDoc.id,
          prescriptionNumber: verifyData.prescriptionNumber,
          pharmacyId: verifyData.pharmacyId,
          dispensedAt: new Date(),
          dispensedBy: 'pharmacy_system', // En un sistema real, vendría del token JWT
        });

        return NextResponse.json(
          createSuccessResponse({
            message: 'Prescripción verificada y marcada como dispensada',
            prescriptionId: prescriptionDoc.id,
            dispensedAt: new Date(),
          }),
          { status: 200 }
        );
      }
    }

    // Si no es farmacia o no se encuentra la prescripción, solo verificar
    return NextResponse.json(
      createErrorResponse('PRESCRIPTION_NOT_FOUND', 'Prescripción no encontrada para dispensar'),
      { status: 404 }
    );
  } catch (error) {
    console.error('Error dispensing prescription:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos de dispensación inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('DISPENSE_PRESCRIPTION_FAILED', 'Error al dispensar prescripción'),
      { status: 500 }
    );
  }
}
