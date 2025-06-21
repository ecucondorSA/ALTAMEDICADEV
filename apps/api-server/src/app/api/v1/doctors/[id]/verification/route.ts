import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

// Schema para verificación
const VerificationSchema = z.object({
  isVerified: z.boolean(),
  verificationNotes: z.string().optional(),
  verifiedBy: z.string().min(1, 'ID del verificador es requerido'),
  verificationDocuments: z.array(z.string()).optional(),
});

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'),
        { status: 401 }
      );
    }

    const { id: doctorId } = params;
    const body = await request.json();

    // Validar datos de verificación
    const verificationData = VerificationSchema.parse(body);

    // Verificar que el doctor existe
    const doctorDoc = await adminDb.collection('doctors').doc(doctorId).get();
    if (!doctorDoc.exists) {
      return NextResponse.json(
        createErrorResponse('DOCTOR_NOT_FOUND', 'Doctor no encontrado'),
        { status: 404 }
      );
    }

    // Obtener datos del usuario verificador
    const verifierDoc = await adminDb.collection('users').doc(verificationData.verifiedBy).get();
    if (!verifierDoc.exists) {
      return NextResponse.json(
        createErrorResponse('VERIFIER_NOT_FOUND', 'Usuario verificador no encontrado'),
        { status: 404 }
      );
    }

    const verifierData = verifierDoc.data();

    // Actualizar estado de verificación
    const now = new Date();
    const updateData = {
      isVerified: verificationData.isVerified,
      verificationStatus: verificationData.isVerified ? 'verified' : 'rejected',
      verificationDate: now,
      verificationNotes: verificationData.verificationNotes,
      verifiedBy: verificationData.verifiedBy,
      verifierName: `${verifierData?.firstName ?? ''} ${verifierData?.lastName ?? ''}`.trim(),
      verificationDocuments: verificationData.verificationDocuments ?? [],
      updatedAt: now,
    };

    await adminDb.collection('doctors').doc(doctorId).update(updateData);

    // Crear registro de auditoría
    await adminDb.collection('verification_logs').add({
      doctorId,
      action: verificationData.isVerified ? 'verified' : 'rejected',
      verifiedBy: verificationData.verifiedBy,
      verifierName: updateData.verifierName,
      notes: verificationData.verificationNotes,
      documents: verificationData.verificationDocuments,
      timestamp: now,
    });

    // Obtener datos actualizados del doctor
    const updatedDoc = await adminDb.collection('doctors').doc(doctorId).get();
    const updatedDoctorData = updatedDoc.data();

    // Obtener datos del usuario
    const userDoc = await adminDb.collection('users').doc(doctorId).get();
    const userData = userDoc.data();

    const updatedDoctor = {
      id: doctorId,
      ...updatedDoctorData,
      firstName: userData?.firstName,
      lastName: userData?.lastName,
      email: userData?.email,
      phone: userData?.phone,
      avatar: userData?.avatar,
      createdAt: updatedDoctorData?.createdAt?.toDate?.() ?? updatedDoctorData?.createdAt,
      updatedAt: updatedDoctorData?.updatedAt?.toDate?.() ?? updatedDoctorData?.updatedAt,
      verificationDate: updatedDoctorData?.verificationDate?.toDate?.() ?? updatedDoctorData?.verificationDate,
    };

    return NextResponse.json(
      createSuccessResponse({
        doctor: updatedDoctor,
        message: verificationData.isVerified 
          ? 'Doctor verificado exitosamente' 
          : 'Verificación del doctor rechazada',
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating doctor verification:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos de verificación inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('VERIFICATION_UPDATE_FAILED', 'Error al actualizar verificación del doctor'),
      { status: 500 }
    );
  }
}

// Obtener historial de verificación
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: doctorId } = params;

    // Verificar que el doctor existe
    const doctorDoc = await adminDb.collection('doctors').doc(doctorId).get();
    if (!doctorDoc.exists) {
      return NextResponse.json(
        createErrorResponse('DOCTOR_NOT_FOUND', 'Doctor no encontrado'),
        { status: 404 }
      );
    }

    const doctorData = doctorDoc.data();

    // Obtener historial de verificación
    const verificationLogsSnapshot = await adminDb
      .collection('verification_logs')
      .where('doctorId', '==', doctorId)
      .orderBy('timestamp', 'desc')
      .get();

    const verificationHistory = verificationLogsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() ?? doc.data().timestamp,
    }));

    return NextResponse.json(
      createSuccessResponse({
        doctorId,
        currentStatus: {
          isVerified: doctorData?.isVerified ?? false,
          verificationStatus: doctorData?.verificationStatus,
          verificationDate: doctorData?.verificationDate?.toDate?.() ?? doctorData?.verificationDate,
          verificationNotes: doctorData?.verificationNotes,
          verifiedBy: doctorData?.verifiedBy,
          verifierName: doctorData?.verifierName,
          verificationDocuments: doctorData?.verificationDocuments ?? [],
        },
        history: verificationHistory,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching verification history:', error);

    return NextResponse.json(
      createErrorResponse('FETCH_VERIFICATION_FAILED', 'Error al obtener historial de verificación'),
      { status: 500 }
    );
  }
}
