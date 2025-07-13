/**
 * @fileoverview API endpoint para obtener todos los eventos de calendario de los doctores de una organización
 * 
 * Esta API permite a los administradores de una organización obtener todos los eventos de calendario
 * de los doctores que pertenecen a su organización. Incluye validación de permisos de administrador
 * y filtrado por fechas, doctor específico y tipo de evento.
 * 
 * @route GET /api/master/calendars/events
 * @access Admin only
 * @version 1.0.0
 * @author 
 */

import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { users, doctors, organization } from '@/db/schema';
import { withAuthentication } from '@/app/lib/firebase/server/middleware/authMiddleware';
import { handleDatabaseError, ensureDoctorHasCalendar } from '@/lib/api-helpers';
import { getDoctorEvents } from '@/lib/calendar-event-retriever';
import { createSuccessResponse, createErrorResponse, API_ERRORS, HTTP_STATUS } from '@/types/api';
import { DateTime } from 'luxon';
import { z } from 'zod';

/**
 * Esquema de validación para los parámetros de consulta
 */
const queryParamsSchema = z.object({
  startDate: z.string().optional().refine((date) => {
    if (!date) return true;
    return !isNaN(Date.parse(date));
  }, { message: 'startDate debe ser una fecha válida' }),
  
  endDate: z.string().optional().refine((date) => {
    if (!date) return true;
    return !isNaN(Date.parse(date));
  }, { message: 'endDate debe ser una fecha válida' }),
  
  doctorId: z.string().optional(),
  eventType: z.enum(['appointment', 'break_time', 'all']).optional().default('all')
});

/**
 * Interfaz para la respuesta de eventos de calendario
 */
interface CalendarEventResponse {
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  speciality: string;
  events: unknown[];
  totalEvents: number;
}

/**
 * Interfaz para la respuesta completa de la API
 */
interface OrganizationEventsResponse {
  organizationId: string;
  organizationName: string;
  doctors: CalendarEventResponse[];
  totalDoctors: number;
  totalEvents: number;
  filters: {
    startDate?: string;
    endDate?: string;
    doctorId?: string;
    eventType: string;
  };
}

/**
 * Maneja las solicitudes GET para obtener eventos de calendario de todos los doctores de la organización
 * 
 * @param request - Objeto de solicitud de Next.js
 * @param decodedToken - Token decodificado de Firebase con información del usuario autenticado
 * 
 * @returns Promise<Response> - Respuesta JSON con los eventos de calendario o error
 * 
 * @throws {400} Parámetros de consulta inválidos
 * @throws {401} Usuario no autenticado
 * @throws {403} Usuario no es administrador de la organización
 * @throws {404} Organización no encontrada
 * @throws {500} Error interno del servidor
 * 
 * @example
 * ```typescript
 * // Obtener todos los eventos de la organización
 * GET /api/master/calendars/events
 * 
 * // Filtrar por fechas
 * GET /api/master/calendars/events?startDate=2024-01-01&endDate=2024-01-31
 * 
 * // Filtrar por doctor específico
 * GET /api/master/calendars/events?doctorId=123
 * 
 * // Filtrar por tipo de evento
 * GET /api/master/calendars/events?eventType=appointment
 * ```
 */
