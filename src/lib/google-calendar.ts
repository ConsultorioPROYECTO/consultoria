// src/lib/google-calendar.ts

import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';
import { getServiceAccountCredentials, googleCalendarConfig } from './config/google-calendar-config';

/**
 * Configuración del cliente de Google Calendar
 * Utiliza una cuenta de servicio para autenticación
 */
export class GoogleCalendarService {
  public calendar: calendar_v3.Calendar; // Make calendar public for direct SDK access
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
   * Lista todos los calendarios accesibles por la cuenta de servicio.
   * @returns Una lista de calendarios.
   */
  public async listCalendars() {
    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items;
    } catch (error) {
      console.error('Error listing calendars:', error);
      throw error;
    }
  }

  /**
   * Obtiene los detalles de un calendario específico por su ID.
   * @param calendarId El ID del calendario.
   * @returns Los detalles del calendario.
   */
  public async getCalendar(calendarId: string) {
    try {
      const response = await this.calendar.calendars.get({ calendarId });
      return response.data;
    } catch (error) {
      console.error(`Error getting calendar ${calendarId}:`, error);
      throw error;
    }
  }
}

// Instancia singleton del servicio
export const googleCalendarService = new GoogleCalendarService();