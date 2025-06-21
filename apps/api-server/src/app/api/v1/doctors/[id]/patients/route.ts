import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createPaginationMeta, createSuccessResponse, validatePagination } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

interface AppointmentData {
  id: string;
  patientId: string;
  doctorId: string;
  status: string;
  scheduledAt: Date | string;
  [key: string]: any;
}

// Schema para filtros de pacientes del doctor
const DoctorPatientsQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
  search: z.string().optional(),
  hasUpcomingAppointments: z.string().optional().transform(val => val === 'true'),
  sortBy: z.enum(['name', 'lastAppointment', 'nextAppointment']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: doctorId } = params;
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const queryData = DoctorPatientsQuerySchema.parse(queryParams);
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

    // Obtener todas las citas del doctor para identificar pacientes
    const appointmentsQuery = adminDb
      .collection('appointments')
      .where('doctorId', '==', doctorId);

    const appointmentsSnapshot = await appointmentsQuery.get();
      // Extraer IDs únicos de pacientes
    const patientIds = [...new Set(
      appointmentsSnapshot.docs.map((doc: any) => doc.data().patientId)
    )];

    if (patientIds.length === 0) {
      return NextResponse.json(
        createSuccessResponse([], createPaginationMeta(page, limit, 0)),
        { status: 200 }
      );
    }

    // Obtener información de los pacientes
    const patients = [];
    const now = new Date();

    for (const patientId of patientIds) {
      try {
        // Obtener datos del usuario
        const userDoc = await adminDb.collection('users').doc(patientId).get();
        if (!userDoc.exists) continue;

        const userData = userDoc.data();
        
        // Aplicar filtro de estado
        if (queryData.status !== 'all') {
          const isActive = userData?.isActive === true;
          if (queryData.status === 'active' && !isActive) continue;
          if (queryData.status === 'inactive' && isActive) continue;
        }        // Aplicar filtro de búsqueda
        if (queryData.search) {
          const searchTerm = queryData.search.toLowerCase();
          const searchableText = `${userData?.firstName ?? ''} ${userData?.lastName ?? ''} ${userData?.email ?? ''}`.toLowerCase();
          if (!searchableText.includes(searchTerm)) continue;
        }

        // Obtener perfil de paciente
        const patientDoc = await adminDb.collection('patients').doc(patientId).get();
        const patientData = patientDoc.exists ? patientDoc.data() : {};        // Obtener estadísticas de citas con este doctor
        const patientAppointments = appointmentsSnapshot.docs
          .filter((doc: any) => doc.data().patientId === patientId)
          .map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
            scheduledAt: doc.data().scheduledAt?.toDate?.() ?? doc.data().scheduledAt,
          }));

        // Calcular estadísticas
        const totalAppointments = patientAppointments.length;
        const completedAppointments = patientAppointments.filter(apt => apt.status === 'completed').length;
        const cancelledAppointments = patientAppointments.filter(apt => apt.status === 'cancelled').length;
        
        const upcomingAppointments = patientAppointments
          .filter(apt => 
            ['scheduled', 'confirmed'].includes(apt.status) && 
            new Date(apt.scheduledAt) > now
          )
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

        const pastAppointments = patientAppointments
          .filter(apt => new Date(apt.scheduledAt) <= now)
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

        // Aplicar filtro de citas próximas
        if (queryData.hasUpcomingAppointments !== undefined) {
          const hasUpcoming = upcomingAppointments.length > 0;
          if (queryData.hasUpcomingAppointments && !hasUpcoming) continue;
          if (!queryData.hasUpcomingAppointments && hasUpcoming) continue;
        }

        const patient = {
          id: patientId,
          // Datos del usuario
          firstName: userData?.firstName,
          lastName: userData?.lastName,
          email: userData?.email,
          phone: userData?.phone,
          avatar: userData?.avatar,
          isActive: userData?.isActive,
          // Datos del perfil de paciente
          dateOfBirth: patientData?.dateOfBirth?.toDate?.() || patientData?.dateOfBirth,
          gender: patientData?.gender,
          bloodType: patientData?.bloodType,
          // Estadísticas con este doctor
          appointmentStats: {
            total: totalAppointments,
            completed: completedAppointments,
            cancelled: cancelledAppointments,
            upcoming: upcomingAppointments.length,
          },
          // Próxima cita
          nextAppointment: upcomingAppointments[0] || null,
          // Última cita
          lastAppointment: pastAppointments[0] || null,
          // Fechas importantes
          firstAppointment: patientAppointments
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] || null,
        };

        patients.push(patient);
      } catch (error) {
        console.error(`Error processing patient ${patientId}:`, error);
        continue;
      }
    }

    // Aplicar ordenamiento
    patients.sort((a, b) => {
      let comparison = 0;
      
      switch (queryData.sortBy) {
        case 'name':
          const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        case 'lastAppointment':
          const lastA = a.lastAppointment ? new Date(a.lastAppointment.scheduledAt).getTime() : 0;
          const lastB = b.lastAppointment ? new Date(b.lastAppointment.scheduledAt).getTime() : 0;
          comparison = lastA - lastB;
          break;
        case 'nextAppointment':
          const nextA = a.nextAppointment ? new Date(a.nextAppointment.scheduledAt).getTime() : Infinity;
          const nextB = b.nextAppointment ? new Date(b.nextAppointment.scheduledAt).getTime() : Infinity;
          comparison = nextA - nextB;
          break;
      }
      
      return queryData.sortOrder === 'desc' ? -comparison : comparison;
    });

    // Aplicar paginación
    const total = patients.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPatients = patients.slice(startIndex, endIndex);

    const meta = createPaginationMeta(page, limit, total);

    return NextResponse.json(
      createSuccessResponse(paginatedPatients, meta),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching doctor patients:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Parámetros de consulta inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('FETCH_DOCTOR_PATIENTS_FAILED', 'Error al obtener pacientes del doctor'),
      { status: 500 }
    );
  }
}
