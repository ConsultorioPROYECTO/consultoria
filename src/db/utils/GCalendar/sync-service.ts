/**
 * @fileoverview Servicio de sincronización bidireccional entre Google Calendar y la base de datos
 * @description Este módulo proporciona funciones para sincronizar citas médicas entre la base de datos local
 * y Google Calendar. Incluye operaciones para crear, actualizar y eliminar eventos, así como verificar
 * conflictos de horarios y manejar sincronizaciones masivas.
 * @author Santiago Prada
 * @version 1.0.0
 * @Date 2025/06/17
 */

// src/db/utils/GCalendar/sync-service.ts

import { z } from 'zod';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  getEvent,
  getEvents,
  checkAvailability,
  type CalendarOperationResult,
} from '@/app/lib/google-calendar';
import {
  getDoctorWithCalendar,
  createAppointmentWithCalendar,
  updateAppointmentSyncStatus,
  getAppointmentByGoogleEventId,
  getDoctorAppointmentsByDateRange,
  getPendingSyncAppointments,
  getFailedSyncAppointments,
  updateDoctorLastSync,
  type AppointmentWithCalendar,
  type SyncStatus,
} from './calendar-db-utils';
import { appointments, type Appointment } from '@/db/schema/appointments';
import { doctors, type Doctor } from '@/db/schema/doctors';

/**
 * @fileoverview Servicio de sincronización entre Google Calendar y la base de datos
 * @author Santiago Prada
 * @description Funciones para sincronizar eventos bidireccionales entre Google Calendar y la BD
 */

// --- Schemas de validación ---

/**
 * Schema de validación para eventos de Google Calendar
 * @description Define la estructura esperada de un evento de Google Calendar
 */
export const GoogleEventSchema = z.object({
  /** ID único del evento en Google Calendar */
  id: z.string(),
  /** Título o resumen del evento */
  summary: z.string(),
  /** Descripción opcional del evento */
  description: z.string().optional(),
  /** Información de fecha y hora de inicio */
  start: z.object({
    /** Fecha y hora de inicio en formato ISO */
    dateTime: z.string(),
    /** Zona horaria opcional */
    timeZone: z.string().optional(),
  }),
  /** Información de fecha y hora de fin */
  end: z.object({
    /** Fecha y hora de fin en formato ISO */
    dateTime: z.string(),
    /** Zona horaria opcional */
    timeZone: z.string().optional(),
  }),
  /** Ubicación opcional del evento */
  location: z.string().optional(),
  /** Lista opcional de asistentes */
  attendees: z.array(z.object({
    /** Email del asistente */
    email: z.string(),
    /** Nombre para mostrar del asistente */
    displayName: z.string().optional(),
  })).optional(),
});

/**
 * Schema de validación para resultados de sincronización
 * @description Define la estructura del resultado de operaciones de sincronización
 */
export const SyncResultSchema = z.object({
  /** Indica si la operación fue exitosa */
  success: z.boolean(),
  /** ID de la cita en la base de datos (opcional) */
  appointmentId: z.number().optional(),
  /** ID del evento en Google Calendar (opcional) */
  googleEventId: z.string().optional(),
  /** Mensaje de error en caso de fallo (opcional) */
  error: z.string().optional(),
  /** Acción realizada durante la sincronización */
  action: z.enum(['created', 'updated', 'deleted', 'skipped']),
  /** Timestamp de cuando se realizó la operación */
  timestamp: z.date(),
});

/**
 * Tipo inferido del schema de eventos de Google Calendar
 * @typedef {Object} GoogleEvent
 */
export type GoogleEvent = z.infer<typeof GoogleEventSchema>;

/**
 * Tipo inferido del schema de resultados de sincronización
 * @typedef {Object} SyncResult
 */
export type SyncResult = z.infer<typeof SyncResultSchema>;

// --- Funciones de sincronización ---

/**
 * Sincroniza una cita local hacia Google Calendar
 * @description Crea o actualiza un evento en Google Calendar basado en una cita de la base de datos
 * @param {Appointment} appointment - La cita a sincronizar con Google Calendar
 * @returns {Promise<SyncResult>} Resultado de la operación de sincronización
 * @throws {Error} Si no se encuentra el doctor o hay errores en la API de Google Calendar
 * @example
 * ```typescript
 * const appointment = await getAppointmentById(123);
 * const result = await syncAppointmentToGoogle(appointment);
 * if (result.success) {
 *   console.log(`Evento creado/actualizado: ${result.googleEventId}`);
 * }
 * ```
 */
