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
    try {
      const calendarResource = {
        summary: doctorData.summary,
        description: doctorData.description || `Calendario de citas médicas`,
        timeZone: doctorData.timezone || 'America/Bogota',
      };

      const response = await this.calendar.calendars.insert({
        requestBody: calendarResource,
      });

      const calendarId = response.data.id;

      // Configurar color del calendario si se proporciona
      if (doctorData.color && calendarId) {
        await this.calendar.colors.get(); // Obtener colores disponibles
        // Nota: Google Calendar tiene colores predefinidos, se puede mapear el color hex a un ID de color
      }

      return {
        calendarId,
        calendarData: response.data,
      };
    } catch (error) {
      console.error('Error creating doctor calendar:', error);
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
  }) {
    try {
      const event = {
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
        // Eliminamos la lógica de conferencias para evitar errores
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 día antes
            { method: 'popup', minutes: 30 }, // 30 minutos antes
          ],
        },
      };

      const insertParams = {
        calendarId: eventData.calendarId,
        requestBody: event,
      };

      const response = await this.calendar.events.insert(insertParams);

      return {
        eventId: response.data.id,
        eventData: response.data,
        meetingLink: eventData.meetingLink || null, // Devolvemos el meetingLink original si se proporcionó
      };
    } catch (error) {
      console.error('Error creating appointment event:', error);
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
    try {
      // Primero obtener el evento actual
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

      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: updatedEvent,
      });

      return {
        eventId: response.data.id,
        eventData: response.data,
      };
    } catch (error) {
      console.error('Error updating appointment event:', error);
      throw new Error(`Failed to update event: ${error}`);
    }
  }

  /**
   * Eliminar un evento
   */
  async deleteAppointmentEvent(calendarId: string, eventId: string) {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting appointment event:', error);
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
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error getting calendar events:', error);
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
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: startDateTime,
          timeMax: endDateTime,
          items: [{ id: calendarId }],
        },
      });

      const busyTimes = response.data.calendars?.[calendarId]?.busy || [];
      return busyTimes.length === 0; // true si está disponible
    } catch (error) {
      console.error('Error checking availability:', error);
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
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = isEndOfDay ? '23:59:59' : '00:00:00';
    
    // Crear la fecha en la zona horaria específica
    // Usamos el constructor de Date que interpreta la fecha como local
    const localDate = new Date(`${dateStr}T${timeStr}`);
    
    // Obtener el offset de la zona horaria del doctor
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(localDate);
    const formattedDate = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}T${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}:${parts.find(p => p.type === 'second')?.value}`;
    
    return new Date(formattedDate);
  }

  /**
   * Obtener todos los bloques de tiempo ocupados para un calendario en un día específico.
   * @param calendarId - ID del calendario de Google
   * @param date - Fecha para consultar (en la zona horaria local del doctor)
   * @param timezone - Zona horaria del doctor (ej: 'America/Bogota')
   */
  async getBusySlotsForDay(calendarId: string, date: Date, timezone: string = 'America/Bogota') {
    try {
      // Crear fechas en la zona horaria específica del doctor
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Crear inicio y fin del día en la zona horaria del doctor usando una aproximación más precisa
      const timeMin = this.createDateInTimezone(date, timezone, false);
      const timeMax = this.createDateInTimezone(date, timezone, true);
      
      const timeMinISO = timeMin.toISOString();
      const timeMaxISO = timeMax.toISOString();
      
      console.log('=== DEBUG GOOGLE CALENDAR QUERY ===');
      console.log('Calendar ID:', calendarId);
      console.log('Date input:', date);
      console.log('Timezone:', timezone);
      console.log('Date string:', dateStr);
      console.log('TimeMin (timezone adjusted):', timeMin);
      console.log('TimeMax (timezone adjusted):', timeMax);
      console.log('TimeMin ISO:', timeMinISO);
      console.log('TimeMax ISO:', timeMaxISO);

      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: timeMinISO,
          timeMax: timeMaxISO,
          timeZone: timezone, // Especificar la zona horaria en la consulta
          items: [{ id: calendarId }],
        },
      });

      const busyTimes = response.data.calendars?.[calendarId]?.busy || [];
      
      console.log('Google Calendar busy times response:', JSON.stringify(busyTimes, null, 2));
      
      return busyTimes; // Devuelve [{ start: '...', end: '...' }, ...]

    } catch (error) {
      console.error('Error getting busy slots:', error);
      throw new Error(`Failed to get busy slots: ${error}`);
    }
  }
}

// Instancia singleton del servicio
export const googleCalendarService = new GoogleCalendarService();