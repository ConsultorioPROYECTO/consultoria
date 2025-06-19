// src/lib/config/google-calendar-config.ts

/**
 * Configuración para Google Calendar API
 */
export const googleCalendarConfig = {
  // Ruta al archivo de credenciales de la cuenta de servicio
  serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || '',
  
  // Contenido del archivo de credenciales como JSON string (alternativa)
  serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',
  
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
  
  // Verificar que al menos una forma de credenciales esté configurada
  if (!googleCalendarConfig.serviceAccountKeyPath && !googleCalendarConfig.serviceAccountKey) {
    missingVars.push('GOOGLE_SERVICE_ACCOUNT_KEY_PATH or GOOGLE_SERVICE_ACCOUNT_KEY');
  }
  
  // Si se usa serviceAccountKey, verificar que sea un JSON válido
  if (googleCalendarConfig.serviceAccountKey) {
    try {
      JSON.parse(googleCalendarConfig.serviceAccountKey);
    } catch {
      errors.push('GOOGLE_SERVICE_ACCOUNT_KEY must be a valid JSON string');
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
export function getServiceAccountCredentials(): any {
  if (googleCalendarConfig.serviceAccountKey) {
    try {
      return JSON.parse(googleCalendarConfig.serviceAccountKey);
    } catch (error) {
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY format');
    }
  }
  
  if (googleCalendarConfig.serviceAccountKeyPath) {
    // Si se usa la ruta del archivo, se manejará en google-calendar.ts
    return null;
  }
  
  throw new Error('No Google service account credentials configured');
}

/**
 * Tipos para TypeScript
 */
export interface GoogleCalendarCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
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