export async function syncAppointmentToGoogle(
  appointment: Appointment
): Promise<SyncResult> {
  try {
    // Obtener información del doctor
    const doctor = await getDoctorWithCalendar(appointment.doctorId);
    if (!doctor) {
      throw new Error('Doctor no encontrado');
    }

    if (!doctor.calendar_sync_enabled) {
      return {
      success: false,
      appointmentId: appointment.id,
      error: 'Sincronización deshabilitada para este doctor',
      action: 'skipped',
      timestamp: new Date(),
    };
    }

    // Preparar datos del evento
    const eventData = {
      summary: `Cita médica - ${appointment.patientName || 'Paciente'}`,
      description: appointment.notes || 'Cita médica programada',
      start: {
        dateTime: combineDateTime(appointment.date, appointment.time),
        timeZone: doctor.calendar_timezone || 'America/Bogota',
      },
      end: {
        dateTime: addMinutesToDateTime(
          combineDateTime(appointment.date, appointment.time),
          appointment.duration_minutes || doctor.appointment_duration || 30
        ),
        timeZone: doctor.calendar_timezone || 'America/Bogota',
      },
      attendees: [{
        email: '', // TODO: Get patient email from patient relation
        displayName: appointment.patientName || 'Paciente',
      }],
      location: appointment.is_virtual ? 'Virtual' : 'Consultorio médico',
    };

    let googleEventId: string;
    let action: 'created' | 'updated';

    if (appointment.google_event_id) {
      // Actualizar evento existente
      const result = await updateEvent(
        doctor.calendar_id,
        appointment.google_event_id,
        eventData
      );
      
      if (!result.success || !result.data?.id) {
        throw new Error(result.error || 'Failed to update Google Calendar event');
      }
      
      googleEventId = result.data.id;
      action = 'updated';
    } else {
      // Crear nuevo evento
      const result = await createEvent(
        doctor.calendar_id,
        eventData
      );
      
      if (!result.success || !result.data?.id) {
        throw new Error(result.error || 'Failed to create Google Calendar event');
      }
      
      googleEventId = result.data.id;
      action = 'created';
    }

    // Actualizar estado en la base de datos
    await updateAppointmentSyncStatus(appointment.id, {
      sync_status: 'synced',
      google_event_id: googleEventId,
      google_calendar_id: doctor.calendar_id,
    });

    return {
      success: true,
      appointmentId: appointment.id,
      googleEventId,
      action,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Error al sincronizar cita a Google:', error);
    
    // Actualizar estado de error
    await updateAppointmentSyncStatus(appointment.id, {
      sync_status: 'failed',
      sync_error: error instanceof Error ? error.message : 'Error desconocido',
    });

    return {
      success: false,
      appointmentId: appointment.id,
      error: error instanceof Error ? error.message : 'Error desconocido',
      action: 'skipped',
      timestamp: new Date(),
    };
  }
}

/**
 * Sincroniza un evento de Google Calendar hacia la base de datos
 * @description Crea una nueva cita en la base de datos basada en un evento de Google Calendar
 * @param {GoogleEvent} googleEvent - El evento de Google Calendar a sincronizar
 * @param {number} doctorId - ID del doctor al que pertenece el evento
 * @returns {Promise<SyncResult>} Resultado de la operación de sincronización
 * @throws {Error} Si hay errores al crear la cita en la base de datos
 * @example
 * ```typescript
 * const googleEvent = await getGoogleEvent('event_id_123');
 * const result = await syncGoogleEventToDatabase(googleEvent, 456);
 * if (result.success) {
 *   console.log(`Cita creada: ${result.appointmentId}`);
 * }
 * ```
 */
export async function syncGoogleEventToDatabase(
  googleEvent: GoogleEvent,
  doctorId: number
): Promise<SyncResult> {
  try {
    // Verificar si ya existe la cita
    const existingAppointment = await getAppointmentByGoogleEventId(googleEvent.id);
    
    if (existingAppointment) {
      // TODO: Implementar actualización de cita existente
      return {
        success: true,
        appointmentId: existingAppointment.id,
        googleEventId: googleEvent.id,
        action: 'skipped',
        timestamp: new Date(),
      };
    }

    // Extraer información del evento
    const startDateTime = new Date(googleEvent.start.dateTime);
    const endDateTime = new Date(googleEvent.end.dateTime);
    const duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));

    // Crear nueva cita
    const appointmentData: AppointmentWithCalendar = {
      doctorId,
      time: formatTimeFromDate(startDateTime),
      date: startDateTime,
      duration_minutes: duration,
      notes: googleEvent.description || 'Cita sincronizada desde Google Calendar',
      google_event_id: googleEvent.id,
      google_calendar_id: undefined,
      sync_status: 'synced' as const,
      last_sync_attempt: new Date(),
      sync_error: undefined,
      is_virtual: googleEvent.location?.toLowerCase().includes('virtual') || false,
      meeting_link: googleEvent.location?.toLowerCase().includes('virtual') ? googleEvent.location : undefined,
      patientId: undefined,
      serviceId: undefined
    };

    const createdAppointment = await createAppointmentWithCalendar(appointmentData);

    return {
      success: true,
      appointmentId: createdAppointment.id,
      googleEventId: googleEvent.id,
      action: 'created',
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Error al sincronizar evento de Google:', error);
    
    return {
      success: false,
      googleEventId: googleEvent.id,
      error: error instanceof Error ? error.message : 'Error desconocido',
      action: 'skipped',
      timestamp: new Date(),
    };
  }
}

