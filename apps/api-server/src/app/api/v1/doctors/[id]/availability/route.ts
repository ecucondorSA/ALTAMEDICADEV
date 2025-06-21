import { adminDb } from '@altamedica/firebase';
import { createErrorResponse, createSuccessResponse } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

// Schema para validar horarios de disponibilidad
const TimeSlotSchema = z.string().regex(
  /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  'Formato de horario inválido (HH:MM-HH:MM)'
);

const DayAvailabilitySchema = z.array(TimeSlotSchema);

const WeeklyAvailabilitySchema = z.object({
  monday: DayAvailabilitySchema.optional(),
  tuesday: DayAvailabilitySchema.optional(),
  wednesday: DayAvailabilitySchema.optional(),
  thursday: DayAvailabilitySchema.optional(),
  friday: DayAvailabilitySchema.optional(),
  saturday: DayAvailabilitySchema.optional(),
  sunday: DayAvailabilitySchema.optional(),
});

// Schema para consulta de disponibilidad por fecha
const AvailabilityQuerySchema = z.object({
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const queryData = AvailabilityQuerySchema.parse(queryParams);

    // Verificar que el doctor existe
    const doctorDoc = await adminDb.collection('doctors').doc(id).get();
    if (!doctorDoc.exists) {
      return NextResponse.json(
        createErrorResponse('DOCTOR_NOT_FOUND', 'Doctor no encontrado'),
        { status: 404 }
      );
    }

    const doctorData = doctorDoc.data();
    const availability = doctorData?.availability || {};

    // Si se consulta una fecha específica
    if (queryData.date) {
      const date = new Date(queryData.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
      const dayAvailability = availability[dayName] || [];

      // Obtener citas existentes para ese día
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const existingAppointments = await adminDb
        .collection('appointments')
        .where('doctorId', '==', id)
        .where('scheduledAt', '>=', startOfDay)
        .where('scheduledAt', '<=', endOfDay)
        .where('status', 'in', ['scheduled', 'confirmed', 'in-progress'])
        .get();

      const bookedSlots = existingAppointments.docs.map(doc => {
        const appointment = doc.data();
        const scheduledAt = appointment.scheduledAt.toDate();
        return scheduledAt.toTimeString().slice(0, 5); // HH:MM
      });

      // Calcular slots disponibles
      const availableSlots = dayAvailability.filter((slot: string) => {
        const [startTime] = slot.split('-');
        return !bookedSlots.includes(startTime);
      });

      return NextResponse.json(
        createSuccessResponse({
          date: queryData.date,
          dayOfWeek: dayName,
          totalSlots: dayAvailability.length,
          availableSlots: availableSlots.length,
          bookedSlots: bookedSlots.length,
          slots: {
            available: availableSlots,
            booked: bookedSlots,
            all: dayAvailability,
          },
        }),
        { status: 200 }
      );
    }

    // Si se consulta un rango de fechas
    if (queryData.startDate && queryData.endDate) {
      const startDate = new Date(queryData.startDate);
      const endDate = new Date(queryData.endDate);
      const dateRange = [];

      // Generar todas las fechas en el rango
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayName = d.toLocaleDateString('en-US', { weekday: 'lowercase' });
        const dayAvailability = availability[dayName] || [];
        
        dateRange.push({
          date: d.toISOString().split('T')[0],
          dayOfWeek: dayName,
          slots: dayAvailability,
          hasAvailability: dayAvailability.length > 0,
        });
      }

      return NextResponse.json(
        createSuccessResponse({
          startDate: queryData.startDate,
          endDate: queryData.endDate,
          totalDays: dateRange.length,
          daysWithAvailability: dateRange.filter(d => d.hasAvailability).length,
          dateRange,
        }),
        { status: 200 }
      );
    }

    // Retornar disponibilidad semanal completa
    return NextResponse.json(
      createSuccessResponse({
        doctorId: id,
        weeklyAvailability: availability,
        totalSlotsPerWeek: Object.values(availability).reduce((total: number, daySlots: any) => {
          return total + (Array.isArray(daySlots) ? daySlots.length : 0);
        }, 0),
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching doctor availability:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Parámetros de consulta inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('FETCH_AVAILABILITY_FAILED', 'Error al obtener disponibilidad'),
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

    // Validar datos de disponibilidad
    const availabilityData = WeeklyAvailabilitySchema.parse(body);

    // Verificar que el doctor existe
    const doctorDoc = await adminDb.collection('doctors').doc(id).get();
    if (!doctorDoc.exists) {
      return NextResponse.json(
        createErrorResponse('DOCTOR_NOT_FOUND', 'Doctor no encontrado'),
        { status: 404 }
      );
    }

    // Actualizar disponibilidad
    const now = new Date();
    await adminDb.collection('doctors').doc(id).update({
      availability: availabilityData,
      updatedAt: now,
    });

    return NextResponse.json(
      createSuccessResponse({
        doctorId: id,
        availability: availabilityData,
        updatedAt: now,
        message: 'Disponibilidad actualizada exitosamente',
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating doctor availability:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Datos de disponibilidad inválidos', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('UPDATE_AVAILABILITY_FAILED', 'Error al actualizar disponibilidad'),
      { status: 500 }
    );
  }
}
