// src/lib/config/google-calendar-config.ts

import { z } from 'zod';

/**
 * Configuración para Google Calendar API
 */
export const googleCalendarConfig = {
  // Ruta al archivo de credenciales de la cuenta de servicio
  serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || '',
  
  // Contenido del archivo de credenciales como JSON string (alternativa)
  serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',

  // Credenciales divididas en variables de entorno (alternativa recomendada)
  split: {
    projectId: process.env.GOOGLE_CALENDAR_PROJECT_ID || process.env.GOOGLE_PROJECT_ID || '',
    clientEmail: process.env.GOOGLE_CALENDAR_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || '',
    privateKey: process.env.GOOGLE_CALENDAR_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || '',
    privateKeyId: process.env.GOOGLE_CALENDAR_PRIVATE_KEY_ID || process.env.GOOGLE_PRIVATE_KEY_ID || '',
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
    authUri: process.env.GOOGLE_CALENDAR_AUTH_URI || process.env.GOOGLE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    tokenUri: process.env.GOOGLE_CALENDAR_TOKEN_URI || process.env.GOOGLE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    authProviderX509CertUrl: process.env.GOOGLE_CALENDAR_AUTH_PROVIDER_X509_CERT_URL || process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    clientX509CertUrl: process.env.GOOGLE_CALENDAR_CLIENT_X509_CERT_URL || process.env.GOOGLE_CLIENT_X509_CERT_URL || '',
    universeDomain: process.env.GOOGLE_CALENDAR_UNIVERSE_DOMAIN || process.env.GOOGLE_UNIVERSE_DOMAIN || 'googleapis.com',
  },
  
  // Scopes necesarios para Google Calendar
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ],
  
  // Configuración por defecto para calendarios
  defaultCalendarSettings: {
    timezone: 'America/Bogota',
    color: '#4285f4', // Azul de Google
    location: 'Colombia',
  },
  
  // Configuración de eventos
  defaultEventSettings: {
    sendNotifications: true,
    sendUpdates: 'all', // 'all', 'externalOnly', 'none'
    visibility: 'private', // 'default', 'public', 'private', 'confidential'
  },
  
  // Configuración de recordatorios por defecto
  defaultReminders: [
    {
      method: 'email',
      minutes: 60, // 1 hora antes
    },
    {
      method: 'popup',
      minutes: 15, // 15 minutos antes
    },
  ],
  
  // Límites de la API
  apiLimits: {
    maxEventsPerRequest: 250,
    maxCalendarsPerRequest: 250,
    requestsPerSecond: 10,
  },
};

// === Validation Schemas ===
const ServiceAccountJsonSchema = z.object({
  type: z.literal('service_account'),
  project_id: z.string().min(1),
  private_key_id: z.string().optional(),
  private_key: z.string().min(1),
  client_email: z.string().email(),
  client_id: z.string().optional(),
  auth_uri: z.string().url().default('https://accounts.google.com/o/oauth2/auth'),
  token_uri: z.string().url().default('https://oauth2.googleapis.com/token'),
  auth_provider_x509_cert_url: z.string().url().default('https://www.googleapis.com/oauth2/v1/certs'),
  client_x509_cert_url: z.string().url().optional(),
  universe_domain: z.string().default('googleapis.com').optional(),
});

const SplitEnvSchema = z.object({
  projectId: z.string().min(1, 'GOOGLE_CALENDAR_PROJECT_ID is required'),
  clientEmail: z.string().email('GOOGLE_CALENDAR_CLIENT_EMAIL must be a valid email'),
  privateKey: z.string().min(1, 'GOOGLE_CALENDAR_PRIVATE_KEY is required'),
  privateKeyId: z.string().optional(),
  clientId: z.string().optional(),
  authUri: z.string().url().default('https://accounts.google.com/o/oauth2/auth').optional(),
  tokenUri: z.string().url().default('https://oauth2.googleapis.com/token').optional(),
  authProviderX509CertUrl: z.string().url().default('https://www.googleapis.com/oauth2/v1/certs').optional(),
  clientX509CertUrl: z.string().url().optional(),
  universeDomain: z.string().default('googleapis.com').optional(),
});

function normalizePrivateKey(key: string): string {
  // Support both escaped newlines and real newlines
  return key.replace(/\\n/g, '\n');
}

