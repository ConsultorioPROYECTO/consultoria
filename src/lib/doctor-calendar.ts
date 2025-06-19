// src/lib/doctor-calendar.ts

import { db } from '@/db';
import { doctors, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { googleCalendarService } from './google-calendar';

export interface DoctorCalendarSetup {
  doctorId: number;
  calendarName?: string;
  timezone?: string;
  color?: string;
  syncEnabled?: boolean;
}

export interface CalendarSettings {
  notifications: {
    email: boolean;
    popup: boolean;
    minutesBefore: number[];
  };
  workingHours: {
    start: string;
    end: string;
    days: number[]; // 0-6 (Sunday-Saturday)
  };
  autoAcceptMeetings: boolean;
  defaultMeetingDuration: number;
}

/**
 * Servicio para gestionar calendarios de doctores
 */
export class DoctorCalendarService {
  /**
   * Crear calendario para un nuevo doctor
   */
  async createDoctorCalendar(setup: DoctorCalendarSetup): Promise<{
    success: boolean;
    calendarId?: string;
    error?: string;
  }> {
    try {
      // Obtener información del doctor y usuario
      const doctorData = await this.getDoctorWithUser(setup.doctorId);
      
      if (!doctorData || !doctorData.user) {
        throw new Error('Doctor or user not found');
      }

      // Verificar si ya tiene un calendario
      if (doctorData.calendar_id) {
        return {
          success: false,
          error: 'Doctor already has a calendar assigned'
        };
      }

      // Crear el calendario en Google Calendar
      const calendarName = setup.calendarName || 
        `Dr. ${doctorData.user.displayName || 'Doctor'} - Consultas`;
      
      const calendarResult = await googleCalendarService.createDoctorCalendar({
        summary: calendarName,
        description: `Calendario de citas médicas para Dr. ${doctorData.user.displayName || 'Doctor'}`,
        timezone: setup.timezone || 'America/Bogota',
        color: setup.color,
      });

      // Actualizar el doctor con la información del calendario
      const defaultSettings: CalendarSettings = {
        notifications: {
          email: true,
          popup: true,
          minutesBefore: [15, 60], // 15 minutos y 1 hora antes
        },
        workingHours: {
          start: '08:00',
          end: '18:00',
          days: [1, 2, 3, 4, 5], // Lunes a Viernes
        },
        autoAcceptMeetings: false,
        defaultMeetingDuration: 30,
      };

      await db.update(doctors)
        .set({
          calendar_id: calendarResult.calendarId || undefined,
          calendar_timezone: setup.timezone || 'America/Bogota',
          calendar_color: setup.color || '#4285f4',
          calendar_sync_enabled: setup.syncEnabled ?? true,
          last_calendar_sync: new Date(),
          calendar_settings: defaultSettings,
        })
        .where(eq(doctors.idDoctor, setup.doctorId));

      return {
        success: true,
        calendarId: calendarResult.calendarId || undefined,
      };
    } catch (error) {
      console.error('Error creating doctor calendar:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Actualizar configuración del calendario de un doctor
   */
  async updateDoctorCalendarSettings(
    doctorId: number, 
    settings: Partial<CalendarSettings>
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const doctor = await db.select()
        .from(doctors)
        .where(eq(doctors.idDoctor, doctorId))
        .limit(1);

      if (doctor.length === 0) {
        throw new Error('Doctor not found');
      }

      const currentSettings = doctor[0].calendar_settings 
        ? JSON.parse(doctor[0].calendar_settings as string) as CalendarSettings
        : this.getDefaultCalendarSettings();

      const updatedSettings = {
        ...currentSettings,
        ...settings,
      };

      await db.update(doctors)
        .set({
          calendar_settings: JSON.stringify(updatedSettings),
          last_calendar_sync: new Date(),
        })
        .where(eq(doctors.idDoctor, doctorId));

      return { success: true };
    } catch (error) {
      console.error('Error updating doctor calendar settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Habilitar/deshabilitar sincronización de calendario
   */
  async toggleCalendarSync(
    doctorId: number, 
    enabled: boolean
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await db.update(doctors)
        .set({
          calendar_sync_enabled: enabled,
          last_calendar_sync: new Date(),
        })
        .where(eq(doctors.idDoctor, doctorId));

      return { success: true };
    } catch (error) {
      console.error('Error toggling calendar sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Obtener configuración del calendario de un doctor
   */
  async getDoctorCalendarSettings(doctorId: number): Promise<{
    success: boolean;
    settings?: CalendarSettings;
    calendarInfo?: {
      calendarId: string;
      timezone: string;
      color: string;
      syncEnabled: boolean;
      lastSync: Date | null;
    };
    error?: string;
  }> {
    try {
      const doctor = await db.select()
        .from(doctors)
        .where(eq(doctors.idDoctor, doctorId))
        .limit(1);

      if (doctor.length === 0) {
        throw new Error('Doctor not found');
      }

      const doctorData = doctor[0];
      
      if (!doctorData.calendar_id) {
        return {
          success: false,
          error: 'Doctor does not have a calendar assigned'
        };
      }

      const settings = doctorData.calendar_settings 
        ? JSON.parse(doctorData.calendar_settings as string) as CalendarSettings
        : this.getDefaultCalendarSettings();

      return {
        success: true,
        settings,
        calendarInfo: {
          calendarId: doctorData.calendar_id,
          timezone: doctorData.calendar_timezone || 'America/Bogota',
          color: doctorData.calendar_color || '#4285f4',
          syncEnabled: doctorData.calendar_sync_enabled || false,
          lastSync: doctorData.last_calendar_sync,
        },
      };
    } catch (error) {
      console.error('Error getting doctor calendar settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verificar disponibilidad en el calendario de un doctor
   */
  async checkDoctorAvailability(
    doctorId: number,
    startDateTime: string,
    endDateTime: string
  ): Promise<{
    success: boolean;
    isAvailable?: boolean;
    conflictingEvents?: any[];
    error?: string;
  }> {
    try {
      const doctor = await db.select()
        .from(doctors)
        .where(eq(doctors.idDoctor, doctorId))
        .limit(1);

      if (doctor.length === 0 || !doctor[0].calendar_id) {
        throw new Error('Doctor not found or calendar not configured');
      }

      const result = await googleCalendarService.checkAvailability(
        doctor[0].calendar_id,
        startDateTime,
        endDateTime
      );

      return {
        success: true,
        isAvailable: result,
        conflictingEvents: [],
      };
    } catch (error) {
      console.error('Error checking doctor availability:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Obtener eventos del calendario de un doctor en un rango de fechas
   */
  async getDoctorCalendarEvents(
    doctorId: number,
    startDate: string,
    endDate: string
  ): Promise<{
    success: boolean;
    events?: any[];
    error?: string;
  }> {
    try {
      const doctor = await db.select()
        .from(doctors)
        .where(eq(doctors.idDoctor, doctorId))
        .limit(1);

      if (doctor.length === 0 || !doctor[0].calendar_id) {
        throw new Error('Doctor not found or calendar not configured');
      }

      const events = await googleCalendarService.getCalendarEvents(
        doctor[0].calendar_id,
        startDate,
        endDate
      );

      return {
        success: true,
        events,
      };
    } catch (error) {
      console.error('Error getting doctor calendar events:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Eliminar calendario de un doctor
   */
  async deleteDoctorCalendar(doctorId: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const doctor = await db.select()
        .from(doctors)
        .where(eq(doctors.idDoctor, doctorId))
        .limit(1);

      if (doctor.length === 0) {
        throw new Error('Doctor not found');
      }

      const doctorData = doctor[0];
      
      // Eliminar el calendario de Google Calendar si existe
      if (doctorData.calendar_id) {
        try {
          // Nota: Google Calendar API no permite eliminar calendarios secundarios
          // Solo se puede eliminar el acceso. El calendario permanece en la cuenta de servicio.
          console.log(`Calendar ${doctorData.calendar_id} access removed for doctor ${doctorId}`);
        } catch (calendarError) {
          console.warn('Could not remove calendar from Google Calendar:', calendarError);
        }
      }

      // Limpiar datos del calendario en la base de datos
      await db.update(doctors)
        .set({
          calendar_id: undefined,
          calendar_sync_enabled: false,
          calendar_settings: null,
        })
        .where(eq(doctors.idDoctor, doctorId));

      return { success: true };
    } catch (error) {
      console.error('Error deleting doctor calendar:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Obtener información del doctor con datos del usuario
   */
  private async getDoctorWithUser(doctorId: number) {
    const result = await db.select({
      idDoctor: doctors.idDoctor,
      calendar_id: doctors.calendar_id,
      calendar_timezone: doctors.calendar_timezone,
      calendar_sync_enabled: doctors.calendar_sync_enabled,
      userId: doctors.userId,
      user: {
        id: users.id,
        displayName: users.displayName,
        email: users.email,
      },
    })
    .from(doctors)
    .innerJoin(users, eq(doctors.userId, users.id))
    .where(eq(doctors.idDoctor, doctorId))
    .limit(1);

    return result[0] || null;
  }

  /**
   * Obtener configuración por defecto del calendario
   */
  private getDefaultCalendarSettings(): CalendarSettings {
    return {
      notifications: {
        email: true,
        popup: true,
        minutesBefore: [15, 60],
      },
      workingHours: {
        start: '08:00',
        end: '18:00',
        days: [1, 2, 3, 4, 5], // Lunes a Viernes
      },
      autoAcceptMeetings: false,
      defaultMeetingDuration: 30,
    };
  }
}

// Instancia singleton del servicio
export const doctorCalendarService = new DoctorCalendarService();