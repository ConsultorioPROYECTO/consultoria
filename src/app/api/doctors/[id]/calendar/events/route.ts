import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { getDoctorEvents } from '@/lib/calendar-event-retriever';
import { BreakTimeType, BREAK_TIME_TYPES } from '@/types/google-calendar';
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';

/**
 * @fileoverview API endpoint para obtener eventos del calendario de un doctor específico.
 * 
 * Este módulo implementa un endpoint REST que permite consultar eventos de calendario
 * (citas médicas y períodos de descanso) para un doctor específico dentro de un rango
 * de fechas determinado. La API integra con Google Calendar a través del sistema de
 * gestión de eventos centralizado y proporciona capacidades avanzadas de filtrado.
 * 
 * @remarks
 * 
 * **Arquitectura del endpoint:**
 * - Utiliza Next.js App Router con parámetros de ruta dinámicos [id]
 * - Integra con {@link getDoctorEvents} para consulta centralizada de eventos
 * - Implementa validación robusta de parámetros de entrada con Luxon DateTime
 * - Maneja errores de forma consistente con logging detallado para debugging
 * - Sigue principios de TypeScript strict para type safety
 * 
 * **Lógica de procesamiento:**
 * 1. **Validación de parámetros:** Extrae y valida el ID del doctor desde la ruta
 * 2. **Procesamiento de fechas:** Convierte parámetros de fecha ISO a objetos DateTime
 * 3. **Construcción de filtros:** Aplica filtros opcionales por tipo de evento y estado
 * 4. **Consulta de eventos:** Llama a getDoctorEvents con parámetros validados
 * 5. **Serialización:** Convierte objetos DateTime a formato ISO para respuesta JSON
 * 6. **Respuesta estructurada:** Retorna eventos con metadatos de conteo y rango
 * 
 * **Tipos de eventos soportados:**
 * - **Citas médicas (default):** Eventos con propiedades de paciente y servicio
 * - **Períodos de descanso (break):** Eventos de tiempo fuera de oficina
 * - **Eventos básicos (basic):** Eventos sin propiedades extendidas del sistema
 * 
 * **Capacidades de filtrado:**
 * - Por tipo de evento: 'default', 'break', 'basic'
 * - Por estado de cita: 'Confirmada', 'Completada', 'Cancelada', etc.
 * - Por tipo de descanso: 'lunch', 'personal', 'meeting', 'other'
 * 
 * @example
 * // Obtener todas las citas y descansos para el doctor 123 en julio 2025
 * const response = await fetch('/api/doctors/123/calendar/events?startDate=2025-07-01&endDate=2025-07-31');
 * const data = await response.json();
 * console.log(`Encontrados ${data.eventCount} eventos`);
 * 
 * @author Santiago Prada - Backend Developer
 * @version 1.2.0
 * @since 2025-01-15
 */
/**
 * Maneja las peticiones GET para obtener eventos del calendario de un doctor específico.
 * 
 * Esta función implementa la lógica principal del endpoint, procesando parámetros de entrada,
 * validando fechas, aplicando filtros opcionales y consultando eventos desde Google Calendar
 * a través del sistema de gestión centralizado.
 * 
 * @param request - Objeto NextRequest que contiene los parámetros de consulta (query parameters)
 * @param params - Objeto que contiene los parámetros de ruta, específicamente el ID del doctor
 * @param params.id - ID único del doctor como string (extraído de la ruta [id])
 * 
 * @returns Promise que resuelve a NextResponse con:
 * - **200 OK:** Array de eventos con metadatos (eventCount, dateRange)
 * - **400 Bad Request:** Error de validación de parámetros (fechas inválidas, ID malformado)
 * - **404 Not Found:** Doctor no encontrado en el sistema
 * - **500 Internal Server Error:** Error interno del servidor o de Google Calendar API
 * 
 * @remarks
 * 
 * **Parámetros de consulta requeridos:**
 * - `startDate`: Fecha de inicio en formato ISO (YYYY-MM-DD)
 * - `endDate`: Fecha de fin en formato ISO (YYYY-MM-DD)
 * 
 * **Parámetros de consulta opcionales:**
 * - `eventType`: Filtra por tipo ('default' para citas, 'break' para descansos, 'basic' para eventos simples)
 * - `appointmentStatus`: Filtra citas por estado ('Confirmada', 'Completada', 'Cancelada', etc.)
 * - `breakTimeType`: Filtra descansos por tipo ('lunch', 'personal', 'meeting', 'other')
 * 
 * **Flujo de procesamiento:**
 * 1. Extrae y valida el doctorId desde params.id
 * 2. Obtiene parámetros de consulta desde request.nextUrl.searchParams
 * 3. Valida y convierte fechas usando Luxon DateTime con zona horaria UTC
 * 4. Construye objeto de filtros opcionales basado en parámetros
 * 5. Llama a getDoctorEvents con parámetros validados
 * 6. Serializa fechas DateTime a formato ISO para respuesta JSON
 * 7. Retorna respuesta estructurada con eventos y metadatos
 * 
 * **Manejo de errores:**
 * - Valida que startDate y endDate sean fechas válidas
 * - Verifica que endDate sea posterior o igual a startDate
 * - Maneja errores de getDoctorEvents con logging detallado
 * - Retorna códigos de estado HTTP apropiados según el tipo de error
 * 
 * @example
 * // Petición típica para obtener eventos de un doctor
 * const response = await fetch('/api/doctors/123/calendar/events?startDate=2025-07-01&endDate=2025-07-31');
 * const result = await response.json();
 * // result.events contiene los eventos encontrados
 * // result.eventCount contiene el número total de eventos
 * // result.dateRange contiene el rango de fechas consultado
 * 
 * @throws {Error} Cuando los parámetros de fecha son inválidos o malformados
 * @throws {Error} Cuando el doctorId no es un número válido
 * @throws {Error} Cuando getDoctorEvents falla por problemas de conectividad o permisos
 */
const getHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  ...args: unknown[]
): Promise<NextResponse | Response> => {
  const { params } = args[0] as { params: Promise<{ id: string }> };
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
      eventType?: 'default' | 'break';
      appointmentStatus?: string;
      breakTimeType?: BreakTimeType;
    } = {};

    console.log(`🔍 [${requestId}] Processing eventType filter:`, {
      input: eventType,
      isAppointment: eventType === 'default',
      isBreak: eventType === 'break',
      isValid: eventType === 'default' || eventType === 'break'
    });
    
    if (eventType === 'default' || eventType === 'break') {
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
    const serializedEvents = events.map(event => ({
      ...event,
      startDateTime: event.startDateTime.toISO(),
      endDateTime: event.endDateTime.toISO(),
    }));

    const responseData = {
      eventCount: events.length,
      dateRange: {
        start: startDate.toISODate(),
        end: endDate.toISODate(),
      },
      events: serializedEvents,
    };

    console.log(`📊 [${requestId}] Response data summary:`, {
      eventCount: responseData.eventCount,
      dateRangeStart: responseData.dateRange.start,
      dateRangeEnd: responseData.dateRange.end,
      responseSize: JSON.stringify(responseData).length + ' characters'
    });
    
    console.log(`✅ [${requestId}] API request completed successfully`);
    console.log(`📤 [${requestId}] Sending response with ${responseData.eventCount} events`);
    
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
};

export const GET = withOptimizedAuthentication(getHandler, {
  requiredRoles: ['admin', 'medico', 'asistente'],
  requireOrganization: false
});