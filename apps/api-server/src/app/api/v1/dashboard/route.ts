import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema para query de dashboard
const DashboardQuerySchema = z.object({
  role: z.enum(['doctor', 'patient', 'admin']).optional(),
  period: z.enum(['today', 'week', 'month', 'year']).optional().default('week'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const queryData = DashboardQuerySchema.parse(queryParams);

    // Calcular rango de fechas
    const now = new Date();
    let startDate: Date;
    const endDate: Date = new Date(now);

    switch (queryData.period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Obtener estadísticas generales
    const [
      doctorsSnapshot,
      patientsSnapshot,
      appointmentsSnapshot,
      prescriptionsSnapshot
    ] = await Promise.all([
      adminDb.collection('doctors').get(),
      adminDb.collection('patients').get(),
      adminDb.collection('appointments')
        .where('scheduledAt', '>=', startDate)
        .where('scheduledAt', '<=', endDate)
        .get(),
      adminDb.collection('prescriptions')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get()
    ]);

    const appointments = appointmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledAt: doc.data().scheduledAt?.toDate?.() ?? doc.data().scheduledAt,
    }));

    const prescriptions = prescriptionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() ?? doc.data().createdAt,
    }));

    // Estadísticas por rol
    let dashboardData;

    if (queryData.role === 'doctor') {
      // Dashboard específico para doctores
      const completedAppointments = appointments.filter(apt => apt.status === 'completed');
      const upcomingAppointments = appointments.filter(apt => 
        ['scheduled', 'confirmed'].includes(apt.status) && 
        new Date(apt.scheduledAt) > now
      );

      dashboardData = {
        overview: {
          totalAppointments: appointments.length,
          completedAppointments: completedAppointments.length,
          upcomingAppointments: upcomingAppointments.length,
          prescriptionsIssued: prescriptions.length,
        },
        recentActivity: appointments
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
          .slice(0, 5),
        upcomingToday: upcomingAppointments
          .filter(apt => {
            const aptDate = new Date(apt.scheduledAt);
            return aptDate.toDateString() === now.toDateString();
          })
          .slice(0, 3),
      };
    } else if (queryData.role === 'patient') {
      // Dashboard específico para pacientes
      const upcomingAppointments = appointments.filter(apt => 
        ['scheduled', 'confirmed'].includes(apt.status) && 
        new Date(apt.scheduledAt) > now
      );

      const activePrescriptions = prescriptions.filter(pres => {
        const validUntil = pres.validUntil?.toDate?.() ?? new Date(pres.validUntil);
        return validUntil > now && pres.status !== 'cancelled';
      });

      dashboardData = {
        overview: {
          upcomingAppointments: upcomingAppointments.length,
          activePrescriptions: activePrescriptions.length,
          completedAppointments: appointments.filter(apt => apt.status === 'completed').length,
        },
        nextAppointment: upcomingAppointments[0] || null,
        activePrescriptions: activePrescriptions.slice(0, 3),
        recentActivity: appointments
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
          .slice(0, 5),
      };
    } else {
      // Dashboard general/admin
      const totalDoctors = doctorsSnapshot.size;
      const totalPatients = patientsSnapshot.size;
      const verifiedDoctors = doctorsSnapshot.docs.filter(doc => doc.data().isVerified).length;

      dashboardData = {
        overview: {
          totalDoctors,
          totalPatients,
          verifiedDoctors,
          totalAppointments: appointments.length,
          totalPrescriptions: prescriptions.length,
        },
        appointmentsByStatus: appointments.reduce((acc: Record<string, number>, apt) => {
          acc[apt.status] = (acc[apt.status] || 0) + 1;
          return acc;
        }, {}),
        dailyStats: generateDailyStats(appointments, startDate, endDate),
        recentRegistrations: {
          doctors: doctorsSnapshot.docs
            .sort((a, b) => {
              const aDate = a.data().createdAt?.toDate?.() ?? new Date(a.data().createdAt);
              const bDate = b.data().createdAt?.toDate?.() ?? new Date(b.data().createdAt);
              return bDate.getTime() - aDate.getTime();
            })
            .slice(0, 5)
            .map(doc => ({ id: doc.id, ...doc.data() })),
          patients: patientsSnapshot.docs
            .sort((a, b) => {
              const aDate = a.data().createdAt?.toDate?.() ?? new Date(a.data().createdAt);
              const bDate = b.data().createdAt?.toDate?.() ?? new Date(b.data().createdAt);
              return bDate.getTime() - aDate.getTime();
            })
            .slice(0, 5)
            .map(doc => ({ id: doc.id, ...doc.data() })),
        },
      };
    }

    return NextResponse.json(
      createSuccessResponse({
        period: queryData.period,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        data: dashboardData,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Parámetros de consulta inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('FETCH_DASHBOARD_FAILED', 'Error al obtener datos del dashboard'),
      { status: 500 }
    );
  }
}

// Helper function para generar estadísticas diarias
function generateDailyStats(appointments: any[], startDate: Date, endDate: Date) {
  const dailyStats: Record<string, { date: string; total: number; completed: number; cancelled: number }> = {};
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    const dayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.scheduledAt);
      return aptDate.toISOString().split('T')[0] === dateKey;
    });

    dailyStats[dateKey] = {
      date: dateKey,
      total: dayAppointments.length,
      completed: dayAppointments.filter(apt => apt.status === 'completed').length,
      cancelled: dayAppointments.filter(apt => apt.status === 'cancelled').length,
    };

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return Object.values(dailyStats);
}