/**
 * Elimina un evento de Google Calendar
 * @description Elimina un evento de Google Calendar y actualiza el estado de sincronización en la base de datos
 * @param {Appointment} appointment - La cita cuyo evento de Google Calendar se debe eliminar
 * @returns {Promise<SyncResult>} Resultado de la operación de eliminación
 * @throws {Error} Si hay errores al eliminar el evento de Google Calendar
 * @example
 * ```typescript
 * const appointment = await getAppointmentById(123);
 * const result = await deleteAppointmentFromGoogle(appointment);
 * if (result.success) {
 *   console.log(`Evento eliminado: ${result.googleEventId}`);
 * }
 * ```
 */
export async function deleteAppointmentFromGoogle(
  appointment: Appointment
): Promise<SyncResult> {
  try {
    if (!appointment.google_event_id || !appointment.google_calendar_id) {
      return {
        success: false,
        appointmentId: appointment.id,
        error: 'No hay información de Google Calendar para eliminar',
        action: 'skipped',
        timestamp: new Date(),
      };
    }

    // Eliminar evento de Google Calendar
    await deleteEvent(appointment.google_calendar_id, appointment.google_event_id);

    // Actualizar estado en la base de datos
    await updateAppointmentSyncStatus(appointment.id, {
      sync_status: 'not_synced',
      google_event_id: undefined,
      google_calendar_id: undefined,
    });

    return {
      success: true,
      appointmentId: appointment.id,
      googleEventId: appointment.google_event_id,
      action: 'deleted',
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Error al eliminar evento de Google:', error);
    
    return {
      success: false,
      appointmentId: appointment.id,
      error: error instanceof Error ? error.message : 'Error desconocido',
      action: 'skipped',
      timestamp: new Date(),
    };
  }
}

/**
 * Sincroniza todas las citas pendientes de un doctor
 * @description Obtiene todas las citas pendientes de sincronización de un doctor y las sincroniza con Google Calendar
 * @param {number} doctorId - ID del doctor cuyas citas pendientes se van a sincronizar
 * @returns {Promise<SyncResult[]>} Array de resultados de sincronización para cada cita procesada
 * @throws {Error} Si hay errores durante el proceso de sincronización
 * @example
 * ```typescript
 * const results = await syncDoctorPendingAppointments(123);
 * const successful = results.filter(r => r.success);
 * console.log(`${successful.length} citas sincronizadas exitosamente`);
 * ```
 */
export async function syncDoctorPendingAppointments(
  doctorId: number
): Promise<SyncResult[]> {
  try {
    const doctor = await getDoctorWithCalendar(doctorId);
    if (!doctor || !doctor.calendar_sync_enabled) {
      return [];
    }

    const pendingAppointments = await getPendingSyncAppointments();
    const doctorAppointments = pendingAppointments.filter(
      app => app.doctorId === doctorId
    );

    const results: SyncResult[] = [];
    
    for (const appointment of doctorAppointments) {
      const result = await syncAppointmentToGoogle(appointment);
      results.push(result);
      
      // Pequeña pausa entre sincronizaciones para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Actualizar timestamp de última sincronización
    await updateDoctorLastSync(doctorId);

    return results;
  } catch (error) {
    console.error('Error al sincronizar citas pendientes:', error);
    throw new Error('Error al sincronizar citas pendientes del doctor');
  }
}

/**
 * Sincroniza eventos de Google Calendar hacia la base de datos
 * @description Obtiene eventos de Google Calendar en un rango de fechas y los sincroniza con la base de datos
 * @param {number} doctorId - ID del doctor cuyo calendario se va a sincronizar
 * @param {Date} [startDate] - Fecha de inicio del rango de sincronización (opcional)
 * @param {Date} [endDate] - Fecha de fin del rango de sincronización (opcional)
 * @returns {Promise<SyncResult[]>} Array de resultados de sincronización para cada evento procesado
 * @throws {Error} Si hay errores al obtener eventos de Google Calendar o al crear citas
 * @example
 * ```typescript
 * const startDate = new Date('2024-01-01');
 * const endDate = new Date('2024-01-31');
 * const results = await syncGoogleCalendarToDatabase(123, startDate, endDate);
 * console.log(`${results.length} eventos procesados`);
 * ```
 */
export async function syncGoogleCalendarToDatabase(
  doctorId: number,
  startDate?: Date,
  endDate?: Date
): Promise<SyncResult[]> {
  try {
    const doctor = await getDoctorWithCalendar(doctorId);
    if (!doctor || !doctor.calendar_sync_enabled) {
      return [];
    }

    // Obtener eventos de Google Calendar
    const eventsResult = await getEvents(doctor.calendar_id, {
      timeMin: startDate?.toISOString(),
      timeMax: endDate?.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    if (!eventsResult.success || !eventsResult.data) {
      throw new Error(eventsResult.error || 'Failed to get Google Calendar events');
    }
    
    const googleEvents = eventsResult.data;

    const results: SyncResult[] = [];
    
    for (const event of googleEvents) {
      try {
        const validatedEvent = GoogleEventSchema.parse(event);
        const result = await syncGoogleEventToDatabase(validatedEvent, doctorId);
        results.push(result);
      } catch (validationError) {
        console.warn('Evento de Google Calendar inválido:', validationError);
        results.push({
          success: false,
          googleEventId: event.id ?? undefined,
          error: 'Formato de evento inválido',
          action: 'skipped',
          timestamp: new Date(),
        });
      }
      
      // Pequeña pausa entre sincronizaciones
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Actualizar timestamp de última sincronización
    await updateDoctorLastSync(doctorId);

    return results;
  } catch (error) {
    console.error('Error al sincronizar desde Google Calendar:', error);
    throw new Error('Error al sincronizar eventos desde Google Calendar');
  }
}

/**
 * Verifica conflictos de horarios antes de crear una cita
 * @description Verifica si existe algún conflicto de horarios en la base de datos local y en Google Calendar
 * @param {number} doctorId - ID del doctor para verificar conflictos
 * @param {Date} date - Fecha de la cita a verificar
 * @param {string} time - Hora de la cita en formato "HH:MM AM/PM"
 * @param {number} [duration=30] - Duración de la cita en minutos
 * @returns {Promise<{hasConflict: boolean, conflicts: Appointment[], suggestions?: string[]}>} Objeto con información sobre conflictos encontrados
 * @throws {Error} Si no se encuentra el doctor o hay errores al verificar disponibilidad
 * @example
 * ```typescript
 * const result = await checkAppointmentConflicts(123, new Date('2024-01-15'), '10:00 AM', 60);
 * if (result.hasConflict) {
 *   console.log(`Se encontraron ${result.conflicts.length} conflictos`);
 * }
 * ```
 */
export async function checkAppointmentConflicts(
  doctorId: number,
  date: Date,
  time: string,
  duration: number = 30
): Promise<{
  hasConflict: boolean;
  conflicts: Appointment[];
  suggestions?: string[];
}> {
  try {
    const doctor = await getDoctorWithCalendar(doctorId);
    if (!doctor) {
      throw new Error('Doctor no encontrado');
    }

    // Verificar conflictos en la base de datos local
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await getDoctorAppointmentsByDateRange(
      doctorId,
      startOfDay,
      endOfDay
    );

    const requestedDateTime = combineDateTime(date, time);
    const requestedEndTime = addMinutesToDateTime(requestedDateTime, duration);

    const conflicts = existingAppointments.filter(appointment => {
      const appointmentStart = combineDateTime(appointment.date, appointment.time);
      const appointmentEnd = addMinutesToDateTime(
        appointmentStart,
        appointment.duration_minutes || 30
      );

      return (
        (requestedDateTime >= appointmentStart && requestedDateTime < appointmentEnd) ||
        (requestedEndTime > appointmentStart && requestedEndTime <= appointmentEnd) ||
        (requestedDateTime <= appointmentStart && requestedEndTime >= appointmentEnd)
      );
    });

    // Si hay sincronización habilitada, verificar también en Google Calendar
    if (doctor.calendar_sync_enabled && conflicts.length === 0) {
      const isAvailable = await checkAvailability(
        doctor.calendar_id,
        requestedDateTime,
        requestedEndTime
      );
      
      if (!isAvailable) {
        return {
          hasConflict: true,
          conflicts: [],
          suggestions: ['Verificar disponibilidad en Google Calendar'],
        };
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  } catch (error) {
    console.error('Error al verificar conflictos:', error);
    throw new Error('Error al verificar conflictos de horarios');
  }
}

// --- Funciones auxiliares ---

/**
 * Combina fecha y hora en un string ISO
 * @description Combina un objeto Date y una cadena de tiempo en formato AM/PM para crear un string ISO
 * @param {Date} date - La fecha base
 * @param {string} time - La hora en formato "HH:MM AM/PM"
 * @returns {string} Fecha y hora combinadas en formato ISO string
 * @private
 * @example
 * ```typescript
 * const isoString = combineDateTime(new Date('2024-01-15'), '10:30 AM');
 * // Returns: '2024-01-15T10:30:00.000Z'
 * ```
 */
function combineDateTime(date: Date, time: string): string {
  const [timePart, period] = time.split(' ');
  const [hours, minutes] = timePart.split(':').map(Number);
  
  let hour24 = hours;
  if (period?.toLowerCase() === 'pm' && hours !== 12) {
    hour24 += 12;
  } else if (period?.toLowerCase() === 'am' && hours === 12) {
    hour24 = 0;
  }
  
  const combined = new Date(date);
  combined.setHours(hour24, minutes, 0, 0);
  
  return combined.toISOString();
}

/**
 * Agrega minutos a un datetime ISO string
 * @description Añade una cantidad específica de minutos a una fecha en formato ISO string
 * @param {string} dateTimeString - Fecha y hora en formato ISO string
 * @param {number} minutes - Número de minutos a agregar
 * @returns {string} Nueva fecha y hora en formato ISO string
 * @private
 * @example
 * ```typescript
 * const newDateTime = addMinutesToDateTime('2024-01-15T10:30:00.000Z', 30);
 * // Returns: '2024-01-15T11:00:00.000Z'
 * ```
 */
function addMinutesToDateTime(dateTimeString: string, minutes: number): string {
  const date = new Date(dateTimeString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

/**
 * Formatea la hora desde un objeto Date
 * @description Convierte un objeto Date a una cadena de tiempo en formato "HH:MM AM/PM"
 * @param {Date} date - El objeto Date del cual extraer la hora
 * @returns {string} Hora formateada en formato "HH:MM AM/PM"
 * @private
 * @example
 * ```typescript
 * const timeString = formatTimeFromDate(new Date('2024-01-15T14:30:00'));
 * // Returns: '02:30 PM'
 * ```
 */
function formatTimeFromDate(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  
  return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Reintenta sincronizaciones fallidas
 * @description Obtiene las citas con sincronización fallida y reintenta sincronizarlas con Google Calendar
 * @param {number} [limit=10] - Número máximo de citas a reintentar en esta ejecución
 * @returns {Promise<SyncResult[]>} Array de resultados de los reintentos de sincronización
 * @throws {Error} Si hay errores durante el proceso de reintento
 * @example
 * ```typescript
 * const results = await retryFailedSyncs(5);
 * const successful = results.filter(r => r.success);
 * console.log(`${successful.length} reintentos exitosos de ${results.length} total`);
 * ```
 */
export async function retryFailedSyncs(limit: number = 10): Promise<SyncResult[]> {
  try {
    const failedAppointments = await getFailedSyncAppointments();
    const appointmentsToRetry = failedAppointments.slice(0, limit);
    
    const results: SyncResult[] = [];
    
    for (const appointment of appointmentsToRetry) {
      // Resetear estado a pendiente
      await updateAppointmentSyncStatus(appointment.id, {
        sync_status: 'pending',
        sync_error: undefined,
      });
      
      // Intentar sincronizar nuevamente
      const result = await syncAppointmentToGoogle(appointment);
      results.push(result);
      
      // Pausa entre reintentos
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return results;
  } catch (error) {
    console.error('Error al reintentar sincronizaciones:', error);
    throw new Error('Error al reintentar sincronizaciones fallidas');
  }
}