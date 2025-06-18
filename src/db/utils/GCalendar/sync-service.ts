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

export const GoogleEventSchema = z.object({
  id: z.string(),
  summary: z.string(),
  description: z.string().optional(),
  start: z.object({
    dateTime: z.string(),
    timeZone: z.string().optional(),
  }),
  end: z.object({
    dateTime: z.string(),
    timeZone: z.string().optional(),
  }),
  location: z.string().optional(),
  attendees: z.array(z.object({
    email: z.string(),
    displayName: z.string().optional(),
  })).optional(),
});

export const SyncResultSchema = z.object({
  success: z.boolean(),
  appointmentId: z.number().optional(),
  googleEventId: z.string().optional(),
  error: z.string().optional(),
  action: z.enum(['created', 'updated', 'deleted', 'skipped']),
});

export type GoogleEvent = z.infer<typeof GoogleEventSchema>;
export type SyncResult = z.infer<typeof SyncResultSchema>;

// --- Funciones de sincronización ---

/**
 * Sincroniza una cita local hacia Google Calendar
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
    };
  }
}

/**
 * Sincroniza un evento de Google Calendar hacia la base de datos
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
      sync_status: 'synced',
      is_virtual: googleEvent.location?.toLowerCase().includes('virtual') || false,
    };

    const createdAppointment = await createAppointmentWithCalendar(appointmentData);

    return {
      success: true,
      appointmentId: createdAppointment.id,
      googleEventId: googleEvent.id,
      action: 'created',
    };
  } catch (error) {
    console.error('Error al sincronizar evento de Google:', error);
    
    return {
      success: false,
      googleEventId: googleEvent.id,
      error: error instanceof Error ? error.message : 'Error desconocido',
      action: 'skipped',
    };
  }
}

/**
 * Elimina un evento de Google Calendar
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
    };
  } catch (error) {
    console.error('Error al eliminar evento de Google:', error);
    
    return {
      success: false,
      appointmentId: appointment.id,
      error: error instanceof Error ? error.message : 'Error desconocido',
      action: 'skipped',
    };
  }
}

/**
 * Sincroniza todas las citas pendientes de un doctor
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
 */
function addMinutesToDateTime(dateTimeString: string, minutes: number): string {
  const date = new Date(dateTimeString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

/**
 * Formatea la hora desde un objeto Date
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