import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { getDoctorEvents } from '@/lib/calendar-event-retriever';
import { BreakTimeType, BREAK_TIME_TYPES } from '@/types/google-calendar';

/**
 * @fileoverview API endpoint para obtener eventos del calendario de un doctor.
 * @description Este endpoint permite obtener eventos (citas o descansos) de un doctor
 * en un rango de fechas, con opciones de filtrado por tipo de evento, estado de cita
 * o tipo de descanso.
 * 
 * @route GET /api/doctors/[id]/calendar/events
 * @param {string} id - ID del doctor (parámetro de ruta)
 * @param {string} startDate - Fecha de inicio en formato YYYY-MM-DD (parámetro de consulta)
 * @param {string} endDate - Fecha de fin en formato YYYY-MM-DD (parámetro de consulta)
 * @param {string} [eventType] - Tipo de evento a filtrar ('appointment', 'break' o 'basic')
 * @param {string} [appointmentStatus] - Estado de la cita a filtrar (ej. "Confirmada", "Completada")
 * @param {string} [breakTimeType] - Tipo de descanso a filtrar ('lunch', 'personal', 'meeting', 'other')
 * 
 * @returns {Array<AppointmentEventData | BreakTimeEventData>} Array de eventos.
 * @returns {Object} Error object en caso de fallo.
 * 
 * @example
 * // Obtener todas las citas y descansos para el doctor 123 entre dos fechas
 * GET /api/doctors/123/calendar/events?startDate=2025-07-01&endDate=2025-07-31
 * 
 * @example
 * // Obtener solo citas confirmadas para el doctor 123
 * GET /api/doctors/123/calendar/events?startDate=2025-07-01&endDate=2025-07-31&eventType=appointment&appointmentStatus=Confirmada
 * 
 * @example
 * // Obtener solo descansos de tipo 'lunch' para el doctor 123
 * GET /api/doctors/123/calendar/events?startDate=2025-07-01&endDate=2025-07-31&eventType=break&breakTimeType=lunch
 * 
 * @example
 * // Obtener solo eventos básicos (sin propiedades extendidas) para el doctor 123
 * GET /api/doctors/123/calendar/events?startDate=2025-07-01&endDate=2025-07-31&eventType=basic
 * 
 * @swagger
 * /api/doctors/{id}/calendar/events:
 *   get:
 *     summary: Obtener eventos del calendario de un doctor
 *     description: Permite obtener eventos (citas o descansos) de un doctor en un rango de fechas, con opciones de filtrado.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del doctor.
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio para la consulta (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin para la consulta (YYYY-MM-DD).
 *       - in: query
 *         name: eventType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [appointment, break, basic]
 *         description: Tipo de evento a filtrar.
 *       - in: query
 *         name: appointmentStatus
 *         required: false
 *         schema:
 *           type: string
 *         description: Estado de la cita a filtrar (solo si eventType es 'appointment').
 *       - in: query
 *         name: breakTimeType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [lunch, personal, meeting, other]
 *         description: Tipo de descanso a filtrar (solo si eventType es 'break').
 *     responses:
 *       200:
 *         description: Lista de eventos del calendario.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/AppointmentEventData'
 *                   - $ref: '#/components/schemas/BreakTimeEventData'
 *       400:
 *         description: Parámetros inválidos.
 *       404:
 *         description: Doctor no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🚀 [${requestId}] API: /api/doctors/[id]/calendar/events - Request received`);
  console.log(`📋 [${requestId}] Request URL:`, request.url);
  console.log(`🔧 [${requestId}] Request method:`, request.method);
  console.log(`📅 [${requestId}] Request timestamp:`, new Date().toISOString());
  
  try {
    console.log(`🔍 [${requestId}] Extracting params from request...`);
    const { id } = await params;
    console.log(`📝 [${requestId}] Raw doctor ID from params:`, { id, type: typeof id });
    
    const doctorId = parseInt(id, 10);
    console.log(`🔢 [${requestId}] Parsed doctorId:`, { doctorId, isValid: !isNaN(doctorId) });
    
    if (isNaN(doctorId)) {
      console.error(`❌ [${requestId}] Validation Error: Invalid doctor ID:`, { originalId: id, parsedId: doctorId });
      return NextResponse.json(
        { error: 'Invalid doctor ID' },
        { status: 400 }
      );
    }
    
    console.log(`✅ [${requestId}] Doctor ID validation passed:`, doctorId);

    console.log(`🔗 [${requestId}] Extracting query parameters from URL...`);
    const { searchParams } = new URL(request.url);
    
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const eventType = searchParams.get('eventType');
    const appointmentStatus = searchParams.get('appointmentStatus');
    const breakTimeType = searchParams.get('breakTimeType');

    console.log(`📊 [${requestId}] Raw query parameters extracted:`, {
      startDateParam,
      endDateParam,
      eventType,
      appointmentStatus,
      breakTimeType,
      allParams: Object.fromEntries(searchParams.entries())
    });
    
    console.log(`🔍 [${requestId}] Query parameter types:`, {
      startDateParam: typeof startDateParam,
      endDateParam: typeof endDateParam,
      eventType: typeof eventType,
      appointmentStatus: typeof appointmentStatus,
      breakTimeType: typeof breakTimeType
    });

    console.log(`🔐 [${requestId}] Validating required date parameters...`);
    if (!startDateParam || !endDateParam) {
      console.error(`❌ [${requestId}] Validation Error: Missing required date parameters:`, {
        startDateParam: startDateParam || 'MISSING',
        endDateParam: endDateParam || 'MISSING',
        hasStartDate: !!startDateParam,
        hasEndDate: !!endDateParam
      });
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }
    
    console.log(`✅ [${requestId}] Required date parameters validation passed`);

    console.log(`📅 [${requestId}] Parsing date parameters with Luxon...`);
    const startDate = DateTime.fromISO(startDateParam, { zone: 'utc' });
    const endDate = DateTime.fromISO(endDateParam, { zone: 'utc' });
    
    console.log(`🔍 [${requestId}] Date parsing results:`, {
      startDate: {
        input: startDateParam,
        parsed: startDate.toISO(),
        isValid: startDate.isValid,
        invalidReason: startDate.invalidReason,
        zone: startDate.zoneName
      },
      endDate: {
        input: endDateParam,
        parsed: endDate.toISO(),
        isValid: endDate.isValid,
        invalidReason: endDate.invalidReason,
        zone: endDate.zoneName
      }
    });

    if (!startDate.isValid || !endDate.isValid) {
      console.error(`❌ [${requestId}] Date validation failed:`, {
        startDateParam,
        endDateParam,
        startDateValid: startDate.isValid,
        endDateValid: endDate.isValid,
        startDateError: startDate.invalidReason,
        endDateError: endDate.invalidReason
      });
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD format' },
        { status: 400 }
      );
    }
    
    console.log(`✅ [${requestId}] Date parsing validation passed`);
    console.log(`📊 [${requestId}] Final parsed date range:`, {
      startDate: startDate.toISO(),
      endDate: endDate.toISO(),
      duration: endDate.diff(startDate, 'days').days + ' days'
    });

    console.log(`🔧 [${requestId}] Building filters object...`);
    const filters: {
      eventType?: 'appointment' | 'break';
      appointmentStatus?: string;
      breakTimeType?: BreakTimeType;
    } = {};

    console.log(`🔍 [${requestId}] Processing eventType filter:`, {
      input: eventType,
      isAppointment: eventType === 'appointment',
      isBreak: eventType === 'break',
      isValid: eventType === 'appointment' || eventType === 'break'
    });
    
    if (eventType === 'appointment' || eventType === 'break') {
      filters.eventType = eventType;
      console.log(`✅ [${requestId}] EventType filter applied:`, eventType);
    } else if (eventType) {
      console.log(`⚠️ [${requestId}] Invalid eventType ignored:`, eventType);
    }
    
    console.log(`🔍 [${requestId}] Processing appointmentStatus filter:`, {
      input: appointmentStatus,
      hasValue: !!appointmentStatus,
      length: appointmentStatus?.length || 0
    });
    
    if (appointmentStatus) {
      filters.appointmentStatus = appointmentStatus;
      console.log(`✅ [${requestId}] AppointmentStatus filter applied:`, appointmentStatus);
    }
    
    console.log(`🔍 [${requestId}] Processing breakTimeType filter:`, {
      input: breakTimeType,
      hasValue: !!breakTimeType,
      availableTypes: BREAK_TIME_TYPES,
      isValidType: breakTimeType && BREAK_TIME_TYPES.includes(breakTimeType as BreakTimeType)
    });
    
    if (breakTimeType && BREAK_TIME_TYPES.includes(breakTimeType as BreakTimeType)) {
      filters.breakTimeType = breakTimeType as BreakTimeType;
      console.log(`✅ [${requestId}] BreakTimeType filter applied:`, breakTimeType);
    } else if (breakTimeType) {
      console.log(`⚠️ [${requestId}] Invalid breakTimeType ignored:`, breakTimeType);
    }
    
    console.log(`📋 [${requestId}] Final filters object:`, {
      filters,
      filterCount: Object.keys(filters).length,
      hasEventTypeFilter: !!filters.eventType,
      hasAppointmentStatusFilter: !!filters.appointmentStatus,
      hasBreakTimeTypeFilter: !!filters.breakTimeType
    });

    console.log(`🚀 [${requestId}] Calling getDoctorEvents function...`);
    console.log(`📊 [${requestId}] getDoctorEvents parameters:`, {
      doctorId,
      startDate: startDate.toISO(),
      endDate: endDate.toISO(),
      filters,
      parameterTypes: {
        doctorId: typeof doctorId,
        startDate: startDate.constructor.name,
        endDate: endDate.constructor.name,
        filters: typeof filters
      }
    });
    
    const startTime = Date.now();
    console.log(`⏱️ [${requestId}] getDoctorEvents call started at:`, new Date(startTime).toISOString());
    
    const events = await getDoctorEvents(
      doctorId,
      startDate,
      endDate,
      filters
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`⏱️ [${requestId}] getDoctorEvents call completed in ${duration}ms`);
    
    console.log(`📈 [${requestId}] getDoctorEvents results summary:`, {
      totalEvents: events.length,
      eventsReceived: !!events,
      isArray: Array.isArray(events),
      firstEventType: events[0] ? ('isBreakTime' in events[0] && events[0].isBreakTime ? 'break' : 'appointment') : 'N/A',
      eventTypes: [...new Set(events.map(e => 'isBreakTime' in e && e.isBreakTime ? 'break' : 'appointment'))],
      executionTime: `${duration}ms`
    });
    
    console.log(`🔍 [${requestId}] Detailed events analysis:`);
    events.forEach((event, index) => {
      if ('isBreakTime' in event && event.isBreakTime) {
        console.log(`📝 [${requestId}] Event ${index + 1} (Break):`, {
          eventType: 'break',
          breakTimeType: event.breakTimeType,
          summary: event.summary,
          start: event.startDateTime.toISO(),
          end: event.endDateTime.toISO(),
          timezone: event.timezone
        });
      } else {
        console.log(`📝 [${requestId}] Event ${index + 1} (Appointment):`, {
          eventType: 'appointment',
          summary: event.summary,
          start: event.startDateTime.toISO(),
          end: event.endDateTime.toISO(),
          location: event.location,
          timezone: event.timezone
        });
      }
    });

    console.log(`📦 [${requestId}] Building response object...`);
    const responseData = {
      success: true,
      data: {
        events: events.map(event => {
          if ('isBreakTime' in event && event.isBreakTime) {
            return {
              eventType: 'break',
              breakTimeType: event.breakTimeType,
              summary: event.summary,
              start: event.startDateTime.toISO(),
              end: event.endDateTime.toISO(),
              timezone: event.timezone,
              calendarId: event.calendarId
            };
          } else {
            return {
              eventType: 'appointment',
              summary: event.summary,
              description: event.description,
              location: event.location,
              meetingLink: event.meetingLink,
              start: event.startDateTime.toISO(),
              end: event.endDateTime.toISO(),
              timezone: event.timezone,
              calendarId: event.calendarId
            };
          }
        }),
        dateRange: {
          start: startDate.toISODate(),
          end: endDate.toISODate(),
        },
        count: events.length,
      },
    };
    
    console.log(`📊 [${requestId}] Response data summary:`, {
      success: responseData.success,
      eventCount: responseData.data.count,
      dateRangeStart: responseData.data.dateRange.start,
      dateRangeEnd: responseData.data.dateRange.end,
      responseSize: JSON.stringify(responseData).length + ' characters'
    });
    
    console.log(`✅ [${requestId}] API request completed successfully`);
    console.log(`📤 [${requestId}] Sending response with ${events.length} events`);
    
    return NextResponse.json(responseData);
  } catch (error) {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.error(`💥 [${requestId}] [${errorId}] Critical error in doctor calendar events API:`);
    console.error(`🔍 [${requestId}] [${errorId}] Error details:`, {
      doctorId: (await params).id,
      errorType: error?.constructor?.name || 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      requestUrl: request.url,
      requestMethod: request.method
    });
    
    console.error(`📊 [${requestId}] [${errorId}] Error context:`, {
      hasParams: !!(await params),
      paramsId: (await params)?.id,
      requestHeaders: Object.fromEntries(request.headers.entries()),
      userAgent: request.headers.get('user-agent')
    });
    
    if (error instanceof Error) {
      console.error(`🔧 [${requestId}] [${errorId}] Error stack trace:`);
      console.error(error.stack);
    }
    
    console.error(`❌ [${requestId}] [${errorId}] Returning 500 error response`);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}