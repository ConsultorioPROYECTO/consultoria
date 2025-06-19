// src/lib/hooks/calendar-hooks.ts

import { doctorCalendarService } from '../doctor-calendar';
import { appointmentSyncService } from '../appointment-sync';

/**
 * Hook que se ejecuta cuando se crea un nuevo doctor
 * Crea automáticamente un calendario en Google Calendar
 */
export async function onDoctorCreated(doctorId: number, doctorData: {
  firstName: string;
  lastName: string;
  email?: string;
  timezone?: string;
}): Promise<{
  success: boolean;
  calendarId?: string;
  error?: string;
}> {
  try {
    console.log(`Creating calendar for new doctor: ${doctorId}`);
    
    const result = await doctorCalendarService.createDoctorCalendar({
      doctorId,
      calendarName: `Dr. ${doctorData.firstName} ${doctorData.lastName} - Consultas`,
      timezone: doctorData.timezone || 'America/Bogota',
      syncEnabled: true,
    });

    if (result.success) {
      console.log(`Calendar created successfully for doctor ${doctorId}: ${result.calendarId}`);
    } else {
      console.error(`Failed to create calendar for doctor ${doctorId}: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.error('Error in onDoctorCreated hook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Hook que se ejecuta cuando se crea una nueva cita
 * Sincroniza automáticamente la cita con Google Calendar
 */
export async function onAppointmentCreated(appointmentId: number): Promise<{
  success: boolean;
  googleEventId?: string;
  error?: string;
}> {
  try {
    console.log(`Syncing new appointment to calendar: ${appointmentId}`);
    
    const result = await appointmentSyncService.syncAppointmentToCalendar(appointmentId);

    if (result.success) {
      console.log(`Appointment ${appointmentId} synced successfully: ${result.googleEventId}`);
    } else {
      console.error(`Failed to sync appointment ${appointmentId}: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.error('Error in onAppointmentCreated hook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Hook que se ejecuta cuando se actualiza una cita
 * Actualiza el evento correspondiente en Google Calendar
 */
export async function onAppointmentUpdated(appointmentId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log(`Updating appointment in calendar: ${appointmentId}`);
    
    const result = await appointmentSyncService.updateAppointmentInCalendar(appointmentId);

    if (result.success) {
      console.log(`Appointment ${appointmentId} updated successfully in calendar`);
    } else {
      console.error(`Failed to update appointment ${appointmentId}: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.error('Error in onAppointmentUpdated hook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Hook que se ejecuta cuando se cancela o elimina una cita
 * Elimina el evento correspondiente de Google Calendar
 */
export async function onAppointmentDeleted(appointmentId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log(`Deleting appointment from calendar: ${appointmentId}`);
    
    const result = await appointmentSyncService.deleteAppointmentFromCalendar(appointmentId);

    if (result.success) {
      console.log(`Appointment ${appointmentId} deleted successfully from calendar`);
    } else {
      console.error(`Failed to delete appointment ${appointmentId}: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.error('Error in onAppointmentDeleted hook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Hook que se ejecuta cuando se habilita la sincronización de calendario para un doctor
 * Sincroniza todas las citas pendientes del doctor
 */
export async function onCalendarSyncEnabled(doctorId: number): Promise<{
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}> {
  try {
    console.log(`Calendar sync enabled for doctor ${doctorId}, syncing pending appointments`);
    
    const result = await appointmentSyncService.syncDoctorPendingAppointments(doctorId);

    console.log(`Sync completed for doctor ${doctorId}: ${result.syncedCount} synced, ${result.failedCount} failed`);
    
    if (result.errors.length > 0) {
      console.error('Sync errors:', result.errors);
    }

    return result;
  } catch (error) {
    console.error('Error in onCalendarSyncEnabled hook:', error);
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Utilidad para verificar si un doctor tiene calendario configurado
 */
export async function isDoctorCalendarConfigured(doctorId: number): Promise<boolean> {
  try {
    const result = await doctorCalendarService.getDoctorCalendarSettings(doctorId);
    return result.success && !!result.calendarInfo?.calendarId;
  } catch (error) {
    console.error('Error checking doctor calendar configuration:', error);
    return false;
  }
}

/**
 * Utilidad para verificar si la sincronización está habilitada para un doctor
 */
export async function isDoctorSyncEnabled(doctorId: number): Promise<boolean> {
  try {
    const result = await doctorCalendarService.getDoctorCalendarSettings(doctorId);
    return result.success && !!result.calendarInfo?.syncEnabled;
  } catch (error) {
    console.error('Error checking doctor sync status:', error);
    return false;
  }
}

/**
 * Utilidad para obtener estadísticas de sincronización de un doctor
 */
export async function getDoctorSyncStats(doctorId: number): Promise<{
  success: boolean;
  stats?: {
    totalAppointments: number;
    syncedAppointments: number;
    pendingAppointments: number;
    failedAppointments: number;
    lastSyncDate: Date | null;
  };
  error?: string;
}> {
  try {
    // Esta función requeriría consultas adicionales a la base de datos
    // para obtener estadísticas detalladas de sincronización
    // Por ahora, retornamos un placeholder
    
    return {
      success: true,
      stats: {
        totalAppointments: 0,
        syncedAppointments: 0,
        pendingAppointments: 0,
        failedAppointments: 0,
        lastSyncDate: null,
      },
    };
  } catch (error) {
    console.error('Error getting doctor sync stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}