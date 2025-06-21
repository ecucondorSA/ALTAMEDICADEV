import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@altamedica/shared';
import { adminAuth, adminDb } from '@altamedica/firebase';
import { AppointmentSchema } from '@altamedica/types';

// GET - Lista todas las citas
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('MISSING_TOKEN', 'Token de autorización requerido'),
        { status: 401 }
      );
    }

    const idToken = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid } = decodedToken;

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const doctorId = searchParams.get('doctorId');
    const patientId = searchParams.get('patientId');

    // Construir consulta
    let query = adminDb.collection('appointments').orderBy('scheduledAt', 'desc');

    // Filtros opcionales
    if (status) {
      query = query.where('status', '==', status);
    }
    if (doctorId) {
      query = query.where('doctorId', '==', doctorId);
    }
    if (patientId) {
      query = query.where('patientId', '==', patientId);
    }

    // Aplicar paginación
    query = query.limit(limit).offset(offset);

    const snapshot = await query.get();
    const appointments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Obtener información adicional de doctores y pacientes
    const enrichedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        const [doctorDoc, patientDoc] = await Promise.all([
          adminDb.collection('users').doc(appointment.doctorId).get(),
          adminDb.collection('users').doc(appointment.patientId).get(),
        ]);

        return {
          ...appointment,
          doctor: doctorDoc.exists ? {
            uid: doctorDoc.id,
            firstName: doctorDoc.data()?.firstName,
            lastName: doctorDoc.data()?.lastName,
            email: doctorDoc.data()?.email,
          } : null,
          patient: patientDoc.exists ? {
            uid: patientDoc.id,
            firstName: patientDoc.data()?.firstName,
            lastName: patientDoc.data()?.lastName,
            email: patientDoc.data()?.email,
          } : null,
        };
      })
    );

    const responseData = {
      appointments: enrichedAppointments,
      pagination: {
        limit,
        offset,
        total: snapshot.size,
      },
    };

    return NextResponse.json(createSuccessResponse(responseData), { status: 200 });
  } catch (error: any) {
    console.error('Get appointments error:', error);
    return NextResponse.json(
      createErrorResponse('GET_APPOINTMENTS_FAILED', 'Error al obtener citas'),
      { status: 500 }
    );
  }
}

// POST - Crear nueva cita
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('MISSING_TOKEN', 'Token de autorización requerido'),
        { status: 401 }
      );
    }

    const idToken = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid } = decodedToken;

    const body = await request.json();
    
    // Validar entrada
    const validatedData = AppointmentSchema.parse({
      ...body,
      scheduledAt: new Date(body.scheduledAt),
    });

    // Verificar que el doctor y paciente existen
    const [doctorDoc, patientDoc] = await Promise.all([
      adminDb.collection('users').doc(validatedData.doctorId).get(),
      adminDb.collection('users').doc(validatedData.patientId).get(),
    ]);

    if (!doctorDoc.exists || doctorDoc.data()?.role !== 'doctor') {
      return NextResponse.json(
        createErrorResponse('INVALID_DOCTOR', 'Doctor no válido'),
        { status: 400 }
      );
    }

    if (!patientDoc.exists || patientDoc.data()?.role !== 'patient') {
      return NextResponse.json(
        createErrorResponse('INVALID_PATIENT', 'Paciente no válido'),
        { status: 400 }
      );
    }

    // Verificar disponibilidad del doctor
    const conflictQuery = adminDb
      .collection('appointments')
      .where('doctorId', '==', validatedData.doctorId)
      .where('status', 'in', ['scheduled', 'confirmed', 'in-progress'])
      .where('scheduledAt', '>=', validatedData.scheduledAt)
      .where('scheduledAt', '<', new Date(validatedData.scheduledAt.getTime() + validatedData.duration * 60000));

    const conflictSnapshot = await conflictQuery.get();
    
    if (!conflictSnapshot.empty) {
      return NextResponse.json(
        createErrorResponse('TIME_CONFLICT', 'El doctor no está disponible en ese horario'),
        { status: 409 }
      );
    }

    // Crear la cita
    const appointmentData = {
      ...validatedData,
      createdBy: uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection('appointments').add(appointmentData);

    const responseData = {
      appointment: {
        id: docRef.id,
        ...appointmentData,
      },
      message: 'Cita creada exitosamente',
    };

    return NextResponse.json(createSuccessResponse(responseData), { status: 201 });
  } catch (error: any) {
    console.error('Create appointment error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos de entrada inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('CREATE_APPOINTMENT_FAILED', 'Error al crear cita'),
      { status: 500 }
    );
  }
}
