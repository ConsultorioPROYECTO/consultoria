import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { getDoctorAvailability } from '@/lib/calendar-event-retriever';
import { db } from '@/db';
import { doctors } from '@/db/schema/doctors';
import { users } from '@/db/schema/users';
import { medicalServices } from '@/db/schema/medical_services';
import { doctorServices } from '@/db/schema/doctor_services';
import { eq, and } from 'drizzle-orm';
import {
  ServiceDoctorsAvailabilityResponse,
  ServiceAvailabilityError,
  DoctorAvailabilityInfo,
  DoctorAvailabilityByDate,
  TimePeriod,
  TimeInterval,
} from '@/types/doctor-availability';

/**
 * Convierte una fecha DateTime a formato largo en español
 * Ejemplo: "lunes 20 de mayo de 2025"
 */
function formatDateToLongSpanish(date: DateTime): string {
  return date.setLocale('es').toFormat('cccc d \'de\' MMMM \'de\' yyyy');
}

/**
 * Determina el período del día basado en la hora de inicio
 * Mañana: 06:00 - 11:59
 * Tarde: 12:00 - 17:59
 * Noche: 18:00 - 05:59 (del día siguiente)
 */
function getTimePeriod(startTime: string): TimePeriod {
  const hour = parseInt(startTime.split(':')[0], 10);
  
  if (hour >= 6 && hour < 12) {
    return 'mañana';
  } else if (hour >= 12 && hour < 18) {
    return 'tarde';
  } else {
    return 'noche';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
): Promise<NextResponse<ServiceDoctorsAvailabilityResponse | ServiceAvailabilityError>> {
  console.log('API: /api/services/[serviceId]/doctors/availability - Request received');
  
  const resolvedParams = await params;
  const serviceId = parseInt(resolvedParams.serviceId, 10);
  console.debug(`Parsed serviceId: ${serviceId}`);

  if (isNaN(serviceId)) {
    console.error('Validation Error: Invalid serviceId');
    return NextResponse.json(
      { error: 'El serviceId no es válido' },
      { status: 400 }
    );
  }

  try {
    console.log(`Attempting to get doctors availability for service ${serviceId}`);

    // Verificar que el servicio existe y obtener su duración
    const service = await db.query.medicalServices.findFirst({
      where: eq(medicalServices.id, serviceId),
    });
    
    if (!service) {
      console.error(`Service with id ${serviceId} not found`);
      return NextResponse.json(
        { error: 'Servicio médico no encontrado' },
        { status: 404 }
      );
    }

    const intervalMinutes = service.durationMinutes;
    if (intervalMinutes < 5) {
      throw new Error('Invalid service duration');
    }
    console.debug(`Service duration: ${intervalMinutes} minutes`);

    // Buscar doctores que pueden ofrecer este servicio
    const availableDoctors = await db
      .select({
        idDoctor: doctors.idDoctor,
        doctorName: users.displayName,
        calendarTimezone: doctors.calendar_timezone,
        calendarId: doctors.calendar_id,
      })
      .from(doctorServices)
      .innerJoin(doctors, eq(doctorServices.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(
        and(
          eq(doctorServices.serviceId, serviceId),
          eq(doctorServices.isAvailable, true)
        )
      );

    if (availableDoctors.length === 0) {
      console.log(`No doctors found for service ${serviceId}`);
      return NextResponse.json({
        availability: {
          doctors: []
        }
      });
    }

    console.log(`Found ${availableDoctors.length} doctors for service ${serviceId}`);

    // Calcular fechas para los próximos 7 días
    const now = DateTime.now().setZone('America/Bogota');
    const startDate = now.startOf('day');
    const endDate = startDate.plus({ days: 7 }).endOf('day');
    
    console.debug(`Date Range: startDate=${startDate.toISO()}, endDate=${endDate.toISO()}`);

    const doctorsAvailability: DoctorAvailabilityInfo[] = [];

    // Procesar cada doctor
    for (const doctor of availableDoctors) {
      if (!doctor.calendarId) {
        console.warn(`Doctor ${doctor.idDoctor} has no calendar_id, skipping`);
        continue;
      }

      try {
        console.log(`Processing availability for doctor ${doctor.idDoctor}`);
        
        // Obtener disponibilidad del doctor para los próximos 7 días
        const doctorTimezone = doctor.calendarTimezone || 'America/Bogota';
        const doctorStartDate = startDate.setZone(doctorTimezone);
        const doctorEndDate = endDate.setZone(doctorTimezone);
        
        const availableIntervals = await getDoctorAvailability(
          doctor.idDoctor,
          doctorStartDate,
          doctorEndDate
        );

        console.log(`Doctor ${doctor.idDoctor} has ${availableIntervals.length} available intervals`);

        // Organizar disponibilidad por día
        const dayAvailability: DoctorAvailabilityByDate = {};
        
        for (const interval of availableIntervals) {
          const intervalStart = interval.start!;
          const intervalEnd = interval.end!;
          const dayKey = formatDateToLongSpanish(intervalStart);
          
          // Inicializar el día si no existe
          if (!dayAvailability[dayKey]) {
            dayAvailability[dayKey] = {
              intervals: {},
              timeZone: doctorTimezone
            };
          }
          
          // Generar slots de tiempo basados en la duración del servicio
          let currentSlotStart = intervalStart;
          while (currentSlotStart.plus({ minutes: intervalMinutes }) <= intervalEnd) {
            const currentSlotEnd = currentSlotStart.plus({ minutes: intervalMinutes });
            
            const timeInterval: TimeInterval = {
              startTime: currentSlotStart.toFormat('HH:mm'),
              endTime: currentSlotEnd.toFormat('HH:mm')
            };
            
            // Determinar el período del día
            const period = getTimePeriod(timeInterval.startTime);
            
            // Inicializar el período si no existe
            if (!dayAvailability[dayKey].intervals[period]) {
              dayAvailability[dayKey].intervals[period] = [];
            }
            
            // Agregar el intervalo al período correspondiente
            dayAvailability[dayKey].intervals[period]!.push(timeInterval);
            
            currentSlotStart = currentSlotEnd;
          }
        }

        // Agregar doctor a la respuesta
        doctorsAvailability.push({
          idDoctor: doctor.idDoctor,
          doctorName: doctor.doctorName || 'Doctor',
          availability: dayAvailability
        });

      } catch (doctorError) {
        console.error(`Error processing doctor ${doctor.idDoctor}:`, doctorError);
        // Continuar con el siguiente doctor en caso de error
        continue;
      }
    }

    console.log(`Successfully processed ${doctorsAvailability.length} doctors`);

    return NextResponse.json({
      availability: {
        doctors: doctorsAvailability
      }
    });

  } catch (error) {
    console.error('Error al obtener la disponibilidad de doctores:', {
      serviceId,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}