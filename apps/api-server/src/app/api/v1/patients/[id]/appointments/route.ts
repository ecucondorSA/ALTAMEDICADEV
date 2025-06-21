import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createPaginationMeta, createSuccessResponse, validatePagination } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

// Schema para consulta de citas del paciente
const PatientAppointmentsQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  status: z.enum(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'all']).optional().default('all'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(['upcoming', 'past', 'today', 'week', 'month']).optional(),
  doctorId: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: patientId } = params;
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const queryData = PatientAppointmentsQuerySchema.parse(queryParams);
    const { page, limit } = validatePagination({
      page: queryData.page,
      limit: queryData.limit,
    });

    // Verificar que el paciente existe
    const patientDoc = await adminDb.collection('patients').doc(patientId).get();
    if (!patientDoc.exists) {
      return NextResponse.json(
        createErrorResponse('PATIENT_NOT_FOUND', 'Paciente no encontrado'),
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
        case 'upcoming':
          startDate = new Date(now);
          endDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
          break;
        case 'past':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          endDate = new Date(now);
          break;
        case 'today':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setDate(endDate.getDate() + 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear() + 1, 0, 1);
      }
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear() + 1, 0, 1);
    }

    // Construir query de Firestore
    let query = adminDb
      .collection('appointments')
      .where('patientId', '==', patientId)
      .where('scheduledAt', '>=', startDate)
      .where('scheduledAt', '<=', endDate);

    // Aplicar filtro de estado
    if (queryData.status !== 'all') {
      query = query.where('status', '==', queryData.status);
    }

    // Aplicar filtro de doctor
    if (queryData.doctorId) {
      query = query.where('doctorId', '==', queryData.doctorId);
    }

    // Ordenar por fecha de cita
    query = query.orderBy('scheduledAt', 'desc');

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
      
      // Obtener información del doctor
      const doctorDoc = await adminDb.collection('users').doc(appointmentData.doctorId).get();
      const doctorData = doctorDoc.exists ? doctorDoc.data() : null;

      // Obtener perfil de doctor para especialidades
      const doctorProfileDoc = await adminDb.collection('doctors').doc(appointmentData.doctorId).get();
      const doctorProfile = doctorProfileDoc.exists ? doctorProfileDoc.data() : null;

      appointments.push({
        id: doc.id,
        ...appointmentData,
        scheduledAt: appointmentData.scheduledAt?.toDate?.() ?? appointmentData.scheduledAt,
        createdAt: appointmentData.createdAt?.toDate?.() ?? appointmentData.createdAt,
        doctor: doctorData ? {
          id: appointmentData.doctorId,
          firstName: doctorData.firstName,
          lastName: doctorData.lastName,
          email: doctorData.email,
          specialties: doctorProfile?.specialties ?? [],
          consultationFee: doctorProfile?.consultationFee,
          avatar: doctorData.avatar,
        } : null,
      });
    }

    // Crear estadísticas rápidas
    const stats = {
      total,
      byStatus: appointments.reduce((acc: Record<string, number>, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      }, {}),
      upcomingCount: appointments.filter(apt => 
        ['scheduled', 'confirmed'].includes(apt.status) && 
        new Date(apt.scheduledAt) > now
      ).length,
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
    console.error('Error fetching patient appointments:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Parámetros de consulta inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('FETCH_PATIENT_APPOINTMENTS_FAILED', 'Error al obtener citas del paciente'),
      { status: 500 }
    );
  }
}
