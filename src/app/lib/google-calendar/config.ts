/**
 * @fileoverview Configuración de Google Calendar API con Service Account
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-01-27
 * @description Configuración centralizada para Google Calendar API usando Service Account
 * para evitar OAuth y mantener control total sobre los calendarios de reservas.
 */

import { google } from 'googleapis';
import { z } from 'zod';

// === Esquemas de Validación ===

/**
 * Esquema para validar las variables de entorno de Google Calendar
 */
const GoogleCalendarEnvSchema = z.object({
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email('Email de service account inválido'),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().min(1, 'Private key es requerida'),
  GOOGLE_MAIN_CALENDAR_ID: z.string().optional().default('primary'),
  DEFAULT_TIMEZONE: z.string().optional().default('America/Mexico_City'),
});

/**
 * Configuración de Google Calendar validada
 */
export interface GoogleCalendarConfig {
  serviceAccountEmail: string;
  privateKey: string;
  mainCalendarId: string;
  defaultTimezone: string;
}

// === Validación de Variables de Entorno ===

/**
 * Valida y obtiene la configuración de Google Calendar desde variables de entorno
 */
function getGoogleCalendarConfig(): GoogleCalendarConfig {
  try {
    const env = GoogleCalendarEnvSchema.parse({
      GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      GOOGLE_MAIN_CALENDAR_ID: process.env.GOOGLE_MAIN_CALENDAR_ID,
      DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE,
    });

    return {
      serviceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      mainCalendarId: env.GOOGLE_MAIN_CALENDAR_ID,
      defaultTimezone: env.DEFAULT_TIMEZONE,
    };
  } catch (error) {
    console.error('[Google Calendar Config] Error validando variables de entorno:', error);
    throw new Error('Configuración de Google Calendar inválida. Revisa las variables de entorno.');
  }
}

// === Configuración de Autenticación ===

/**
 * Configuración de Google Calendar
 */
const config = getGoogleCalendarConfig();

/**
 * Cliente de autenticación de Google con Service Account
 */
export const googleAuth = new google.auth.GoogleAuth({
  credentials: {
    client_email: config.serviceAccountEmail,
    private_key: config.privateKey,
  },
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ],
});

/**
 * Cliente de Google Calendar API
 */
export const googleCalendarClient = google.calendar({
  version: 'v3',
  auth: googleAuth,
});

/**
 * Configuración exportada
 */
export const calendarConfig = {
  ...config,
  auth: googleAuth,
  client: googleCalendarClient,
};

/**
 * Verifica la conexión con Google Calendar API
 */
export async function verifyGoogleCalendarConnection(): Promise<boolean> {
  try {
    await googleCalendarClient.calendarList.list({
      maxResults: 1,
    });
    console.log('[Google Calendar] Conexión verificada exitosamente');
    return true;
  } catch (error) {
    console.error('[Google Calendar] Error verificando conexión:', error);
    return false;
  }
}

/**
 * Verifica la conexión con Google Calendar API (alias para verifyGoogleCalendarConnection)
 */
export const verifyConnection = verifyGoogleCalendarConnection;

/**
 * Obtiene información del service account
 */
export async function getServiceAccountInfo() {
  try {
    const auth = await googleAuth.getClient();
    return {
      email: config.serviceAccountEmail,
      connected: true,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
    };
  } catch (error) {
    console.error('[Google Calendar] Error obteniendo info del service account:', error);
    return {
      email: config.serviceAccountEmail,
      connected: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}