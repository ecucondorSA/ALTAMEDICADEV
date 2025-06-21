import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createPaginationMeta, createSuccessResponse, validatePagination } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

// Schema para consulta de citas
const AppointmentsQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  status: z.enum(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'all']).optional().default('all'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(['today', 'tomorrow', 'week', 'month']).optional(),
  patientId: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: doctorId } = params;
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const queryData = AppointmentsQuerySchema.parse(queryParams);
    const { page, limit } = validatePagination({
      page: queryData.page,
      limit: queryData.limit,
    });

    // Verificar que el doctor existe
    const doctorDoc = await adminDb.collection('doctors').doc(doctorId).get();
    if (!doctorDoc.exists) {
      return NextResponse.json(
        createErrorResponse('DOCTOR_NOT_FOUND', 'Doctor no encontrado'),
        { status: 404 }
      );
    }

    // Calcular rango de fechas
    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    if (queryData.startDate && queryData.endDate) {
      startDate = new Date(queryData.startDate);
      endDate = new Date(queryData.endDate);
    } else if (queryData.period) {
      switch (queryData.period) {
        case 'today':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'tomorrow':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() + 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setDate(endDate.getDate() + 7);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setMonth(endDate.getMonth() + 1);
          endDate.setHours(23, 59, 59, 999);
          break;
        default:
          startDate = new Date(now);
          endDate = new Date(now);
          endDate.setDate(endDate.getDate() + 7);
      }
    } else {
      // Por defecto, próximos 7 días
      startDate = new Date(now);
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 7);
    }

    // Construir query de Firestore
    let query = adminDb
      .collection('appointments')
      .where('doctorId', '==', doctorId)
      .where('scheduledAt', '>=', startDate)
      .where('scheduledAt', '<=', endDate);

    // Aplicar filtro de estado
    if (queryData.status !== 'all') {
      query = query.where('status', '==', queryData.status);
    }

    // Aplicar filtro de paciente
    if (queryData.patientId) {
      query = query.where('patientId', '==', queryData.patientId);
    }

    // Ordenar por fecha de cita
    query = query.orderBy('scheduledAt', 'asc');

    // Obtener total para paginación
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    // Aplicar paginación
    const offset = (page - 1) * limit;
    query = query.offset(offset).limit(limit);

    const snapshot = await query.get();
    const appointments = [];

    for (const doc of snapshot.docs) {
      const appointmentData = doc.data();
      
      // Obtener información del paciente
      let patientInfo = null;
      if (appointmentData.patientId) {
        try {
          const patientDoc = await adminDb.collection('users').doc(appointmentData.patientId).get();
          if (patientDoc.exists) {
            const patientUserData = patientDoc.data();
            
            // Obtener perfil del paciente
            const patientProfileDoc = await adminDb.collection('patients').doc(appointmentData.patientId).get();
            const patientProfileData = patientProfileDoc.exists ? patientProfileDoc.data() : {};
            
            patientInfo = {
              id: appointmentData.patientId,
              firstName: patientUserData?.firstName,
              lastName: patientUserData?.lastName,
              email: patientUserData?.email,
              phone: patientUserData?.phone,
              avatar: patientUserData?.avatar,
              dateOfBirth: patientProfileData?.dateOfBirth?.toDate?.() ?? patientProfileData?.dateOfBirth,
              gender: patientProfileData?.gender,
              bloodType: patientProfileData?.bloodType,
            };
          }
        } catch (error) {
          console.error(`Error fetching patient data for ${appointmentData.patientId}:`, error);
        }
      }

      appointments.push({
        id: doc.id,
        ...appointmentData,
        scheduledAt: appointmentData.scheduledAt?.toDate?.() ?? appointmentData.scheduledAt,
        createdAt: appointmentData.createdAt?.toDate?.() ?? appointmentData.createdAt,
        updatedAt: appointmentData.updatedAt?.toDate?.() ?? appointmentData.updatedAt,
        patient: patientInfo,
      });
    }

    // Crear estadísticas rápidas
    const stats = {
      total,
      byStatus: appointments.reduce((acc: Record<string, number>, apt) => {
        acc[apt.status] = (acc[apt.status] ?? 0) + 1;
        return acc;
      }, {}),
      upcomingToday: appointments.filter(apt => {
        const aptDate = new Date(apt.scheduledAt);
        const today = new Date();
        return aptDate.toDateString() === today.toDateString() && 
               ['scheduled', 'confirmed'].includes(apt.status);
      }).length,
    };

    const meta = createPaginationMeta(page, limit, total);

    return NextResponse.json(
      createSuccessResponse({
        appointments,
        stats,
      }, meta),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Parámetros de consulta inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('FETCH_APPOINTMENTS_FAILED', 'Error al obtener citas del doctor'),
      { status: 500 }
    );
  }
}
