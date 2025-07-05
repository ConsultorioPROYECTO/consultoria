import { googleCalendarService } from './google-calendar';
import { DateTime, Interval } from 'luxon';
import { db } from '../db';
import { doctors } from '../db/schema/doctors';
import { eq } from 'drizzle-orm';
import { DoctorWorkingHours, AppointmentEventData, BreakTimeEventData, BreakTimeType } from '../types/google-calendar';
import type { calendar_v3 } from 'googleapis';

/**
 * Calculates the available time slots for a doctor within a given date range.
 * Combines doctor's working hours from DB with busy times from Google Calendar.
 * @param doctorId The ID of the doctor.
 * @param startDate The start date for the availability check (Luxon DateTime).
 * @param endDate The end date for the availability check (Luxon DateTime).
 * @returns An array of available time intervals (Luxon Interval objects).
 */
export async function getDoctorAvailability(
  doctorId: number,
  startDate: DateTime,
  endDate: DateTime
): Promise<Interval[]> {
  console.log('🔍 [getDoctorAvailability] Iniciando análisis de disponibilidad');
  console.log('📋 [getDoctorAvailability] Parámetros de entrada:', {
    doctorId,
    startDate: startDate.toISO(),
    endDate: endDate.toISO(),
    startDateZone: startDate.zoneName,
    endDateZone: endDate.zoneName
  });
  
  try {
    console.debug('🔍 [getDoctorAvailability] Consultando información del doctor en BD...');
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, doctorId),
    });

    console.log('👨‍⚕️ [getDoctorAvailability] Resultado consulta doctor:', {
      found: !!doctor,
      doctorId: doctor?.idDoctor,
      hasCalendarId: !!doctor?.calendar_id,
      hasWorkingHours: !!doctor?.working_hours,
      timezone: doctor?.calendar_timezone
    });

    if (!doctor) {
      console.error('❌ [getDoctorAvailability] Doctor no encontrado:', { doctorId });
      throw new Error(`Doctor with ID ${doctorId} not found.`);
    }

    const calendarId = doctor.calendar_id;
    const doctorTimezone = doctor.calendar_timezone;
    const doctorWorkingHours: DoctorWorkingHours | null = doctor.working_hours as DoctorWorkingHours | null;

    console.debug('⚙️ [getDoctorAvailability] Configuración del doctor:', {
      calendarId,
      doctorTimezone,
      workingHoursStructure: doctorWorkingHours ? Object.keys(doctorWorkingHours) : null,
      workingHoursCount: doctorWorkingHours?.workingHours?.length || 0
    });

    if (!calendarId) {
      console.error('❌ [getDoctorAvailability] Calendar ID no encontrado:', { doctorId });
      throw new Error(`Calendar ID not found for doctor with ID ${doctorId}.`);
    }
    if (!doctorWorkingHours || !doctorWorkingHours.workingHours || doctorWorkingHours.workingHours.length === 0) {
      console.log('⚠️ [getDoctorAvailability] Sin horarios de trabajo definidos, retornando array vacío');
      return []; // No working hours defined, so no availability
    }

    // 1. Get busy times from Google Calendar
    console.log('📅 [getDoctorAvailability] Preparando consulta a Google Calendar...');
    const freeBusyRequest: calendar_v3.Schema$FreeBusyRequest = {
      timeMin: startDate.setZone(doctorTimezone).toISO() || undefined,
      timeMax: endDate.setZone(doctorTimezone).toISO() || undefined,
      timeZone: doctorTimezone,
      items: [{ id: calendarId }],
    };

    console.debug('🔧 [getDoctorAvailability] FreeBusy request:', {
      timeMin: freeBusyRequest.timeMin,
      timeMax: freeBusyRequest.timeMax,
      timeZone: freeBusyRequest.timeZone,
      calendarId: freeBusyRequest.items?.[0]?.id
    });

    console.log('🌐 [getDoctorAvailability] Ejecutando consulta a Google Calendar API...');
    const freeBusyResponse = await googleCalendarService.calendar.freebusy.query({
      requestBody: freeBusyRequest,
    });

    console.log('📊 [getDoctorAvailability] Respuesta de Google Calendar recibida:', {
      status: freeBusyResponse.status,
      hasData: !!freeBusyResponse.data,
      hasCalendars: !!freeBusyResponse.data.calendars,
      calendarExists: !!freeBusyResponse.data.calendars?.[calendarId],
      busyCount: freeBusyResponse.data.calendars?.[calendarId]?.busy?.length || 0
    });

    const busyIntervals: Interval[] = [];
    const calendarBusy = freeBusyResponse.data.calendars?.[calendarId]?.busy;
    
    console.debug('🔍 [getDoctorAvailability] Procesando intervalos ocupados...');
    if (calendarBusy) {
      console.log('⏰ [getDoctorAvailability] Intervalos ocupados encontrados:', calendarBusy.length);
      for (const busyTime of calendarBusy) {
        console.debug('📝 [getDoctorAvailability] Procesando intervalo ocupado:', {
          start: busyTime.start,
          end: busyTime.end,
          hasStart: !!busyTime.start,
          hasEnd: !!busyTime.end
        });
        
        if (busyTime.start && busyTime.end) {
          const startDateTime = DateTime.fromISO(busyTime.start, { zone: doctorTimezone });
          const endDateTime = DateTime.fromISO(busyTime.end, { zone: doctorTimezone });
          
          console.debug('🕐 [getDoctorAvailability] DateTime creados:', {
            start: startDateTime.toISO(),
            end: endDateTime.toISO(),
            startValid: startDateTime.isValid,
            endValid: endDateTime.isValid
          });
          
          busyIntervals.push(Interval.fromDateTimes(startDateTime, endDateTime));
        } else {
          console.log('⚠️ [getDoctorAvailability] Intervalo ocupado inválido (sin start/end):', busyTime);
        }
      }
    } else {
      console.log('✅ [getDoctorAvailability] No hay intervalos ocupados en el calendario');
    }
    
    console.log('📋 [getDoctorAvailability] Total intervalos ocupados procesados:', busyIntervals.length);

    // 2. Generate potential available slots based on working hours
    console.log('🏗️ [getDoctorAvailability] Generando intervalos potenciales basados en horarios de trabajo...');
    console.debug('📅 [getDoctorAvailability] Horarios de trabajo del doctor:', {
      workingHours: doctorWorkingHours.workingHours,
      totalDays: doctorWorkingHours.workingHours.length
    });
    
    // eslint-disable-next-line prefer-const
    let potentialAvailableIntervals: Interval[] = [];
    let currentDay = startDate.startOf('day');
    let dayCounter = 0;

    console.log('🔄 [getDoctorAvailability] Iniciando iteración por días:', {
      startDay: currentDay.toISODate(),
      endDay: endDate.startOf('day').toISODate()
    });

    while (currentDay <= endDate.startOf('day')) {
      dayCounter++;
      const dayOfWeek = currentDay.weekdayLong?.toUpperCase(); // e.g., 'MONDAY'
      const dailyHours = doctorWorkingHours.workingHours.find(dh => dh.dayOfWeek === dayOfWeek);

      console.debug(`📆 [getDoctorAvailability] Día ${dayCounter} - ${currentDay.toISODate()} (${dayOfWeek}):`, {
        hasWorkingHours: !!dailyHours,
        intervalsCount: dailyHours?.intervals?.length || 0
      });

      if (dailyHours) {
        console.log(`✅ [getDoctorAvailability] Procesando ${dailyHours.intervals.length} intervalos para ${dayOfWeek}`);
        for (const interval of dailyHours.intervals) {
          console.debug('⏰ [getDoctorAvailability] Procesando intervalo:', {
            day: currentDay.toISODate(),
            intervalStart: interval.start,
            intervalEnd: interval.end
          });
          
          const start = DateTime.fromISO(`${currentDay.toISODate()}T${interval.start}`, { zone: doctorTimezone });
          const end = DateTime.fromISO(`${currentDay.toISODate()}T${interval.end}`, { zone: doctorTimezone });
          
          console.debug('🕐 [getDoctorAvailability] DateTime generados:', {
            start: start.toISO(),
            end: end.toISO(),
            startValid: start.isValid,
            endValid: end.isValid,
            duration: end.diff(start).as('minutes')
          });
          
          if (start.isValid && end.isValid) {
            potentialAvailableIntervals.push(Interval.fromDateTimes(start, end));
            console.debug('✅ [getDoctorAvailability] Intervalo agregado exitosamente');
          } else {
            console.error('❌ [getDoctorAvailability] DateTime inválidos:', {
              startValid: start.isValid,
              endValid: end.isValid,
              startError: start.invalidReason,
              endError: end.invalidReason
            });
          }
        }
      } else {
        console.log(`⏭️ [getDoctorAvailability] Sin horarios de trabajo para ${dayOfWeek}`);
      }
      currentDay = currentDay.plus({ days: 1 });
    }
    
    console.log('📊 [getDoctorAvailability] Resumen generación de intervalos:', {
      totalDaysProcessed: dayCounter,
      potentialIntervals: potentialAvailableIntervals.length,
      intervalDetails: potentialAvailableIntervals.map(interval => ({
        start: interval.start?.toISO(),
        end: interval.end?.toISO(),
        duration: interval.length('minutes')
      }))
    });

    // 3. Subtract busy intervals from potential available intervals
    console.log('🔄 [getDoctorAvailability] Calculando disponibilidad final (restando intervalos ocupados)...');
    console.debug('📊 [getDoctorAvailability] Estado antes del cálculo:', {
      potentialIntervals: potentialAvailableIntervals.length,
      busyIntervals: busyIntervals.length
    });
    
    let availableIntervals = potentialAvailableIntervals;
    let busyCounter = 0;
    
    for (const busy of busyIntervals) {
      busyCounter++;
      const beforeCount = availableIntervals.length;
      
      console.debug(`🚫 [getDoctorAvailability] Procesando intervalo ocupado ${busyCounter}/${busyIntervals.length}:`, {
        busyStart: busy.start?.toISO(),
        busyEnd: busy.end?.toISO(),
        busyDuration: busy.length('minutes'),
        availableIntervalsBeforeSubtraction: beforeCount
      });
      
      availableIntervals = availableIntervals.flatMap(available => {
        const differences = available.difference(busy);
        console.debug('🔍 [getDoctorAvailability] Diferencia calculada:', {
          originalInterval: {
            start: available.start?.toISO(),
            end: available.end?.toISO()
          },
          busyInterval: {
            start: busy.start?.toISO(),
            end: busy.end?.toISO()
          },
          resultingIntervals: differences.length,
          results: differences.map(d => ({
            start: d.start?.toISO(),
            end: d.end?.toISO(),
            duration: d.length('minutes')
          }))
        });
        return differences;
      });
      
      const afterCount = availableIntervals.length;
      console.log(`📈 [getDoctorAvailability] Resultado intervalo ocupado ${busyCounter}: ${beforeCount} → ${afterCount} intervalos`);
    }

    // Filter out invalid or empty intervals
    console.debug('🔍 [getDoctorAvailability] Filtrando intervalos inválidos o vacíos...');
    const beforeFilterCount = availableIntervals.length;
    const invalidIntervals: Array<{ reason: string; interval: Interval }> = [];
    
    availableIntervals = availableIntervals.filter(interval => {
       const isValid = interval.isValid;
       const isEmpty = interval.isEmpty();
       
       if (!isValid) {
         invalidIntervals.push({ reason: 'invalid', interval });
       }
       if (isEmpty) {
         invalidIntervals.push({ reason: 'empty', interval });
       }
       
       return isValid && !isEmpty;
     });
    
    console.log('🧹 [getDoctorAvailability] Resultado filtrado:', {
      beforeFilter: beforeFilterCount,
      afterFilter: availableIntervals.length,
      removedCount: beforeFilterCount - availableIntervals.length,
      invalidIntervals: invalidIntervals.length
    });
    
    if (invalidIntervals.length > 0) {
      console.debug('⚠️ [getDoctorAvailability] Intervalos removidos:', invalidIntervals);
    }
    
    console.log('🎯 [getDoctorAvailability] Resultado final:', {
      totalAvailableIntervals: availableIntervals.length,
      finalIntervals: availableIntervals.map(interval => ({
        start: interval.start?.toISO(),
        end: interval.end?.toISO(),
        duration: interval.length('minutes'),
        isValid: interval.isValid,
        isEmpty: interval.isEmpty
      }))
    });

    console.log('✅ [getDoctorAvailability] Análisis de disponibilidad completado exitosamente');
    return availableIntervals;
  } catch (error) {
    console.error('❌ [getDoctorAvailability] Error durante el análisis de disponibilidad:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      doctorId,
      startDate: startDate.toISO(),
      endDate: endDate.toISO()
    });
    throw error;
  }
}

