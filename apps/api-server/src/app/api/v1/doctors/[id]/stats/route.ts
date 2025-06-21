import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

// Schema para query de estadísticas
const StatsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).optional().default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: doctorId } = params;
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const queryData = StatsQuerySchema.parse(queryParams);

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
    let endDate: Date = new Date();

    if (queryData.startDate && queryData.endDate) {
      startDate = new Date(queryData.startDate);
      endDate = new Date(queryData.endDate);
    } else {
      const now = new Date();
      switch (queryData.period) {
        case 'day':
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
    }

    // Obtener todas las citas del doctor en el período
    const appointmentsSnapshot = await adminDb
      .collection('appointments')
      .where('doctorId', '==', doctorId)
      .where('scheduledAt', '>=', startDate)
      .where('scheduledAt', '<=', endDate)
      .get();

    const appointments = appointmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledAt: doc.data().scheduledAt?.toDate?.() || doc.data().scheduledAt,
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    }));

    // Calcular estadísticas básicas
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
    const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled').length;
    const noShowAppointments = appointments.filter(apt => apt.status === 'no-show').length;
    const scheduledAppointments = appointments.filter(apt => 
      ['scheduled', 'confirmed', 'in-progress'].includes(apt.status)
    ).length;

    // Calcular ingresos (si hay consultationFee)
    const doctorData = doctorDoc.data();
    const consultationFee = doctorData?.consultationFee || 0;
    const totalRevenue = completedAppointments * consultationFee;

    // Estadísticas por tipo de cita
    const appointmentsByType = appointments.reduce((acc, apt) => {
      acc[apt.type] = (acc[apt.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Pacientes únicos atendidos
    const uniquePatients = [...new Set(appointments.map(apt => apt.patientId))];
    const totalPatients = uniquePatients.length;

    // Nuevos pacientes (primera cita con este doctor)
    let newPatients = 0;
    for (const patientId of uniquePatients) {
      const allPatientAppointments = await adminDb
        .collection('appointments')
        .where('doctorId', '==', doctorId)
        .where('patientId', '==', patientId)
        .orderBy('scheduledAt', 'asc')
        .limit(1)
        .get();

      if (!allPatientAppointments.empty) {
        const firstAppointment = allPatientAppointments.docs[0].data();
        const firstAppointmentDate = firstAppointment.scheduledAt?.toDate?.() || firstAppointment.scheduledAt;
        
        if (new Date(firstAppointmentDate) >= startDate) {
          newPatients++;
        }
      }
    }    // Estadísticas por día (para gráficos)
    interface DailyStats {
      date: string;
      total: number;
      completed: number;
      cancelled: number;
      scheduled: number;
      revenue: number;
    }
    
    const dailyStats: Record<string, DailyStats> = {};
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
        scheduled: dayAppointments.filter(apt => 
          ['scheduled', 'confirmed'].includes(apt.status)
        ).length,
        revenue: dayAppointments.filter(apt => apt.status === 'completed').length * consultationFee,
      };

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Horarios más populares
    const timeSlotStats: Record<string, number> = {};
    appointments.forEach(apt => {
      const hour = new Date(apt.scheduledAt).getHours();
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      timeSlotStats[timeSlot] = (timeSlotStats[timeSlot] || 0) + 1;
    });

    const popularTimeSlots = Object.entries(timeSlotStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([time, count]) => ({ time, count }));

    // Tasa de completitud
    const completionRate = totalAppointments > 0 ? 
      (completedAppointments / totalAppointments * 100) : 0;

    // Tasa de cancelación
    const cancellationRate = totalAppointments > 0 ? 
      (cancelledAppointments / totalAppointments * 100) : 0;

    const stats = {
      period: {
        type: queryData.period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      overview: {
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        noShowAppointments,
        scheduledAppointments,
        completionRate: Math.round(completionRate * 100) / 100,
        cancellationRate: Math.round(cancellationRate * 100) / 100,
      },
      patients: {
        total: totalPatients,
        new: newPatients,
        returning: totalPatients - newPatients,
      },
      revenue: {
        total: totalRevenue,
        consultationFee,
        averagePerDay: Math.round((totalRevenue / Object.keys(dailyStats).length) * 100) / 100,
      },
      appointmentTypes: appointmentsByType,
      popularTimeSlots,
      dailyBreakdown: Object.values(dailyStats),
    };

    return NextResponse.json(
      createSuccessResponse(stats),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching doctor stats:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Parámetros de consulta inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('FETCH_DOCTOR_STATS_FAILED', 'Error al obtener estadísticas del doctor'),
      { status: 500 }
    );
  }
}
