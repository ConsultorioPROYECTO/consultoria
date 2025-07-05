// src/lib/google-calendar.ts

import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';
import { getServiceAccountCredentials, googleCalendarConfig } from './config/google-calendar-config';

/**
 * Configuración del cliente de Google Calendar
 * Utiliza una cuenta de servicio para autenticación
 */
export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;
  private auth: InstanceType<typeof google.auth.GoogleAuth>;

  constructor() {
    // Configurar autenticación con cuenta de servicio usando GoogleAuth
    const credentials = getServiceAccountCredentials();
    
    this.auth = new google.auth.GoogleAuth({
      credentials: credentials || undefined,
      keyFile: credentials ? undefined : googleCalendarConfig.serviceAccountKeyPath,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    // Inicializar el cliente de calendar con autenticación
    this.calendar = google.calendar({
      version: 'v3',
      auth: this.auth,
    });
  }

  /**
   * Crear un calendario para un doctor
   */
  async createDoctorCalendar(doctorData: {
    summary: string;
    description?: string;
    timezone?: string;
    color?: string;
  }) {
    console.log(`[GoogleCalendarService] Attempting to create calendar for: ${doctorData.summary}`);
    try {
      const calendarResource = {
        summary: doctorData.summary,
        description: doctorData.description || `Calendario de citas médicas`,
        timeZone: doctorData.timezone || 'America/Bogota',
      };

      console.debug('[GoogleCalendarService] Calendar resource:', calendarResource);

      const response = await this.calendar.calendars.insert({
        requestBody: calendarResource,
      });

      const calendarId = response.data.id;
      console.log(`[GoogleCalendarService] Successfully created calendar with ID: ${calendarId}`);

      // Configurar color del calendario si se proporciona
      if (doctorData.color && calendarId) {
        console.debug(`[GoogleCalendarService] Setting color for calendar ${calendarId}`);
        await this.calendar.colors.get(); // Obtener colores disponibles
        // Nota: Google Calendar tiene colores predefinidos, se puede mapear el color hex a un ID de color
      }

      return {
        calendarId,
        calendarData: response.data,
      };
    } catch (error) {
      console.error('[GoogleCalendarService] Error creating doctor calendar:', error);
      throw new Error(`Failed to create calendar: ${error}`);
    }
  }

  /**
   * Crear un evento de cita en el calendario
   */
  async createAppointmentEvent(eventData: {
    calendarId: string;
    summary: string;
    description?: string;
    startDateTime: string;
    endDateTime: string;
    timezone?: string;
    attendees?: string[];
    location?: string;
    meetingLink?: string;
    isBreakTime?: boolean;
    breakTimeType?: string;
  }) {
    console.log(`[GoogleCalendarService] Attempting to create event in calendar: ${eventData.calendarId}`);
    try {
      const event: calendar_v3.Schema$Event = {
        summary: eventData.summary,
        description: eventData.description,
        start: {
          dateTime: eventData.startDateTime,
          timeZone: eventData.timezone || 'America/Bogota',
        },
        end: {
          dateTime: eventData.endDateTime,
          timeZone: eventData.timezone || 'America/Bogota',
        },
        attendees: eventData.attendees?.map(email => ({ email })),
        location: eventData.location,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 día antes
            { method: 'popup', minutes: 30 }, // 30 minutos antes
          ],
        },
      };

      if (eventData.isBreakTime) {
        event.eventType = 'outOfOffice';
        event.extendedProperties = {
          private: {
            isBreakTime: 'true',
            breakTimeType: eventData.breakTimeType || 'general',
          },
        };
        event.transparency = 'opaque'; // Bloquear el tiempo en el calendario
      } else {
        // Lógica para eventos normales (citas)
        event.eventType = 'default';
      }

      console.debug('[GoogleCalendarService] Event data:', event);

      const insertParams = {
        calendarId: eventData.calendarId,
        requestBody: event,
      };

      const response = await this.calendar.events.insert(insertParams);
      console.log(`[GoogleCalendarService] Successfully created event with ID: ${response.data.id}`);

      return {
        eventId: response.data.id,
        eventData: response.data,
        meetingLink: eventData.meetingLink || null, // Devolvemos el meetingLink original si se proporcionó
      };
    } catch (error) {
      console.error('[GoogleCalendarService] Error creating appointment event:', error);
      throw new Error(`Failed to create event: ${error}`);
    }
  }

  /**
   * Actualizar un evento existente
   */
  async updateAppointmentEvent(
    calendarId: string,
    eventId: string,
    updateData: {
      summary?: string;
      description?: string;
      startDateTime?: string;
      endDateTime?: string;
      timezone?: string;
      attendees?: string[];
      location?: string;
    }
  ) {
    console.log(`[GoogleCalendarService] Attempting to update event ${eventId} in calendar: ${calendarId}`);
    try {
      // Primero obtener el evento actual
      console.debug(`[GoogleCalendarService] Fetching current event data for event ${eventId}`);
      const currentEvent = await this.calendar.events.get({
        calendarId,
        eventId,
      });

      const updatedEvent = {
        ...currentEvent.data,
        summary: updateData.summary || currentEvent.data.summary,
        description: updateData.description || currentEvent.data.description,
        start: updateData.startDateTime ? {
          dateTime: updateData.startDateTime,
          timeZone: updateData.timezone || 'America/Bogota',
        } : currentEvent.data.start,
        end: updateData.endDateTime ? {
          dateTime: updateData.endDateTime,
          timeZone: updateData.timezone || 'America/Bogota',
        } : currentEvent.data.end,
        attendees: updateData.attendees?.map(email => ({ email })) || currentEvent.data.attendees,
        location: updateData.location || currentEvent.data.location,
      };

      console.debug('[GoogleCalendarService] Updated event data:', updatedEvent);

      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: updatedEvent,
      });

      console.log(`[GoogleCalendarService] Successfully updated event ${eventId}`);

      return {
        eventId: response.data.id,
        eventData: response.data,
      };
    } catch (error) {
      console.error(`[GoogleCalendarService] Error updating appointment event ${eventId}:`, error);
      throw new Error(`Failed to update event: ${error}`);
    }
  }

  /**
   * Eliminar un evento
   */
  async deleteAppointmentEvent(calendarId: string, eventId: string) {
    console.log(`[GoogleCalendarService] Attempting to delete event ${eventId} from calendar: ${calendarId}`);
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      });

      console.log(`[GoogleCalendarService] Successfully deleted event ${eventId}`);
      return { success: true };
    } catch (error) {
      console.error(`[GoogleCalendarService] Error deleting appointment event ${eventId}:`, error);
      throw new Error(`Failed to delete event: ${error}`);
    }
  }

  /**
   * Obtener eventos de un calendario en un rango de fechas
   */
  async getCalendarEvents(
    calendarId: string,
    timeMin: string,
    timeMax: string
  ) {
    console.log(`[GoogleCalendarService] Fetching events for calendar ${calendarId} between ${timeMin} and ${timeMax}`);
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      console.debug(`[GoogleCalendarService] Found ${response.data.items?.length || 0} events`);
      return response.data.items || [];
    } catch (error) {
      console.error('[GoogleCalendarService] Error getting calendar events:', error);
      throw new Error(`Failed to get events: ${error}`);
    }
  }

  /**
   * Verificar disponibilidad en un calendario
   */
  async checkAvailability(
    calendarId: string,
    startDateTime: string,
    endDateTime: string
  ) {
    console.log(`[GoogleCalendarService] Checking availability for calendar ${calendarId} between ${startDateTime} and ${endDateTime}`);
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: startDateTime,
          timeMax: endDateTime,
          items: [{ id: calendarId }],
        },
      });

      const busyTimes = response.data.calendars?.[calendarId]?.busy || [];
      console.debug(`[GoogleCalendarService] Busy times found:`, busyTimes);
      return busyTimes.length === 0; // true si está disponible
    } catch (error) {
      console.error('[GoogleCalendarService] Error checking availability:', error);
      throw new Error(`Failed to check availability: ${error}`);
    }
  }

  /**
   * Convierte una fecha a la zona horaria específica y crea el inicio/fin del día
   * @param date - Fecha base
   * @param timezone - Zona horaria objetivo
   * @param isEndOfDay - Si es true, retorna el final del día (23:59:59)
   */
  private createDateInTimezone(date: Date, timezone: string, isEndOfDay: boolean = false): Date {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new Error('Could not determine the date parts in the specified timezone.');
    }

    const timeStr = isEndOfDay ? '23:59:59.999' : '00:00:00.000';
    
    // Construct a new date string in the target timezone and convert it to a Date object.
    // IMPORTANT: Appending 'Z' to the ISO-like string makes the JS engine parse it as UTC.
    // We are building the date in the target timezone and then getting the UTC representation.
    const dateInTimezoneStr = `${year}-${month}-${day}T${timeStr}`;
    
    // To correctly convert this local time string to a UTC Date object, we need to know the offset.
    // A trick is to get the difference between UTC time and the time in the target timezone.
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const offset = (tzDate.getTime() - utcDate.getTime());

    const localDate = new Date(dateInTimezoneStr);
    
    return new Date(localDate.getTime() - offset);
  }

  /**
   * Obtener todos los bloques de tiempo ocupados para un calendario en un día específico.
   * @param calendarId - ID del calendario de Google
   * @param date - Fecha para consultar (en la zona horaria local del doctor)
   * @param timezone - Zona horaria del doctor (ej: 'America/Bogota')
   */
  async getBusySlotsForDay(calendarId: string, date: Date, timezone: string = 'America/Bogota') {
    console.log(`[GoogleCalendarService] Getting busy slots for calendar ${calendarId} on date: ${date.toISOString()}`);
    try {
      const timeMin = this.createDateInTimezone(date, timezone, false).toISOString();
      const timeMax = this.createDateInTimezone(date, timezone, true).toISOString();

      console.debug(`[GoogleCalendarService] Querying free/busy between ${timeMin} and ${timeMax} in timezone ${timezone}`);

      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin,
          timeMax,
          timeZone: timezone,
          items: [{ id: calendarId }],
        },
      });

      const busySlots = response.data.calendars?.[calendarId]?.busy || [];
      console.debug(`[GoogleCalendarService] Busy slots found:`, busySlots);
      return busySlots;
    } catch (error) {
      console.error('[GoogleCalendarService] Error getting busy slots for day:', error);
      throw new Error(`Failed to get busy slots for day: ${error}`);
    }
  }
}

// Instancia singleton del servicio
export const googleCalendarService = new GoogleCalendarService();