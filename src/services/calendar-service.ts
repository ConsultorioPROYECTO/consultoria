/**
 * @fileoverview Servicio unificado para manejo de calendario y sincronización
 * @description Integra las funciones de Google Calendar con la sincronización de base de datos
 * @author Santiago Prada
 * @version 1.0.0
 * @since 2025/01/27
 */

import {
  createAppointment as createGoogleAppointment,
  updateAppointment as updateGoogleAppointment,
  deleteAppointment as deleteGoogleAppointment,
  getEvents as getGoogleEvents,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
  type CalendarOperationResult
} from '@/app/lib/google-calendar';

import {
  syncAppointmentToGoogle,
  syncGoogleCalendarToDatabase,
  deleteAppointmentFromGoogle,
  type SyncResult
} from '@/db/utils/GCalendar/sync-service';

import {
  getDoctorWithCalendar,
  createAppointmentWithCalendar,
  updateAppointmentSyncStatus,
  getAppointmentByGoogleEventId,
  type AppointmentWithCalendar
} from '@/db/utils/GCalendar/calendar-db-utils';

import { type Appointment } from '@/db/schema/appointments';

/**
 * Interfaz para datos de cita extendidos
 */
export interface ExtendedAppointmentData extends CreateAppointmentInput {
  doctorId?: number;
  patientId?: number;
  serviceId?: number;
  isVirtual?: boolean;
  meetingLink?: string;
}

/**
 * Interfaz para actualizaciones de cita extendidas
 */
export interface ExtendedUpdateData extends UpdateAppointmentInput {
  appointmentId?: number;
}

/**
 * Resultado de operaciones del servicio de calendario
 */
export interface CalendarServiceResult {
  success: boolean;
  googleEvent?: any;
  dbAppointment?: Appointment;
  syncResult?: SyncResult;
  error?: string;
}

/**
 * Servicio unificado de calendario
 */
export class CalendarService {
  /**
   * Crea una nueva cita en Google Calendar y opcionalmente en la base de datos
   */
  async createAppointment(
    calendarId: string,
    appointmentData: ExtendedAppointmentData
  ): Promise<CalendarServiceResult> {
    try {
      // Crear evento en Google Calendar
      const googleResult = await createGoogleAppointment(calendarId, appointmentData);
      
      if (!googleResult.success) {
        return {
          success: false,
          error: googleResult.error || 'Failed to create appointment in Google Calendar'
        };
      }

      let dbAppointment: Appointment | null = null;
      let syncResult: SyncResult | null = null;

      // Si se proporciona doctorId, crear también en la base de datos
      if (appointmentData.doctorId) {
        try {
          // Calcular duración desde startDateTime y endDateTime
          const startDate = new Date(appointmentData.startDateTime);
          const endDate = new Date(appointmentData.endDateTime);
          const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
          
          // Formatear hora desde startDateTime
          const timeString = startDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });

          const dbData: AppointmentWithCalendar = {
            doctorId: appointmentData.doctorId,
            time: timeString,
            date: startDate,
            duration_minutes: durationMinutes || 30,
            notes: appointmentData.notes || appointmentData.reasonForVisit,
            google_event_id: googleResult.data?.eventId,
            google_calendar_id: calendarId,
            sync_status: 'synced' as const,
            last_sync_attempt: new Date(),
            sync_error: undefined,
            is_virtual: appointmentData.isTelemedicine || false,
            meeting_link: appointmentData.meetingLink,
            patientId: appointmentData.patientId,
            serviceId: appointmentData.serviceId
          };

          dbAppointment = await createAppointmentWithCalendar(dbData);
          
          syncResult = {
            success: true,
            appointmentId: dbAppointment.id,
            googleEventId: googleResult.data?.eventId,
            action: 'created',
            timestamp: new Date()
          };
        } catch (dbError) {
          console.error('Error creating appointment in database:', dbError);
          // No fallar toda la operación si solo falla la BD
        }
      }

