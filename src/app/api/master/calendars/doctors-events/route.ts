/**
 * @fileoverview API Route para obtener eventos de calendarios de todos los doctores de una organización
 * @version 1.0.0
 * @author Santiago Prada - Backend Developer
 * @date 2025-01-20
 * @since 1.0.0
 * @module OrganizationDoctorsCalendarEventsAPI
 *
 * @description
 * Esta API permite a los usuarios con rol "admin" (master) obtener todos los eventos
 * de los calendarios de Google Calendar de los doctores que pertenecen a su organización.
 *
 * La API implementa un patrón de consulta que:
 * 1. Valida la autenticación y autorización del usuario
 * 2. Obtiene todos los doctores de la organización que tengan calendar_id
 * 3. Para cada doctor, obtiene los eventos de su calendario de Google
 * 4. Consolida todos los eventos en una respuesta unificada
 *
 * @example
 * ```typescript
 * // Ejemplo de uso desde el cliente
 * const response = await fetch('/api/master/calendars/events?timeMin=2025-01-20T00:00:00Z&timeMax=2025-01-21T23:59:59Z', {
 *   method: 'GET',
 *   headers: {
 *     'Authorization': 'Bearer <firebase-token>',
 *     'Content-Type': 'application/json'
 *   }
 * });
 * 
 * const data = await response.json();
 * console.log(data.data); // Array de eventos consolidados de todos los doctores
 * ```
 *
 * @requires next/server - Para NextRequest y NextResponse
 * @requires @/app/lib/firebase/server/middleware/authMiddleware - Para autenticación
 * @requires @/db - Para conexión a base de datos con Drizzle ORM
 * @requires @/db/schema - Para esquemas de tablas (users, doctors)
 * @requires @/lib/google-calendar - Para integración con Google Calendar API
 * @requires @/types/api - Para tipos de respuesta estandarizados
 * @requires @/lib/api-helpers - Para helpers de validación y manejo de errores
 * @requires drizzle-orm - Para operaciones de base de datos
 * @requires firebase-admin/auth - Para tipos de token decodificado
 * @requires luxon - Para manejo de fechas y zonas horarias
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { db } from '@/db';
import { users, doctors } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { googleCalendarService } from '@/lib/google-calendar';
import { DateTime } from 'luxon';




/**
 * @interface ErrorResponse
 * @description Estructura de respuesta para errores de la API
 */
interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
}

/**
 * @interface DoctorCalendarEvent
 * @description Estructura que representa un evento de calendario con información del doctor
 */
interface DoctorCalendarEvent {
  doctorId: number;
  doctorName: string;
  speciality: string;
  calendarId: string;
  event: unknown; // Evento de Google Calendar
}

/**
 * @interface OrganizationCalendarEventsResponse
 * @description Estructura de respuesta exitosa para eventos de calendarios de la organización
 */
interface OrganizationCalendarEventsResponse {
  events: DoctorCalendarEvent[];
  totalEvents: number;
  totalDoctors: number;
  timeRange: {
    timeMin?: string;
    timeMax?: string;
  };
  organizationInfo: {
    organizationId: number;
  };
}

/**
 * @function handleGetRequest
 * @description Maneja las peticiones GET para obtener eventos de calendarios de todos los doctores de una organización
 * 
 * @async
 * @param {NextRequest} request - La petición HTTP entrante de Next.js
 * @param {DecodedIdToken} decodedToken - Token JWT decodificado de Firebase Authentication
 * 
 * @returns {Promise<NextResponse<OrganizationCalendarEventsResponse | ErrorResponse>>} 
 * Respuesta HTTP con los eventos consolidados o error
 */
