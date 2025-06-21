import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

// Schema para consulta de horario
const ScheduleQuerySchema = z.object({
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  includeBooked: z.string().optional().transform(val => val === 'true'),
});

interface TimeSlot {
  start: string;
  end: string;
  isAvailable: boolean;
  appointmentId?: string;
  patientName?: string;
}

interface DaySchedule {
  date: string;
  dayOfWeek: string;
  isWorkingDay: boolean;
  timeSlots: TimeSlot[];
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: doctorId } = params;
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const queryData = ScheduleQuerySchema.parse(queryParams);

    // Verificar que el doctor existe
    const doctorDoc = await adminDb.collection('doctors').doc(doctorId).get();
    if (!doctorDoc.exists) {
      return NextResponse.json(
        createErrorResponse('DOCTOR_NOT_FOUND', 'Doctor no encontrado'),
        { status: 404 }
      );
    }

    const doctorData = doctorDoc.data();
    const availability = doctorData?.availability ?? {};

    // Calcular rango de fechas
    let startDate: Date;
    let endDate: Date;

    if (queryData.date) {
      // Una fecha específica
      startDate = new Date(queryData.date);
      endDate = new Date(queryData.date);
    } else if (queryData.startDate && queryData.endDate) {
      // Rango de fechas
      startDate = new Date(queryData.startDate);
      endDate = new Date(queryData.endDate);
    } else {
      // Por defecto, próximos 7 días
      startDate = new Date();
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 6);
    }

    // Obtener citas del doctor en el período
    const appointmentsSnapshot = await adminDb
      .collection('appointments')
      .where('doctorId', '==', doctorId)
      .where('scheduledAt', '>=', startDate)
      .where('scheduledAt', '<=', endDate)
      .get();

    const appointments = appointmentsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      scheduledAt: doc.data().scheduledAt?.toDate?.() ?? doc.data().scheduledAt,
    }));

    // Generar horario día a día
    const schedule: DaySchedule[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDate.getDay()];
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const dayAvailability = availability[dayOfWeek] ?? [];
      const isWorkingDay = dayAvailability.length > 0;
      
      const timeSlots: TimeSlot[] = [];
      
      if (isWorkingDay) {
        // Procesar cada slot de tiempo disponible
        for (const timeRange of dayAvailability) {
          const [startTime, endTime] = timeRange.split('-');
          const [startHour, startMinute] = startTime.split(':').map(Number);
          const [endHour, endMinute] = endTime.split(':').map(Number);
          
          // Generar slots de 30 minutos
          const slotStart = new Date(currentDate);
          slotStart.setHours(startHour, startMinute, 0, 0);
          
          const slotEnd = new Date(currentDate);
          slotEnd.setHours(endHour, endMinute, 0, 0);
          
          while (slotStart < slotEnd) {
            const slotEndTime = new Date(slotStart);
            slotEndTime.setMinutes(slotEndTime.getMinutes() + 30);
            
            const startTimeStr = `${slotStart.getHours().toString().padStart(2, '0')}:${slotStart.getMinutes().toString().padStart(2, '0')}`;
            const endTimeStr = `${slotEndTime.getHours().toString().padStart(2, '0')}:${slotEndTime.getMinutes().toString().padStart(2, '0')}`;
            
            // Verificar si hay una cita en este horario
            const appointment = appointments.find(apt => {
              const aptDate = new Date(apt.scheduledAt);
              return aptDate.getTime() === slotStart.getTime() && 
                     ['scheduled', 'confirmed', 'in-progress'].includes(apt.status);
            });
            
            const timeSlot: TimeSlot = {
              start: startTimeStr,
              end: endTimeStr,
              isAvailable: !appointment,
            };
            
            if (appointment && queryData.includeBooked) {
              timeSlot.appointmentId = appointment.id;
              // Obtener nombre del paciente si es necesario
              if (appointment.patientId) {
                try {
                  const patientDoc = await adminDb.collection('users').doc(appointment.patientId).get();
                  if (patientDoc.exists) {
                    const patientData = patientDoc.data();
                    timeSlot.patientName = `${patientData?.firstName ?? ''} ${patientData?.lastName ?? ''}`.trim();
                  }
                } catch (error) {
                  console.error('Error fetching patient data:', error);
                }
              }
            }
            
            timeSlots.push(timeSlot);
            slotStart.setMinutes(slotStart.getMinutes() + 30);
          }
        }
      }
      
      const availableSlots = timeSlots.filter(slot => slot.isAvailable).length;
      const bookedSlots = timeSlots.filter(slot => !slot.isAvailable).length;
      
      schedule.push({
        date: dateStr,
        dayOfWeek,
        isWorkingDay,
        timeSlots,
        totalSlots: timeSlots.length,
        availableSlots,
        bookedSlots,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json(
      createSuccessResponse({
        doctorId,
        schedule,
        summary: {
          totalDays: schedule.length,
          workingDays: schedule.filter(day => day.isWorkingDay).length,
          totalSlots: schedule.reduce((sum, day) => sum + day.totalSlots, 0),
          availableSlots: schedule.reduce((sum, day) => sum + day.availableSlots, 0),
          bookedSlots: schedule.reduce((sum, day) => sum + day.bookedSlots, 0),
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching doctor schedule:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Parámetros de consulta inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('FETCH_SCHEDULE_FAILED', 'Error al obtener horario del doctor'),
      { status: 500 }
    );
  }
}
