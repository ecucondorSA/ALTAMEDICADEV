import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

// Schema para actualizar prescripción
const UpdatePrescriptionSchema = z.object({
  medications: z.array(z.object({
    name: z.string().min(1),
    dosage: z.string().min(1),
    frequency: z.string().min(1),
    duration: z.string().min(1),
    instructions: z.string().optional(),
  })).optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  validUntil: z.string().transform(val => new Date(val)).optional(),
  status: z.enum(['active', 'cancelled']).optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // Obtener prescripción
    const prescriptionDoc = await adminDb.collection('prescriptions').doc(id).get();
    if (!prescriptionDoc.exists) {
      return NextResponse.json(
        createErrorResponse('PRESCRIPTION_NOT_FOUND', 'Prescripción no encontrada'),
        { status: 404 }
      );
    }

    const prescriptionData = prescriptionDoc.data();

    // Obtener información del doctor y paciente
    const [doctorDoc, patientDoc] = await Promise.all([
      adminDb.collection('users').doc(prescriptionData!.doctorId).get(),
      adminDb.collection('users').doc(prescriptionData!.patientId).get(),
    ]);

    // Obtener perfil del doctor para licencia
    const doctorProfileDoc = await adminDb.collection('doctors').doc(prescriptionData!.doctorId).get();
    const doctorProfile = doctorProfileDoc.exists ? doctorProfileDoc.data() : null;

    // Calcular estado actual
    const now = new Date();
    const validUntil = prescriptionData!.validUntil?.toDate?.() ?? new Date(prescriptionData!.validUntil);
    const isExpired = validUntil < now;
    const isCancelled = prescriptionData!.status === 'cancelled';
    
    let currentStatus = 'active';
    if (isCancelled) currentStatus = 'cancelled';
    else if (isExpired) currentStatus = 'expired';

    const prescription = {
      id: prescriptionDoc.id,
      ...prescriptionData,
      status: currentStatus,
      isExpired,
      daysUntilExpiry: Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      createdAt: prescriptionData!.createdAt?.toDate?.() ?? prescriptionData!.createdAt,
      updatedAt: prescriptionData!.updatedAt?.toDate?.() ?? prescriptionData!.updatedAt,
      validUntil: prescriptionData!.validUntil?.toDate?.() ?? prescriptionData!.validUntil,
      doctor: doctorDoc.exists ? {
        id: prescriptionData!.doctorId,
        firstName: doctorDoc.data()?.firstName,
        lastName: doctorDoc.data()?.lastName,
        email: doctorDoc.data()?.email,
        licenseNumber: doctorProfile?.licenseNumber,
        specialties: doctorProfile?.specialties,
      } : null,
      patient: patientDoc.exists ? {
        id: prescriptionData!.patientId,
        firstName: patientDoc.data()?.firstName,
        lastName: patientDoc.data()?.lastName,
        email: patientDoc.data()?.email,
        dateOfBirth: prescriptionData!.patientDateOfBirth,
      } : null,
    };

    return NextResponse.json(
      createSuccessResponse(prescription),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching prescription:', error);
    return NextResponse.json(
      createErrorResponse('FETCH_PRESCRIPTION_FAILED', 'Error al obtener prescripción'),
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'),
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();

    // Validar datos de actualización
    const updateData = UpdatePrescriptionSchema.parse(body);

    // Verificar que la prescripción existe
    const prescriptionDoc = await adminDb.collection('prescriptions').doc(id).get();
    if (!prescriptionDoc.exists) {
      return NextResponse.json(
        createErrorResponse('PRESCRIPTION_NOT_FOUND', 'Prescripción no encontrada'),
        { status: 404 }
      );
    }

    // Actualizar prescripción
    const now = new Date();
    const updatedData = {
      ...updateData,
      updatedAt: now,
    };

    await adminDb.collection('prescriptions').doc(id).update(updatedData);

    // Obtener datos actualizados
    const updatedDoc = await adminDb.collection('prescriptions').doc(id).get();
    const updatedPrescriptionData = updatedDoc.data();

    // Obtener información del doctor y paciente
    const [doctorDoc, patientDoc] = await Promise.all([
      adminDb.collection('users').doc(updatedPrescriptionData!.doctorId).get(),
      adminDb.collection('users').doc(updatedPrescriptionData!.patientId).get(),
    ]);

    return NextResponse.json(
      createSuccessResponse({
        id: updatedDoc.id,
        ...updatedPrescriptionData,
        createdAt: updatedPrescriptionData!.createdAt?.toDate?.() ?? updatedPrescriptionData!.createdAt,
        updatedAt: updatedPrescriptionData!.updatedAt?.toDate?.() ?? updatedPrescriptionData!.updatedAt,
        validUntil: updatedPrescriptionData!.validUntil?.toDate?.() ?? updatedPrescriptionData!.validUntil,
        doctor: doctorDoc.exists ? {
          id: updatedPrescriptionData!.doctorId,
          firstName: doctorDoc.data()?.firstName,
          lastName: doctorDoc.data()?.lastName,
          email: doctorDoc.data()?.email,
        } : null,
        patient: patientDoc.exists ? {
          id: updatedPrescriptionData!.patientId,
          firstName: patientDoc.data()?.firstName,
          lastName: patientDoc.data()?.lastName,
          email: patientDoc.data()?.email,
        } : null,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating prescription:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos de actualización inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('UPDATE_PRESCRIPTION_FAILED', 'Error al actualizar prescripción'),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'),
        { status: 401 }
      );
    }

    const { id } = params;

    // Verificar que la prescripción existe
    const prescriptionDoc = await adminDb.collection('prescriptions').doc(id).get();
    if (!prescriptionDoc.exists) {
      return NextResponse.json(
        createErrorResponse('PRESCRIPTION_NOT_FOUND', 'Prescripción no encontrada'),
        { status: 404 }
      );
    }

    // Cancelar prescripción (soft delete)
    const now = new Date();
    await adminDb.collection('prescriptions').doc(id).update({
      status: 'cancelled',
      cancelledAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      createSuccessResponse({
        id,
        message: 'Prescripción cancelada exitosamente',
        cancelledAt: now,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting prescription:', error);
    return NextResponse.json(
      createErrorResponse('DELETE_PRESCRIPTION_FAILED', 'Error al cancelar prescripción'),
      { status: 500 }
    );
  }
}