/**
 * Retrieves events for a doctor from Google Calendar with optional filters.
 * @param doctorId The ID of the doctor.
 * @param startDate The start date for the event retrieval (Luxon DateTime).
 * @param endDate The end date for the event retrieval (Luxon DateTime).
 * @param filters Optional filters (eventType, appointmentStatus, breakTimeType).
 * @returns An array of events, either AppointmentEventData or BreakTimeEventData.
 */
export async function getDoctorEvents(
  doctorId: number,
  startDate: DateTime,
  endDate: DateTime,
  filters?: {
    eventType?: 'appointment' | 'break';
    appointmentStatus?: string;
    breakTimeType?: BreakTimeType;
  }
): Promise<(AppointmentEventData | BreakTimeEventData)[]> {
  try {
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, doctorId),
    });

    if (!doctor) {
      throw new Error(`Doctor with ID ${doctorId} not found.`);
    }

    const calendarId = doctor.calendar_id;
    const doctorTimezone = doctor.calendar_timezone;

    if (!calendarId) {
      throw new Error(`Calendar ID not found for doctor with ID ${doctorId}.`);
    }

    const eventsResponse = await googleCalendarService.calendar.events.list({
      calendarId: calendarId,
      timeMin: startDate.setZone(doctorTimezone).toISO() || undefined,
      timeMax: endDate.setZone(doctorTimezone).toISO() || undefined,
      timeZone: doctorTimezone,
      singleEvents: true, // Expand recurring events into individual instances
      orderBy: 'startTime',
    });

    const rawEvents = eventsResponse.data.items || [];
    const processedEvents: (AppointmentEventData | BreakTimeEventData)[] = [];

    for (const event of rawEvents) {
      const privateProps = event.extendedProperties?.private;
      if (!privateProps) continue; // Skip events without private extended properties

      const startDateTime = event.start?.dateTime ? DateTime.fromISO(event.start.dateTime, { zone: doctorTimezone }) : undefined;
      const endDateTime = event.end?.dateTime ? DateTime.fromISO(event.end.dateTime, { zone: doctorTimezone }) : undefined;

      if (!startDateTime || !endDateTime) continue; // Skip events without valid start/end times

      if (privateProps.isBreakTime === 'true') {
        // This is a break time event
        const breakTimeEvent: BreakTimeEventData = {
          calendarId: calendarId,
          summary: event.summary || 'Break Time',
          startDateTime: startDateTime,
          endDateTime: endDateTime,
          timezone: doctorTimezone,
          breakTimeType: privateProps.breakTimeType as BreakTimeType,
          isBreakTime: true,
        };

        // Apply break time filters
        if (filters?.eventType && filters.eventType !== 'break') continue;
        if (filters?.breakTimeType && filters.breakTimeType !== breakTimeEvent.breakTimeType) continue;

        processedEvents.push(breakTimeEvent);
      } else {
        // This is an appointment event
        const appointmentEvent: AppointmentEventData = {
          calendarId: calendarId,
          summary: event.summary || 'Appointment',
          description: event.description || undefined,
          location: event.location || undefined,
          startDateTime: startDateTime,
          endDateTime: endDateTime,
          timezone: doctorTimezone,
          patientId: parseInt(privateProps.patientId, 10),
          serviceId: parseInt(privateProps.serviceId, 10),
          organizationId: parseInt(privateProps.organizationId, 10),
          appointmentStatus: privateProps.appointmentStatus,
          meetingLink: event.conferenceData?.entryPoints?.[0]?.uri || undefined,
        };

        // Apply appointment filters
        if (filters?.eventType && filters.eventType !== 'appointment') continue;
        if (filters?.appointmentStatus && filters.appointmentStatus !== appointmentEvent.appointmentStatus) continue;

        processedEvents.push(appointmentEvent);
      }
    }

    return processedEvents;
  } catch (error) {
    console.error('Error getting doctor events:', error);
    throw error;
  }
}
