import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

// Schema para actualizar récord médico
const UpdateMedicalRecordSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  diagnosis: z.array(z.string()).optional(),
  symptoms: z.array(z.string()).optional(),
  treatments: z.array(z.string()).optional(),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
  })).optional(),
  vitals: z.object({
    bloodPressure: z.string().optional(),
    heartRate: z.number().optional(),
    temperature: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  labResults: z.array(z.object({
    test: z.string(),
    result: z.string(),
    normalRange: z.string().optional(),
  })).optional(),
  attachments: z.array(z.string()).optional(),
  isConfidential: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // Obtener récord médico
    const recordDoc = await adminDb.collection('medical_records').doc(id).get();
    if (!recordDoc.exists) {
      return NextResponse.json(
        createErrorResponse('MEDICAL_RECORD_NOT_FOUND', 'Récord médico no encontrado'),
        { status: 404 }
      );
    }

    const recordData = recordDoc.data();

    // Obtener información del doctor y paciente
    const [doctorDoc, patientDoc] = await Promise.all([
      adminDb.collection('users').doc(recordData!.doctorId).get(),
      adminDb.collection('users').doc(recordData!.patientId).get(),
    ]);

    // Obtener perfil del doctor para especialidades
    const doctorProfileDoc = await adminDb.collection('doctors').doc(recordData!.doctorId).get();
    const doctorProfile = doctorProfileDoc.exists ? doctorProfileDoc.data() : null;

    // Obtener perfil del paciente para información médica
    const patientProfileDoc = await adminDb.collection('patients').doc(recordData!.patientId).get();
    const patientProfile = patientProfileDoc.exists ? patientProfileDoc.data() : null;

    // Si está asociado a una cita, obtener información de la cita
    let appointmentInfo = null;
    if (recordData!.appointmentId) {
      const appointmentDoc = await adminDb.collection('appointments').doc(recordData!.appointmentId).get();
      if (appointmentDoc.exists) {
        const appointmentData = appointmentDoc.data();
        appointmentInfo = {
          id: recordData!.appointmentId,
          scheduledAt: appointmentData?.scheduledAt?.toDate?.() ?? appointmentData?.scheduledAt,
          status: appointmentData?.status,
          type: appointmentData?.type,
        };
      }
    }

    const medicalRecord = {
      id: recordDoc.id,
      ...recordData,
      createdAt: recordData!.createdAt?.toDate?.() ?? recordData!.createdAt,
      updatedAt: recordData!.updatedAt?.toDate?.() ?? recordData!.updatedAt,
      doctor: doctorDoc.exists ? {
        id: recordData!.doctorId,
        firstName: doctorDoc.data()?.firstName,
        lastName: doctorDoc.data()?.lastName,
        email: doctorDoc.data()?.email,
        specialties: doctorProfile?.specialties ?? [],
        licenseNumber: doctorProfile?.licenseNumber,
      } : null,
      patient: patientDoc.exists ? {
        id: recordData!.patientId,
        firstName: patientDoc.data()?.firstName,
        lastName: patientDoc.data()?.lastName,
        email: patientDoc.data()?.email,
        dateOfBirth: patientProfile?.dateOfBirth?.toDate?.() ?? patientProfile?.dateOfBirth,
        bloodType: patientProfile?.bloodType,
        allergies: patientProfile?.allergies,
      } : null,
      appointment: appointmentInfo,
    };

    return NextResponse.json(
      createSuccessResponse(medicalRecord),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching medical record:', error);
    return NextResponse.json(
      createErrorResponse('FETCH_MEDICAL_RECORD_FAILED', 'Error al obtener récord médico'),
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'),
        { status: 401 }
      );
    }

    // Verificar que el récord existe
    const recordDoc = await adminDb.collection('medical_records').doc(id).get();
    if (!recordDoc.exists) {
      return NextResponse.json(
        createErrorResponse('MEDICAL_RECORD_NOT_FOUND', 'Récord médico no encontrado'),
        { status: 404 }
      );
    }

    const body = await request.json();
    
    // Validar datos de actualización
    const updateData = UpdateMedicalRecordSchema.parse(body);

    // Actualizar el récord médico
    const now = new Date();
    const updatedRecord = {
      ...updateData,
      updatedAt: now,
    };

    await adminDb.collection('medical_records').doc(id).update(updatedRecord);

    // Obtener el récord actualizado con información completa
    const updatedDoc = await adminDb.collection('medical_records').doc(id).get();
    const recordData = updatedDoc.data();

    // Obtener información del doctor y paciente
    const [doctorDoc, patientDoc] = await Promise.all([
      adminDb.collection('users').doc(recordData!.doctorId).get(),
      adminDb.collection('users').doc(recordData!.patientId).get(),
    ]);

    return NextResponse.json(
      createSuccessResponse({
        id: updatedDoc.id,
        ...recordData,
        createdAt: recordData!.createdAt?.toDate?.() ?? recordData!.createdAt,
        updatedAt: recordData!.updatedAt?.toDate?.() ?? recordData!.updatedAt,
        doctor: doctorDoc.exists ? {
          id: recordData!.doctorId,
          firstName: doctorDoc.data()?.firstName,
          lastName: doctorDoc.data()?.lastName,
          email: doctorDoc.data()?.email,
        } : null,
        patient: patientDoc.exists ? {
          id: recordData!.patientId,
          firstName: patientDoc.data()?.firstName,
          lastName: patientDoc.data()?.lastName,
          email: patientDoc.data()?.email,
        } : null,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating medical record:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos de actualización inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('UPDATE_MEDICAL_RECORD_FAILED', 'Error al actualizar récord médico'),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Token de autorización requerido'),
        { status: 401 }
      );
    }

    // Verificar que el récord existe
    const recordDoc = await adminDb.collection('medical_records').doc(id).get();
    if (!recordDoc.exists) {
      return NextResponse.json(
        createErrorResponse('MEDICAL_RECORD_NOT_FOUND', 'Récord médico no encontrado'),
        { status: 404 }
      );
    }

    const recordData = recordDoc.data();

    // Soft delete - marcar como eliminado pero preservar datos por compliance
    const now = new Date();
    await adminDb.collection('medical_records').doc(id).update({
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
      // Preservar datos originales para auditoría
      originalData: recordData,
    });

    return NextResponse.json(
      createSuccessResponse(
        {
          id,
          message: 'Récord médico eliminado exitosamente',
          deletedAt: now,
        }
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting medical record:', error);
    return NextResponse.json(
      createErrorResponse('DELETE_MEDICAL_RECORD_FAILED', 'Error al eliminar récord médico'),
      { status: 500 }
    );
  }
}
