import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { UpdateDoctorProfileSchema } from '@altamedica/types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // Obtener perfil de doctor
    const doctorDoc = await adminDb.collection('doctors').doc(id).get();
    if (!doctorDoc.exists) {
      return NextResponse.json(
        createErrorResponse('DOCTOR_NOT_FOUND', 'Doctor no encontrado'),
        { status: 404 }
      );
    }

    const doctorData = doctorDoc.data();

    // Obtener datos del usuario asociado
    const userDoc = await adminDb.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        createErrorResponse('USER_NOT_FOUND', 'Usuario asociado no encontrado'),
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Obtener información de la compañía si existe
    let companyData = null;
    if (doctorData?.companyId) {
      const companyDoc = await adminDb.collection('companies').doc(doctorData.companyId).get();
      if (companyDoc.exists) {
        companyData = {
          id: companyDoc.id,
          name: companyDoc.data()?.name,
          logo: companyDoc.data()?.logo,
        };
      }
    }

    const doctor = {
      id: doctorDoc.id,
      ...doctorData,
      // Datos del usuario
      firstName: userData?.firstName,
      lastName: userData?.lastName,
      email: userData?.email,
      phone: userData?.phone,
      avatar: userData?.avatar,
      isActive: userData?.isActive,
      // Datos de la compañía
      company: companyData,      // Convertir timestamps
      createdAt: doctorData?.createdAt?.toDate?.() ?? doctorData?.createdAt,
      updatedAt: doctorData?.updatedAt?.toDate?.() ?? doctorData?.updatedAt,
    };

    return NextResponse.json(
      createSuccessResponse(doctor),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching doctor:', error);
    return NextResponse.json(
      createErrorResponse('FETCH_DOCTOR_FAILED', 'Error al obtener doctor'),
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
    const updateData = UpdateDoctorProfileSchema.parse(body);

    // Verificar que el doctor existe
    const doctorDoc = await adminDb.collection('doctors').doc(id).get();
    if (!doctorDoc.exists) {
      return NextResponse.json(
        createErrorResponse('DOCTOR_NOT_FOUND', 'Doctor no encontrado'),
        { status: 404 }
      );
    }

    // Actualizar perfil de doctor
    const now = new Date();
    const updatedData = {
      ...updateData,
      updatedAt: now,
    };

    await adminDb.collection('doctors').doc(id).update(updatedData);

    // Obtener datos actualizados
    const updatedDoc = await adminDb.collection('doctors').doc(id).get();
    const updatedDoctorData = updatedDoc.data();

    // Obtener datos del usuario
    const userDoc = await adminDb.collection('users').doc(id).get();
    const userData = userDoc.data();

    const updatedDoctor = {
      id: updatedDoc.id,
      ...updatedDoctorData,
      firstName: userData?.firstName,
      lastName: userData?.lastName,
      email: userData?.email,      phone: userData?.phone,
      avatar: userData?.avatar,
      createdAt: updatedDoctorData?.createdAt?.toDate?.() ?? updatedDoctorData?.createdAt,
      updatedAt: updatedDoctorData?.updatedAt?.toDate?.() ?? updatedDoctorData?.updatedAt,
    };

    return NextResponse.json(
      createSuccessResponse(updatedDoctor),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating doctor:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos de actualización inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('UPDATE_DOCTOR_FAILED', 'Error al actualizar doctor'),
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

    // Verificar que el doctor existe
    const doctorDoc = await adminDb.collection('doctors').doc(id).get();
    if (!doctorDoc.exists) {
      return NextResponse.json(
        createErrorResponse('DOCTOR_NOT_FOUND', 'Doctor no encontrado'),
        { status: 404 }
      );
    }

    // Verificar que no tiene citas activas
    const activeAppointments = await adminDb
      .collection('appointments')
      .where('doctorId', '==', id)
      .where('status', 'in', ['scheduled', 'confirmed', 'in-progress'])
      .limit(1)
      .get();

    if (!activeAppointments.empty) {
      return NextResponse.json(
        createErrorResponse('DOCTOR_HAS_ACTIVE_APPOINTMENTS', 'No se puede eliminar doctor con citas activas'),
        { status: 400 }
      );
    }

    // Eliminar perfil de doctor
    await adminDb.collection('doctors').doc(id).delete();

    return NextResponse.json(
      createSuccessResponse({ message: 'Doctor eliminado exitosamente' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting doctor:', error);
    return NextResponse.json(
      createErrorResponse('DELETE_DOCTOR_FAILED', 'Error al eliminar doctor'),
      { status: 500 }
    );
  }
}
