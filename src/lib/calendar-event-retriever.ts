import { googleCalendarService } from './google-calendar';
import { DateTime, Interval } from 'luxon';
import { db } from '../db';
import { doctors } from '../db/schema/doctors';
import { eq } from 'drizzle-orm';
import { DoctorWorkingHours, AppointmentEventData, BreakTimeEventData,  CalendarEventData, BreakTimeType, isBreakTimeType } from '../types/google-calendar';
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
      with: {
        user: true
      }
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
    eventType?: 'appointment' | 'break' | 'basic';
    appointmentStatus?: string;
    breakTimeType?: BreakTimeType;
  }
): Promise<CalendarEventData[]> {
  // 🆔 Generar ID único para esta ejecución
  const requestId = `getDoctorEvents_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  console.log(`🚀 [${requestId}] getDoctorEvents iniciado:`, {
    doctorId,
    startDate: startDate.toISO(),
    endDate: endDate.toISO(),
    startDateZone: startDate.zoneName,
    endDateZone: endDate.zoneName,
    filters: filters || 'sin filtros',
    timestamp: new Date().toISOString()
  });

  try {
    // 🔍 Consultar doctor en base de datos
    console.log(`🔍 [${requestId}] Consultando doctor en BD...`);
    const doctorQueryStart = Date.now();
    
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, doctorId),
    });
    
    const doctorQueryTime = Date.now() - doctorQueryStart;
    console.log(`👨‍⚕️ [${requestId}] Consulta doctor completada:`, {
      executionTime: `${doctorQueryTime}ms`,
      doctorFound: !!doctor,
      doctorData: doctor ? {
        idDoctor: doctor.idDoctor,
        hasCalendarId: !!doctor.calendar_id,
        calendarTimezone: doctor.calendar_timezone,
      } : null
    });

    if (!doctor) {
      const errorMsg = `Doctor with ID ${doctorId} not found.`;
      console.error(`❌ [${requestId}] Error - Doctor no encontrado:`, {
        doctorId,
        errorMessage: errorMsg,
        executionTime: `${Date.now() - startTime}ms`
      });
      throw new Error(errorMsg);
    }

    const calendarId = doctor.calendar_id;
    const doctorTimezone = doctor.calendar_timezone;
    
    console.log(`📅 [${requestId}] Información del calendario:`, {
      calendarId: calendarId || 'NO CONFIGURADO',
      doctorTimezone: doctorTimezone || 'NO CONFIGURADO',
      hasCalendarId: !!calendarId
    });

    if (!calendarId) {
      const errorMsg = `Calendar ID not found for doctor with ID ${doctorId}.`;
      console.error(`❌ [${requestId}] Error - Calendar ID no encontrado:`, {
        doctorId,
        errorMessage: errorMsg,
        executionTime: `${Date.now() - startTime}ms`
      });
      throw new Error(errorMsg);
    }

    // 📞 Preparar llamada a Google Calendar API
    const timeMinISO = startDate.setZone(doctorTimezone).toISO();
    const timeMaxISO = endDate.setZone(doctorTimezone).toISO();
    
    console.log(`📞 [${requestId}] Preparando llamada a Google Calendar API:`, {
      calendarId,
      timeMin: timeMinISO,
      timeMax: timeMaxISO,
      timeZone: doctorTimezone,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    const googleApiStart = Date.now();
    const eventsResponse = await googleCalendarService.calendar.events.list({
      calendarId: calendarId,
      timeMin: timeMinISO || undefined,
      timeMax: timeMaxISO || undefined,
      timeZone: doctorTimezone,
      singleEvents: true, // Expand recurring events into individual instances
      orderBy: 'startTime',
    });
    
    const googleApiTime = Date.now() - googleApiStart;
    const rawEvents = eventsResponse.data.items || [];
    
    console.log(`📊 [${requestId}] Respuesta de Google Calendar API:`, {
      executionTime: `${googleApiTime}ms`,
      totalRawEvents: rawEvents.length,
      hasEvents: rawEvents.length > 0,
      firstEventSummary: rawEvents[0]?.summary || 'N/A',
      eventSummaries: rawEvents.slice(0, 5).map(e => e.summary || 'Sin título')
    });
    
    const processedEvents: CalendarEventData[] = [];
    console.log(`🔄 [${requestId}] Iniciando procesamiento de eventos...`);

    let eventCounter = 0;
    let skippedEvents = 0;
    let processedAppointments = 0;
    let processedBreaks = 0;
    let filteredOutEvents = 0;
    
    for (const event of rawEvents) {
      eventCounter++;
      console.log(`📝 [${requestId}] Procesando evento ${eventCounter}/${rawEvents.length}:`, {
        eventId: event.id,
        summary: event.summary || 'Sin título',
        hasExtendedProperties: !!event.extendedProperties?.private,
        startTime: event.start?.dateTime || event.start?.date || 'N/A',
        endTime: event.end?.dateTime || event.end?.date || 'N/A'
      });
      
      const privateProps = event.extendedProperties?.private;
      
      // Handle events without extended properties as basic events
      if (!privateProps) {
        skippedEvents++;
        console.debug(`⚠️ [${requestId}] Evento ${eventCounter} (${event.id}) omitido - Sin propiedades extendidas privadas. Summary: ${event.summary || 'N/A'}`);
        continue; // Skip events without private extended properties
      }
      
      console.log(`🔍 [${requestId}] Propiedades privadas del evento ${eventCounter}:`, {
        isBreakTime: privateProps.isBreakTime,
        breakTimeType: privateProps.breakTimeType,
        patientId: privateProps.patientId,
        serviceId: privateProps.serviceId,
        organizationId: privateProps.organizationId,
        appointmentStatus: privateProps.appointmentStatus
      });

      const startDateTime = event.start?.dateTime ? DateTime.fromISO(event.start.dateTime, { zone: doctorTimezone }) : undefined;
      const endDateTime = event.end?.dateTime ? DateTime.fromISO(event.end.dateTime, { zone: doctorTimezone }) : undefined;
      
      console.log(`⏰ [${requestId}] Análisis de fechas del evento ${eventCounter}:`, {
        rawStartDateTime: event.start?.dateTime,
        rawEndDateTime: event.end?.dateTime,
        parsedStartDateTime: startDateTime?.toISO(),
        parsedEndDateTime: endDateTime?.toISO(),
        isValidDateTime: !!startDateTime && !!endDateTime,
        timezone: doctorTimezone
      });

      if (!startDateTime || !endDateTime) {
        skippedEvents++;
        console.debug(`⚠️ [${requestId}] Evento ${eventCounter} (${event.id}) omitido - Fechas inválidas. Summary: ${event.summary || 'N/A'}`);
        continue; // Skip events without valid start/end times
      }

      if (privateProps.isBreakTime === 'true') {
        // This is a break time event
        console.log(`🛑 [${requestId}] Procesando evento de descanso ${eventCounter}:`);
        
        const breakTimeEvent: BreakTimeEventData = {
          calendarId: calendarId,
          summary: event.summary || 'Break Time',
          startDateTime: startDateTime,
          endDateTime: endDateTime,
          timezone: doctorTimezone,
          isBreakTime: true,
          breakTimeType: isBreakTimeType(privateProps.breakTimeType) ? privateProps.breakTimeType : 'other',
        };
        
        console.log(`🛑 [${requestId}] Evento de descanso ${eventCounter} construido:`, {
          calendarId: breakTimeEvent.calendarId,
          summary: breakTimeEvent.summary,
          startDateTime: breakTimeEvent.startDateTime.toISO(),
          endDateTime: breakTimeEvent.endDateTime.toISO(),
          timezone: breakTimeEvent.timezone,
          breakTimeType: breakTimeEvent.breakTimeType,
          duration: breakTimeEvent.endDateTime.diff(breakTimeEvent.startDateTime, 'minutes').minutes
        });

        // Apply break time filters
        console.log(`🔍 [${requestId}] Aplicando filtros a evento de descanso ${eventCounter}:`, {
          hasEventTypeFilter: !!filters?.eventType,
          eventTypeFilter: filters?.eventType,
          passesEventTypeFilter: !filters?.eventType || filters.eventType === 'break',
          hasBreakTimeTypeFilter: !!filters?.breakTimeType,
          breakTimeTypeFilter: filters?.breakTimeType,
          eventBreakTimeType: breakTimeEvent.breakTimeType,
          passesBreakTimeTypeFilter: !filters?.breakTimeType || filters.breakTimeType === breakTimeEvent.breakTimeType
        });
        
        if (filters?.eventType && filters.eventType !== 'break') {
          filteredOutEvents++;
          console.debug(`🚫 [${requestId}] Evento de descanso ${eventCounter} (${event.id}) filtrado - eventType no coincide. Summary: ${event.summary || 'N/A'}`);
          continue;
        }
        if (filters?.breakTimeType && filters.breakTimeType !== breakTimeEvent.breakTimeType) {
          filteredOutEvents++;
          console.debug(`🚫 [${requestId}] Evento de descanso ${eventCounter} (${event.id}) filtrado - breakTimeType no coincide. Summary: ${event.summary || 'N/A'}`);
          continue;
        }
        
        processedBreaks++;
        console.log(`✅ [${requestId}] Evento de descanso ${eventCounter} agregado exitosamente`);
        processedEvents.push(breakTimeEvent);
      } else {
        // This is an appointment event
        console.log(`👩‍⚕️ [${requestId}] Procesando evento de cita ${eventCounter}:`);
        
        const patientId = parseInt(privateProps.patientId, 10);
        const serviceId = parseInt(privateProps.serviceId, 10);
        const organizationId = parseInt(privateProps.organizationId, 10);

        if (isNaN(patientId) || isNaN(serviceId) || isNaN(organizationId)) {
          skippedEvents++;
          console.debug(`⚠️ [${requestId}] Evento de cita ${eventCounter} (${event.id}) omitido - IDs de propiedades privadas inválidos. Summary: ${event.summary || 'N/A'}`, { patientId, serviceId, organizationId });
          continue;
        }

        const appointmentEvent: AppointmentEventData = {
          calendarId: calendarId,
          summary: event.summary || 'Appointment',
          description: event.description || undefined,
          location: event.location || undefined,
          startDateTime: startDateTime,
          endDateTime: endDateTime,
          timezone: doctorTimezone,
          patientId: patientId,
          serviceId: serviceId,
          organizationId: organizationId,
          appointmentStatus: privateProps.appointmentStatus,
          meetingLink: event.conferenceData?.entryPoints?.[0]?.uri || undefined,
        };
        
        console.log(`👩‍⚕️ [${requestId}] Evento de cita ${eventCounter} construido:`, {
          calendarId: appointmentEvent.calendarId,
          summary: appointmentEvent.summary,
          description: appointmentEvent.description || 'Sin descripción',
          location: appointmentEvent.location || 'Sin ubicación',
          startDateTime: appointmentEvent.startDateTime.toISO(),
          endDateTime: appointmentEvent.endDateTime.toISO(),
          timezone: appointmentEvent.timezone,
          patientId: appointmentEvent.patientId,
          serviceId: appointmentEvent.serviceId,
          organizationId: appointmentEvent.organizationId,
          appointmentStatus: appointmentEvent.appointmentStatus,
          meetingLink: appointmentEvent.meetingLink || 'Sin enlace de reunión',
          duration: appointmentEvent.endDateTime.diff(appointmentEvent.startDateTime, 'minutes').minutes
        });

        // Apply appointment filters
        console.log(`🔍 [${requestId}] Aplicando filtros a evento de cita ${eventCounter}:`, {
          hasEventTypeFilter: !!filters?.eventType,
          eventTypeFilter: filters?.eventType,
          passesEventTypeFilter: !filters?.eventType || filters.eventType === 'appointment',
          hasAppointmentStatusFilter: !!filters?.appointmentStatus,
          appointmentStatusFilter: filters?.appointmentStatus,
          eventAppointmentStatus: appointmentEvent.appointmentStatus,
          passesAppointmentStatusFilter: !filters?.appointmentStatus || filters.appointmentStatus === appointmentEvent.appointmentStatus
        });
        
        if (filters?.eventType && filters.eventType !== 'appointment') {
          filteredOutEvents++;
          console.debug(`🚫 [${requestId}] Evento de cita ${eventCounter} (${event.id}) filtrado - eventType no coincide. Summary: ${event.summary || 'N/A'}`);
          continue;
        }
        if (filters?.appointmentStatus && filters.appointmentStatus !== appointmentEvent.appointmentStatus) {
          filteredOutEvents++;
          console.debug(`🚫 [${requestId}] Evento de cita ${eventCounter} (${event.id}) filtrado - appointmentStatus no coincide. Summary: ${event.summary || 'N/A'}`);
          continue;
        }
        
        processedAppointments++;
        console.log(`✅ [${requestId}] Evento de cita ${eventCounter} agregado exitosamente`);
        processedEvents.push(appointmentEvent);
      }
    }
    
    // 📊 Resumen final del procesamiento
    const totalExecutionTime = Date.now() - startTime;
    console.log(`📊 [${requestId}] Resumen final del procesamiento:`, {
      totalExecutionTime: `${totalExecutionTime}ms`,
      totalRawEvents: rawEvents.length,
      eventCounter,
      skippedEvents,
      processedAppointments,
      processedBreaks,
      filteredOutEvents,
      finalProcessedEvents: processedEvents.length,
      processingEfficiency: `${((processedEvents.length / Math.max(rawEvents.length, 1)) * 100).toFixed(2)}%`
    });
    
    console.log(`🎯 [${requestId}] Eventos finales por tipo:`, {
      appointments: processedEvents.filter(e => 'patientId' in e).length,
      breaks: processedEvents.filter(e => 'isBreakTime' in e && e.isBreakTime).length,
      totalEvents: processedEvents.length
    });
    
    if (processedEvents.length > 0) {
      console.log(`📋 [${requestId}] Detalles de eventos procesados:`);
      processedEvents.forEach((event, index) => {
        if ('isBreakTime' in event && event.isBreakTime) {
          const breakEvent = event as BreakTimeEventData;
          console.log(`  🛑 Evento ${index + 1} (Descanso):`, {
            summary: breakEvent.summary,
            breakTimeType: breakEvent.breakTimeType,
            start: breakEvent.startDateTime.toISO(),
            end: breakEvent.endDateTime.toISO(),
            duration: breakEvent.endDateTime.diff(breakEvent.startDateTime, 'minutes').minutes + ' min'
          });
        } else {
          const appointmentEvent = event as AppointmentEventData;
          console.log(`  👩‍⚕️ Evento ${index + 1} (Cita):`, {
            summary: appointmentEvent.summary,
            patientId: appointmentEvent.patientId,
            appointmentStatus: appointmentEvent.appointmentStatus,
            start: appointmentEvent.startDateTime.toISO(),
            end: appointmentEvent.endDateTime.toISO(),
            duration: appointmentEvent.endDateTime.diff(appointmentEvent.startDateTime, 'minutes').minutes + ' min'
          });
        }
      });
    }
    
    console.log(`✅ [${requestId}] getDoctorEvents completado exitosamente en ${totalExecutionTime}ms`);
    return processedEvents;
  } catch (error) {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const totalExecutionTime = Date.now() - startTime;
    
    console.error(`❌ [${requestId}] Error en getDoctorEvents:`, {
      errorId,
      executionTime: `${totalExecutionTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      functionParams: {
        doctorId,
        startDate: startDate.toISO(),
        endDate: endDate.toISO(),
        filters: filters || 'sin filtros'
      },
      timestamp: new Date().toISOString()
    });
    
    // Re-lanzar el error con información adicional
    if (error instanceof Error) {
      error.message = `[${requestId}][${errorId}] ${error.message}`;
    }
    
    throw error;
  }
}