      return {
        success: true,
        googleEvent: googleResult.data,
        dbAppointment: dbAppointment || undefined,
        syncResult: syncResult || undefined
      };
    } catch (error) {
      console.error('Error in createAppointment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Actualiza una cita existente
   */
  async updateAppointment(
    calendarId: string,
    eventId: string,
    updates: ExtendedUpdateData
  ): Promise<CalendarServiceResult> {
    try {
      // Actualizar en Google Calendar
      const googleResult = await updateGoogleAppointment(calendarId, eventId, updates);
      
      if (!googleResult.success) {
        return {
          success: false,
          error: googleResult.error || 'Failed to update appointment in Google Calendar'
        };
      }

      let syncResult: SyncResult | null = null;

      // Si hay appointmentId, actualizar también en la base de datos
      if (updates.appointmentId) {
        try {
          await updateAppointmentSyncStatus(updates.appointmentId, {
            sync_status: 'synced',
            google_event_id: eventId,
            google_calendar_id: calendarId
          });

          syncResult = {
            success: true,
            appointmentId: updates.appointmentId,
            googleEventId: eventId,
            action: 'updated',
            timestamp: new Date()
          };
        } catch (dbError) {
          console.error('Error updating appointment in database:', dbError);
        }
      }

      return {
        success: true,
        googleEvent: googleResult.data,
        syncResult: syncResult || undefined
      };
    } catch (error) {
      console.error('Error in updateAppointment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Elimina una cita
   */
  async deleteAppointment(
    calendarId: string,
    eventId: string,
    appointmentId?: number
  ): Promise<CalendarServiceResult> {
    try {
      // Eliminar de Google Calendar
      const googleResult = await deleteGoogleAppointment(calendarId, eventId);
      
      if (!googleResult.success) {
        return {
          success: false,
          error: googleResult.error || 'Failed to delete appointment from Google Calendar'
        };
      }

      let syncResult: SyncResult | null = null;

      // Si hay appointmentId, actualizar estado en la base de datos
      if (appointmentId) {
        try {
          await updateAppointmentSyncStatus(appointmentId, {
            sync_status: 'not_synced',
            google_event_id: undefined,
            google_calendar_id: undefined
          });

          syncResult = {
            success: true,
            appointmentId,
            googleEventId: eventId,
            action: 'deleted',
            timestamp: new Date()
          };
        } catch (dbError) {
          console.error('Error updating appointment status in database:', dbError);
        }
      }

      return {
        success: true,
        syncResult: syncResult || undefined
      };
    } catch (error) {
      console.error('Error in deleteAppointment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Obtiene eventos del calendario (equivalente a getConsultorioEvents)
   */
  async getConsultorioEvents(
    calendarId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<CalendarServiceResult> {
    try {
      const googleResult = await getGoogleEvents(calendarId, {
        timeMin: dateRange.start.toISOString(),
        timeMax: dateRange.end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      if (!googleResult.success) {
        return {
          success: false,
          error: googleResult.error || 'Failed to get events from Google Calendar'
        };
      }

      return {
        success: true,
        googleEvent: googleResult.data || []
      };
    } catch (error) {
      console.error('Error in getConsultorioEvents:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sincroniza una cita de la base de datos hacia Google Calendar
   */
  async syncToGoogle(appointment: Appointment): Promise<SyncResult> {
    return await syncAppointmentToGoogle(appointment);
  }

  /**
   * Sincroniza eventos de Google Calendar hacia la base de datos
   */
  async syncFromGoogle(
    doctorId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<SyncResult[]> {
    return await syncGoogleCalendarToDatabase(doctorId, startDate, endDate);
  }

  /**
   * Elimina una cita de Google Calendar usando datos de la base de datos
   */
  async deleteFromGoogle(appointment: Appointment): Promise<SyncResult> {
    return await deleteAppointmentFromGoogle(appointment);
  }
}

// Instancia singleton del servicio
export const calendarService = new CalendarService();

// Exportación por defecto
export default calendarService;