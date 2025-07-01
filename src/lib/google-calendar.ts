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
   * Obtener todos los bloques de tiempo ocupados para un calendario en un día específico.
   */
  async getBusySlotsForDay(calendarId: string, date: Date) {
    try {
      // Establecer el inicio y el fin del día que queremos consultar
      const timeMin = new Date(date);
      timeMin.setHours(0, 0, 0, 0); // Inicio del día (medianoche)

      const timeMax = new Date(date);
      timeMax.setHours(23, 59, 59, 999); // Fin del día

      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: [{ id: calendarId }],
        },
      });

      const busyTimes = response.data.calendars?.[calendarId]?.busy || [];
      return busyTimes; // Devuelve [{ start: '...', end: '...' }, ...]

    } catch (error) {
      console.error('Error getting busy slots:', error);
      throw new Error(`Failed to get busy slots: ${error}`);
    }
  }
}

// Instancia singleton del servicio
export const googleCalendarService = new GoogleCalendarService();