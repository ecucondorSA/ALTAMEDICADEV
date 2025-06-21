import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@altamedica/shared';
import { adminAuth, adminDb } from '@altamedica/firebase';

interface RouteParams {
  params: { id: string };
}

// GET - Obtener cita específica
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    await adminAuth.verifyIdToken(idToken);

    const { id } = params;

    // Obtener la cita
    const appointmentDoc = await adminDb.collection('appointments').doc(id).get();
    
    if (!appointmentDoc.exists) {
      return NextResponse.json(
        createErrorResponse('APPOINTMENT_NOT_FOUND', 'Cita no encontrada'),
        { status: 404 }
      );
    }

    const appointmentData = appointmentDoc.data();

    // Obtener información del doctor y paciente
    const [doctorDoc, patientDoc] = await Promise.all([
      adminDb.collection('users').doc(appointmentData!.doctorId).get(),
      adminDb.collection('users').doc(appointmentData!.patientId).get(),
    ]);

    const responseData = {
      appointment: {
        id: appointmentDoc.id,
        ...appointmentData,
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
      },
    };

    return NextResponse.json(createSuccessResponse(responseData), { status: 200 });
  } catch (error: any) {
    console.error('Get appointment error:', error);
    return NextResponse.json(
      createErrorResponse('GET_APPOINTMENT_FAILED', 'Error al obtener cita'),
      { status: 500 }
    );
  }
}

// PUT - Actualizar cita
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const { id } = params;
    const body = await request.json();

    // Verificar que la cita existe
    const appointmentDoc = await adminDb.collection('appointments').doc(id).get();
    
    if (!appointmentDoc.exists) {
      return NextResponse.json(
        createErrorResponse('APPOINTMENT_NOT_FOUND', 'Cita no encontrada'),
        { status: 404 }
      );
    }

    // Campos permitidos para actualización
    const allowedUpdates = ['status', 'notes', 'scheduledAt', 'duration', 'type'];
    const updateData: any = {
      updatedAt: new Date(),
      updatedBy: uid,
    };

    // Solo incluir campos permitidos
    Object.keys(body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateData[key] = key === 'scheduledAt' ? new Date(body[key]) : body[key];
      }
    });

    // Si se actualiza la fecha/hora, verificar disponibilidad
    if (updateData.scheduledAt) {
      const appointmentData = appointmentDoc.data()!;
      const duration = updateData.duration || appointmentData.duration;
      
      const conflictQuery = adminDb
        .collection('appointments')
        .where('doctorId', '==', appointmentData.doctorId)
        .where('status', 'in', ['scheduled', 'confirmed', 'in-progress'])
        .where('scheduledAt', '>=', updateData.scheduledAt)
        .where('scheduledAt', '<', new Date(updateData.scheduledAt.getTime() + duration * 60000));

      const conflictSnapshot = await conflictQuery.get();
      
      // Filtrar el documento actual
      const conflicts = conflictSnapshot.docs.filter(doc => doc.id !== id);
      
      if (conflicts.length > 0) {
        return NextResponse.json(
          createErrorResponse('TIME_CONFLICT', 'El doctor no está disponible en ese horario'),
          { status: 409 }
        );
      }
    }

    // Actualizar la cita
    await adminDb.collection('appointments').doc(id).update(updateData);

    // Obtener la cita actualizada
    const updatedDoc = await adminDb.collection('appointments').doc(id).get();

    const responseData = {
      appointment: {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
      message: 'Cita actualizada exitosamente',
    };

    return NextResponse.json(createSuccessResponse(responseData), { status: 200 });
  } catch (error: any) {
    console.error('Update appointment error:', error);
    return NextResponse.json(
      createErrorResponse('UPDATE_APPOINTMENT_FAILED', 'Error al actualizar cita'),
      { status: 500 }
    );
  }
}

// DELETE - Cancelar/eliminar cita
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = params;

    // Verificar que la cita existe
    const appointmentDoc = await adminDb.collection('appointments').doc(id).get();
    
    if (!appointmentDoc.exists) {
      return NextResponse.json(
        createErrorResponse('APPOINTMENT_NOT_FOUND', 'Cita no encontrada'),
        { status: 404 }
      );
    }

    // Marcar como cancelada en lugar de eliminar
    await adminDb.collection('appointments').doc(id).update({
      status: 'cancelled',
      updatedAt: new Date(),
      cancelledBy: uid,
      cancelledAt: new Date(),
    });

    const responseData = {
      message: 'Cita cancelada exitosamente',
      appointmentId: id,
    };

    return NextResponse.json(createSuccessResponse(responseData), { status: 200 });
  } catch (error: any) {
    console.error('Cancel appointment error:', error);
    return NextResponse.json(
      createErrorResponse('CANCEL_APPOINTMENT_FAILED', 'Error al cancelar cita'),
      { status: 500 }
    );
  }
}