async function getOrganizationEventsHandler(
  request: NextRequest,
  decodedToken: { uid: string; [key: string]: unknown }
): Promise<Response> {
  try {
    // Extraer parámetros de consulta
    const { searchParams } = new URL(request.url);
    const queryParams = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      doctorId: searchParams.get('doctorId') || undefined,
      eventType: searchParams.get('eventType') || 'all'
    };

    // Validar parámetros de consulta
    const validationResult = queryParamsSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        `Validation failed: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const { startDate, endDate, doctorId, eventType } = validationResult.data;

    // Validar fechas si ambas están presentes
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return createErrorResponse(
        'La fecha de inicio no puede ser posterior a la fecha de fin',
        undefined,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Obtener información del usuario autenticado
    const [user] = await db
      .select({
        id: users.id,
        role: users.role,
        organizationId: users.organizationId,
        email: users.email
      })
      .from(users)
      .where(eq(users.firebaseUid, decodedToken.uid))
      .limit(1);

    if (!user) {
      return createErrorResponse(
        API_ERRORS.USER_NOT_FOUND,
        undefined,
        HTTP_STATUS.NOT_FOUND
      );
    }

    // Validar que el usuario sea administrador
    if (user.role !== 'admin') {
      return createErrorResponse(
        'Acceso denegado: Se requiere rol de administrador',
        undefined,
        HTTP_STATUS.FORBIDDEN
      );
    }

    if (!user.organizationId) {
      return createErrorResponse(
        'El usuario no pertenece a ninguna organización',
        undefined,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Obtener información de la organización
    const [org] = await db
      .select({
        id: organization.id,
        name: organization.name
      })
      .from(organization)
      .where(eq(organization.id, user.organizationId))
      .limit(1);

    if (!org) {
      return createErrorResponse(
        'Organización no encontrada',
        undefined,
        HTTP_STATUS.NOT_FOUND
      );
    }

    // Construir consulta para obtener doctores
    const whereConditions = [eq(users.organizationId, user.organizationId)];
    
    // Filtrar por doctor específico si se proporciona
    if (doctorId) {
      whereConditions.push(eq(doctors.idDoctor, parseInt(doctorId)));
    }

    const organizationDoctors = await db
      .select({
        idDoctor: doctors.idDoctor,
        userId: doctors.userId,
        speciality: doctors.speciality,
        calendar_id: doctors.calendar_id,
        userEmail: users.email,
        userName: users.displayName
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(...whereConditions));

    if (organizationDoctors.length === 0) {
      return createSuccessResponse<OrganizationEventsResponse>({
        organizationId: org.id.toString(),
        organizationName: org.name,
        doctors: [],
        totalDoctors: 0,
        totalEvents: 0,
        filters: {
          startDate,
          endDate,
          doctorId,
          eventType
        }
      }, 'Eventos de calendario obtenidos exitosamente');
    }

    // Obtener eventos para cada doctor
    const doctorEventsPromises = organizationDoctors.map(async (doctor) => {
      try {
        // Asegurar que el doctor tenga calendar_id
        await ensureDoctorHasCalendar(doctor.idDoctor, {
          firstName: doctor.userName || 'Doctor',
          lastName: '',
          email: doctor.userEmail || undefined
        });
        
        // Obtener eventos del doctor
        const startDateTime = startDate ? DateTime.fromISO(startDate) : DateTime.now().startOf('day');
        const endDateTime = endDate ? DateTime.fromISO(endDate) : DateTime.now().plus({ days: 30 }).endOf('day');
        
        const events = await getDoctorEvents(
          doctor.idDoctor,
          startDateTime,
          endDateTime,
          {
            eventType: eventType === 'appointment' ? 'default' : eventType === 'break_time' ? 'break' : undefined
          }
        );

        return {
          doctorId: doctor.idDoctor.toString(),
          doctorName: doctor.userName || 'Sin nombre',
          doctorEmail: doctor.userEmail || '',
          speciality: doctor.speciality || 'Sin especialidad',
          events: events || [],
          totalEvents: events?.length || 0
        };
      } catch (error) {
        console.error(`Error obteniendo eventos para doctor ${doctor.idDoctor}:`, error);
        return {
          doctorId: doctor.idDoctor.toString(),
          doctorName: doctor.userName || 'Sin nombre',
          doctorEmail: doctor.userEmail || '',
          speciality: doctor.speciality || 'Sin especialidad',
          events: [],
          totalEvents: 0
        };
      }
    });

    const doctorEventsResults = await Promise.all(doctorEventsPromises);
    
    // Calcular totales
    const totalEvents = doctorEventsResults.reduce(
      (sum, doctor) => sum + doctor.totalEvents, 
      0
    );

    const response: OrganizationEventsResponse = {
      organizationId: org.id.toString(),
      organizationName: org.name,
      doctors: doctorEventsResults,
      totalDoctors: doctorEventsResults.length,
      totalEvents,
      filters: {
        startDate,
        endDate,
        doctorId,
        eventType
      }
    };

    return createSuccessResponse(response, 'Eventos de calendario obtenidos exitosamente');

  } catch (error) {
    console.error('Error en getOrganizationEventsHandler:', error);
    return handleDatabaseError(error, 'obtener eventos de calendario');
  }
}

/**
 * Exportación del manejador GET con middleware de autenticación
 * 
 * @description Endpoint para obtener todos los eventos de calendario de los doctores de una organización
 * @access Requiere autenticación y rol de administrador
 * @param request - Solicitud HTTP entrante
 * @returns Respuesta con eventos de calendario o error
 */
export const GET = withAuthentication(getOrganizationEventsHandler);