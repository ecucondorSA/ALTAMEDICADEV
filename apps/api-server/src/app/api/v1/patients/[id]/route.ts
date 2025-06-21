import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { UpdatePatientProfileSchema } from '@altamedica/types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

interface AppointmentData {
  status: string;
  scheduledAt: Date | string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // Obtener perfil de paciente
    const patientDoc = await adminDb.collection('patients').doc(id).get();
    if (!patientDoc.exists) {
      return NextResponse.json(
        createErrorResponse('PATIENT_NOT_FOUND', 'Paciente no encontrado'),
        { status: 404 }
      );
    }

    const patientData = patientDoc.data();

    // Obtener datos del usuario asociado
    const userDoc = await adminDb.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        createErrorResponse('USER_NOT_FOUND', 'Usuario asociado no encontrado'),
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Obtener estadísticas de citas del paciente
    const appointmentsSnapshot = await adminDb
      .collection('appointments')
      .where('patientId', '==', id)
      .get();    const appointments = appointmentsSnapshot.docs.map((doc: {data: () => AppointmentData}) => doc.data());
    const appointmentStats = {
      total: appointments.length,
      completed: appointments.filter((apt: AppointmentData) => apt.status === 'completed').length,
      cancelled: appointments.filter((apt: AppointmentData) => apt.status === 'cancelled').length,
      upcoming: appointments.filter((apt: AppointmentData) => 
        ['scheduled', 'confirmed'].includes(apt.status) && 
        new Date(apt.scheduledAt) > new Date()
      ).length,
    };

    // Obtener próxima cita
    const upcomingAppointments = appointments
      .filter((apt: AppointmentData) => 
        ['scheduled', 'confirmed'].includes(apt.status) && 
        new Date(apt.scheduledAt) > new Date()
      )
      .sort((a: AppointmentData, b: AppointmentData) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    const nextAppointment = upcomingAppointments[0] || null;

    // Obtener última cita
    const pastAppointments = appointments
      .filter((apt: AppointmentData) => new Date(apt.scheduledAt) <= new Date())
      .sort((a: AppointmentData, b: AppointmentData) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    const lastAppointment = pastAppointments[0] || null;

    const patient = {
      id: patientDoc.id,
      ...patientData,
      // Datos del usuario
      firstName: userData?.firstName,
      lastName: userData?.lastName,
      email: userData?.email,
      phone: userData?.phone,
      avatar: userData?.avatar,
      isActive: userData?.isActive,
      // Estadísticas
      appointmentStats,
      nextAppointment,
      lastAppointment,
      // Fechas
      createdAt: patientData?.createdAt?.toDate?.() ?? patientData?.createdAt,
      updatedAt: patientData?.updatedAt?.toDate?.() ?? patientData?.updatedAt,
    };

    return NextResponse.json(
      createSuccessResponse(patient),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching patient:', error);
    return NextResponse.json(
      createErrorResponse('FETCH_PATIENT_FAILED', 'Error al obtener paciente'),
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
    const updateData = UpdatePatientProfileSchema.parse(body);

    // Verificar que el paciente existe
    const patientDoc = await adminDb.collection('patients').doc(id).get();
    if (!patientDoc.exists) {
      return NextResponse.json(
        createErrorResponse('PATIENT_NOT_FOUND', 'Paciente no encontrado'),
        { status: 404 }
      );
    }

    // Actualizar perfil de paciente
    const now = new Date();
    const updatedData = {
      ...updateData,
      updatedAt: now,
    };

    await adminDb.collection('patients').doc(id).update(updatedData);

    // Obtener datos actualizados
    const updatedDoc = await adminDb.collection('patients').doc(id).get();
    const updatedPatientData = updatedDoc.data();

    // Obtener datos del usuario
    const userDoc = await adminDb.collection('users').doc(id).get();
    const userData = userDoc.data();

    return NextResponse.json(
      createSuccessResponse({
        id: updatedDoc.id,
        ...updatedPatientData,
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        email: userData?.email,
        phone: userData?.phone,
        avatar: userData?.avatar,
        createdAt: updatedPatientData?.createdAt?.toDate?.() ?? updatedPatientData?.createdAt,
        updatedAt: updatedPatientData?.updatedAt?.toDate?.() ?? updatedPatientData?.updatedAt,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating patient:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos de actualización inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('UPDATE_PATIENT_FAILED', 'Error al actualizar paciente'),
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

    // Verificar que el paciente existe
    const patientDoc = await adminDb.collection('patients').doc(id).get();
    if (!patientDoc.exists) {
      return NextResponse.json(
        createErrorResponse('PATIENT_NOT_FOUND', 'Paciente no encontrado'),
        { status: 404 }
      );
    }

    // Soft delete - marcar como inactivo
    const now = new Date();
    await adminDb.collection('patients').doc(id).update({
      isActive: false,
      deletedAt: now,
      updatedAt: now,
    });

    // También marcar el usuario como inactivo
    await adminDb.collection('users').doc(id).update({
      isActive: false,
      updatedAt: now,
    });

    return NextResponse.json(
      createSuccessResponse({
        id,
        message: 'Paciente desactivado exitosamente',
        deletedAt: now,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting patient:', error);
    return NextResponse.json(
      createErrorResponse('DELETE_PATIENT_FAILED', 'Error al eliminar paciente'),
      { status: 500 }
    );
  }
}