/**
 * Validar que las variables de entorno necesarias estén configuradas
 */
export function validateGoogleCalendarConfig(): {
  isValid: boolean;
  missingVars: string[];
  errors: string[];
} {
  const missingVars: string[] = [];
  const errors: string[] = [];
  
  const hasPath = !!googleCalendarConfig.serviceAccountKeyPath;
  const hasJson = !!googleCalendarConfig.serviceAccountKey;
  const hasSplit = !!(
    googleCalendarConfig.split.projectId &&
    googleCalendarConfig.split.clientEmail &&
    googleCalendarConfig.split.privateKey
  );

  // Debe existir al menos una forma de credenciales
  if (!hasPath && !hasJson && !hasSplit) {
    missingVars.push(
      'GOOGLE_SERVICE_ACCOUNT_KEY_PATH or GOOGLE_SERVICE_ACCOUNT_KEY or (GOOGLE_CALENDAR_PROJECT_ID, GOOGLE_CALENDAR_CLIENT_EMAIL, GOOGLE_CALENDAR_PRIVATE_KEY)'
    );
  }
  
  // Si se usa serviceAccountKey JSON, verificar que sea un JSON válido
  if (hasJson) {
    try {
      const parsed = JSON.parse(googleCalendarConfig.serviceAccountKey);
      ServiceAccountJsonSchema.parse(parsed);
    } catch {
      errors.push('GOOGLE_SERVICE_ACCOUNT_KEY must be a valid service account JSON');
    }
  }

  // Si se usa split, validar con Zod
  if (hasSplit) {
    const normalized = {
      ...googleCalendarConfig.split,
      privateKey: normalizePrivateKey(googleCalendarConfig.split.privateKey),
    };
    const res = SplitEnvSchema.safeParse(normalized);
    if (!res.success) {
      errors.push(
        ...res.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      );
    }
  }
  
  return {
    isValid: missingVars.length === 0 && errors.length === 0,
    missingVars,
    errors,
  };
}

/**
 * Obtener las credenciales de la cuenta de servicio
 */
export function getServiceAccountCredentials(): GoogleCalendarCredentials | null {
  // 1) Preferir variables separadas si están completas
  const splitCheck = SplitEnvSchema.safeParse(googleCalendarConfig.split);
  if (splitCheck.success) {
    const s = splitCheck.data;
    const privateKey = normalizePrivateKey(s.privateKey);

    const creds: GoogleCalendarCredentials = {
      type: 'service_account',
      project_id: s.projectId,
      private_key_id: s.privateKeyId || '',
      private_key: privateKey,
      client_email: s.clientEmail,
      client_id: s.clientId || '',
      auth_uri: s.authUri || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: s.tokenUri || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: s.authProviderX509CertUrl || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: s.clientX509CertUrl || `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(s.clientEmail)}`,
      universe_domain: s.universeDomain || 'googleapis.com',
    };

    return creds;
  }

  // 2) Luego, JSON completo si está presente
  if (googleCalendarConfig.serviceAccountKey) {
    try {
      const json = JSON.parse(googleCalendarConfig.serviceAccountKey);
      const parsed = ServiceAccountJsonSchema.parse(json);

      // Normalizar saltos de línea en private_key
      parsed.private_key = normalizePrivateKey(parsed.private_key);

      // Si falta client_x509_cert_url, intentar construirlo
      if (!parsed.client_x509_cert_url && parsed.client_email) {
        parsed.client_x509_cert_url = `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(parsed.client_email)}`;
      }

      return parsed as GoogleCalendarCredentials;
    } catch (error) {
      console.error('[GoogleCalendarConfig] Invalid GOOGLE_SERVICE_ACCOUNT_KEY JSON:', error);
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY format');
    }
  }
  
  // 3) Si se usa la ruta del archivo, se manejará en google-calendar.ts
  if (googleCalendarConfig.serviceAccountKeyPath) {
    return null;
  }
  
  throw new Error('No Google service account credentials configured');
}

/**
 * Tipos para TypeScript
 */
export interface GoogleCalendarCredentials {
  type: 'service_account';
  project_id: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  universe_domain?: string;
}

export interface CalendarEventReminder {
  method: 'email' | 'popup';
  minutes: number;
}

export interface CalendarEventAttendee {
  email: string;
  displayName?: string;
  optional?: boolean;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
}