async function handleGetRequest(
  request: NextRequest,
  userInfo: AuthenticatedUserInfo
): Promise<NextResponse<OrganizationCalendarEventsResponse | ErrorResponse>> {
  try {
    // 1. Extraer y validar parámetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const timeMin = searchParams.get('timeMin') || undefined;
    const timeMax = searchParams.get('timeMax') || undefined;

    // Validar formatos de fecha si se proporcionan
    if (timeMin && !isValidISODate(timeMin)) {
      return NextResponse.json(
        {
          error: 'INVALID_TIME_MIN',
          message: 'timeMin debe ser una fecha ISO 8601 válida',
          timestamp: new Date().toISOString(),
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    if (timeMax && !isValidISODate(timeMax)) {
      return NextResponse.json(
        {
          error: 'INVALID_TIME_MAX',
          message: 'timeMax debe ser una fecha ISO 8601 válida',
          timestamp: new Date().toISOString(),
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Validar lógica de rango de fechas
    if (timeMin && timeMax && new Date(timeMin) >= new Date(timeMax)) {
      return NextResponse.json(
        {
          error: 'INVALID_DATE_RANGE',
          message: 'timeMin debe ser anterior a timeMax',
          timestamp: new Date().toISOString(),
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Usar información del usuario ya obtenida y validada por el middleware optimizado
    const user = userInfo.user;
    // El middleware optimizado ya validó que el usuario tiene rol 'admin' y organización
    
    // Verificación adicional de tipo para TypeScript
    if (!user.organizationId) {
      return NextResponse.json(
        {
          error: 'NO_ORGANIZATION',
          message: 'Usuario no tiene una organización asociada',
          timestamp: new Date().toISOString(),
        } satisfies ErrorResponse,
        { status: 403 }
      );
    }

    // 5. Obtener todos los doctores de la organización que tengan calendar_id
    const doctorsResult = await db
      .select()
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(
        and(
          eq(users.organizationId, user.organizationId),
          isNotNull(doctors.calendar_id)
        )
      );

      console.log(doctorsResult);

    if (doctorsResult.length === 0) {
      return NextResponse.json(
        {
          events: [],
          totalEvents: 0,
          totalDoctors: 0,
          timeRange: { timeMin, timeMax },
          organizationInfo: {
            organizationId: user.organizationId,
          },
        } satisfies OrganizationCalendarEventsResponse,
        { status: 200 }
      );
    }

    // 6. Convertir fechas a objetos DateTime si se proporcionan
    const startDateTime = timeMin ? DateTime.fromISO(timeMin) : DateTime.now().startOf('day');
    const endDateTime = timeMax ? DateTime.fromISO(timeMax) : DateTime.now().endOf('day');

    // Validar objetos DateTime
    if (!startDateTime.isValid) {
      return NextResponse.json(
        {
          error: 'INVALID_START_DATE',
          message: 'Formato de fecha de inicio inválido',
          timestamp: new Date().toISOString(),
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    if (!endDateTime.isValid) {
      return NextResponse.json(
        {
          error: 'INVALID_END_DATE',
          message: 'Formato de fecha de fin inválido',
          timestamp: new Date().toISOString(),
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // 7. Obtener eventos de cada doctor de forma paralela
    const allEvents: DoctorCalendarEvent[] = [];
    const eventPromises = doctorsResult.map(async (doctorData) => {
      const doctor = doctorData.doctors;
      const doctorUser = doctorData.users;
      
      try {
        // Llamar a la API de Google Calendar para cada doctor
        const eventsResponse = await googleCalendarService.calendar.events.list({
          calendarId: doctor.calendar_id!,
          timeMin: startDateTime.toISO() || undefined,
          timeMax: endDateTime.toISO() || undefined,
          singleEvents: true, // Expandir eventos recurrentes
          orderBy: 'startTime',
        });

        const events = eventsResponse.data.items || [];
        
        // Formatear eventos con información del doctor
        return events.map(event => ({
          doctorId: doctor.idDoctor,
          doctorName: doctorUser.displayName || doctorUser.email || 'Doctor sin nombre',
          speciality: doctor.speciality,
          calendarId: doctor.calendar_id!,
          event,
        }));
      } catch (error) {
        console.error(`Error al obtener eventos del doctor ${doctor.idDoctor}:`, error);
        // En caso de error con un calendario específico, continuar con los demás
        return [];
      }
    });

    // Esperar a que todas las consultas de calendarios se completen
    const eventResults = await Promise.all(eventPromises);
    
    // Consolidar todos los eventos
    eventResults.forEach(doctorEvents => {
      allEvents.push(...doctorEvents);
    });

    // 8. Retornar respuesta exitosa
    return NextResponse.json(
      {
        events: allEvents,
        totalEvents: allEvents.length,
        totalDoctors: doctorsResult.length,
        timeRange: { timeMin, timeMax },
        organizationInfo: {
          organizationId: user.organizationId,
        },
      } satisfies OrganizationCalendarEventsResponse,
      { status: 200 }
    );

  } catch (error) {
    console.error('[GET /api/master/calendars/events] Error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Manejar errores específicos
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Límite de API excedido. Intente nuevamente más tarde',
            timestamp: new Date().toISOString(),
          } satisfies ErrorResponse,
          { status: 429 }
        );
      }

      if (error.message.includes('unauthorized') || error.message.includes('permission')) {
        return NextResponse.json(
          {
            error: 'CALENDAR_UNAUTHORIZED',
            message: 'Permisos insuficientes para acceder a los calendarios',
            timestamp: new Date().toISOString(),
          } satisfies ErrorResponse,
          { status: 403 }
        );
      }
    }

    // Error genérico del servidor
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Ocurrió un error inesperado al obtener los eventos de calendarios',
        timestamp: new Date().toISOString(),
      } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}

/**
 * @function isValidISODate
 * @description Valida si una cadena es una fecha ISO 8601 válida
 * @param {string} dateString - Cadena de fecha a validar
 * @returns {boolean} true si es válida, false en caso contrario
 */
function isValidISODate(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && dateString.includes('T');
  } catch {
    return false;
  }
}

/**
 * @function GET
 * @description Manejador HTTP GET para obtener eventos de calendarios de todos los doctores de una organización
 * 
 * @route GET /api/master/calendars/events
 * @access Private - Requiere autenticación Firebase y rol "admin"
 * @middleware withAuthentication - Middleware de autenticación Firebase
 * 
 * @param {NextRequest} request - Objeto de petición HTTP de Next.js
 * 
 * @query {string} [timeMin] - Fecha mínima en formato ISO 8601 (ej: 2025-01-20T00:00:00Z)
 * @query {string} [timeMax] - Fecha máxima en formato ISO 8601 (ej: 2025-01-21T23:59:59Z)
 * 
 * @returns {Promise<NextResponse<OrganizationCalendarEventsResponse | ErrorResponse>>} 
 * Respuesta HTTP con los eventos consolidados de todos los calendarios
 * 
 * @example
 * ```bash
 * # Ejemplo de petición cURL
 * curl -X GET \
 *   'https://tu-dominio.com/api/master/calendars/events?timeMin=2025-01-20T00:00:00Z&timeMax=2025-01-21T23:59:59Z' \
 *   -H 'Authorization: Bearer <firebase-id-token>' \
 *   -H 'Content-Type: application/json'
 * ```
 * 
 * @httpStatus 200 - Éxito: Retorna eventos consolidados de calendarios
 * @httpStatus 400 - Error de validación: Parámetros de fecha inválidos
 * @httpStatus 401 - No autorizado: Token Firebase inválido o expirado
 * @httpStatus 403 - Prohibido: Usuario sin rol admin o sin organización
 * @httpStatus 404 - No encontrado: Usuario no existe en la base de datos
 * @httpStatus 429 - Límite excedido: Rate limit de Google Calendar API
 * @httpStatus 500 - Error interno: Error de servidor o base de datos
 */
export const GET = withOptimizedAuthentication(handleGetRequest, {
  requiredRoles: 'admin',
  requireOrganization: true
});