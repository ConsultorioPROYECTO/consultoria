// src/db/utils/GCalendar/config.ts

import { z } from 'zod';
import type { SyncConfiguration, CalendarConfig } from './types';

/**
 * @fileoverview Configuración y constantes para la integración con Google Calendar
 * @author Santiago Prada
 * @description Configuraciones por defecto, validaciones y constantes del sistema
 */

// --- Configuraciones por defecto ---

export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = {
  timezone: 'America/Bogota',
  color: '#4285f4',
  notifications: {
    email: true,
    popup: true,
    reminderMinutes: [15, 60],
  },
  workingHours: {
    start: '08:00',
    end: '18:00',
    days: [1, 2, 3, 4, 5], // Lunes a Viernes
  },
  autoSync: true,
  syncInterval: 30,
};

export const DEFAULT_SYNC_CONFIG: SyncConfiguration = {
  enabled: true,
  direction: 'bidirectional',
  autoSync: true,
  syncInterval: 30,
  conflictResolution: 'manual',
  retryAttempts: 3,
  retryDelay: 5,
  batchSize: 50,
  notifications: {
    onSuccess: false,
    onError: true,
    onConflict: true,
  },
};

// --- Constantes del sistema ---

export const SYNC_CONSTANTS = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_SECONDS: 5,
  BATCH_SIZE: 50,
  DEFAULT_APPOINTMENT_DURATION: 30,
  MIN_SYNC_INTERVAL: 5,
  MAX_SYNC_INTERVAL: 1440,
  RATE_LIMIT_DELAY: 100,
  CLEANUP_DAYS: 30,
} as const;

export const GOOGLE_CALENDAR_LIMITS = {
  MAX_EVENTS_PER_REQUEST: 2500,
  MAX_ATTENDEES_PER_EVENT: 200,
  MAX_DESCRIPTION_LENGTH: 8192,
  MAX_SUMMARY_LENGTH: 1024,
  MAX_LOCATION_LENGTH: 1024,
  REQUESTS_PER_SECOND: 10,
  REQUESTS_PER_DAY: 1000000,
} as const;

// --- Configuraciones de tiempo ---

export const TIME_FORMATS = {
  TIME_12H: /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i,
  TIME_24H: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
  DATETIME_ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
} as const;

export const TIMEZONES = {
  COLOMBIA: 'America/Bogota',
  US_EASTERN: 'America/New_York',
  US_PACIFIC: 'America/Los_Angeles',
  SPAIN: 'Europe/Madrid',
  UK: 'Europe/London',
  JAPAN: 'Asia/Tokyo',
  UTC: 'UTC',
} as const;

// --- Colores de calendario ---

export const CALENDAR_COLORS = {
  // Colores principales
  primary: '#4285f4',
  secondary: '#34a853',
  accent: '#ea4335',
  
  // Colores por especialidad médica
  cardiology: '#e53e3e',
  dermatology: '#38a169',
  neurology: '#3182ce',
  pediatrics: '#ed8936',
  psychiatry: '#805ad5',
  orthopedics: '#718096',
  gynecology: '#d53f8c',
  general: '#4285f4',
  
  // Colores por tipo de cita
  consultation: '#4285f4',
  followup: '#34a853',
  emergency: '#ea4335',
  surgery: '#9c27b0',
  checkup: '#ff9800',
  virtual: '#00bcd4',
} as const;

// --- Estados y prioridades ---

export const APPOINTMENT_STATUSES = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  RESCHEDULED: 'rescheduled',
} as const;

export const SYNC_STATUSES = {
  PENDING: 'pending',
  SYNCED: 'synced',
  FAILED: 'failed',
  NOT_SYNCED: 'not_synced',
} as const;

export const SYNC_PRIORITIES = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
} as const;

// --- Configuraciones de notificaciones ---

export const NOTIFICATION_SETTINGS = {
  DEFAULT_REMINDERS: [15, 60], // minutos antes
  EMAIL_REMINDERS: [1440, 60], // 24 horas y 1 hora antes
  SMS_REMINDERS: [60, 15], // 1 hora y 15 minutos antes
  POPUP_REMINDERS: [15, 5], // 15 y 5 minutos antes
} as const;

// --- Configuraciones de recurrencia ---

export const RECURRENCE_PATTERNS = {
  DAILY: 'RRULE:FREQ=DAILY',
  WEEKLY: 'RRULE:FREQ=WEEKLY',
  MONTHLY: 'RRULE:FREQ=MONTHLY',
  YEARLY: 'RRULE:FREQ=YEARLY',
  WEEKDAYS: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
  WEEKENDS: 'RRULE:FREQ=WEEKLY;BYDAY=SA,SU',
} as const;

// --- Mensajes de error ---

export const ERROR_MESSAGES = {
  SYNC: {
    DOCTOR_NOT_FOUND: 'Doctor no encontrado',
    SYNC_DISABLED: 'Sincronización deshabilitada para este doctor',
    CALENDAR_NOT_CONFIGURED: 'Calendario no configurado',
    INVALID_CREDENTIALS: 'Credenciales de Google Calendar inválidas',
    RATE_LIMIT_EXCEEDED: 'Límite de solicitudes excedido',
    NETWORK_ERROR: 'Error de conexión con Google Calendar',
    INVALID_EVENT_DATA: 'Datos del evento inválidos',
    CONFLICT_DETECTED: 'Conflicto de horarios detectado',
    APPOINTMENT_NOT_FOUND: 'Cita no encontrada',
    GOOGLE_EVENT_NOT_FOUND: 'Evento de Google Calendar no encontrado',
  },
  VALIDATION: {
    INVALID_TIME_FORMAT: 'Formato de hora inválido',
    INVALID_DATE_FORMAT: 'Formato de fecha inválido',
    INVALID_TIMEZONE: 'Zona horaria inválida',
    INVALID_DURATION: 'Duración inválida',
    INVALID_EMAIL: 'Email inválido',
    REQUIRED_FIELD: 'Campo requerido',
  },
  CALENDAR: {
    CREATION_FAILED: 'Error al crear calendario',
    UPDATE_FAILED: 'Error al actualizar calendario',
    DELETE_FAILED: 'Error al eliminar calendario',
    ACCESS_DENIED: 'Acceso denegado al calendario',
    QUOTA_EXCEEDED: 'Cuota de API excedida',
  },
} as const;

// --- Configuraciones de logging ---

export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

export const LOG_CATEGORIES = {
  SYNC: 'sync',
  API: 'api',
  DATABASE: 'database',
  VALIDATION: 'validation',
  CONFLICT: 'conflict',
  NOTIFICATION: 'notification',
} as const;

// --- Esquemas de validación ---

export const ConfigValidationSchemas = {
  calendarConfig: z.object({
    timezone: z.string().min(1),
    color: z.string().optional(),
    notifications: z.object({
      email: z.boolean(),
      popup: z.boolean(),
      reminderMinutes: z.array(z.number().min(0).max(10080)),
    }),
    workingHours: z.object({
      start: z.string().regex(TIME_FORMATS.TIME_24H),
      end: z.string().regex(TIME_FORMATS.TIME_24H),
      days: z.array(z.number().min(0).max(6)),
    }).optional(),
    autoSync: z.boolean(),
    syncInterval: z.number().min(SYNC_CONSTANTS.MIN_SYNC_INTERVAL).max(SYNC_CONSTANTS.MAX_SYNC_INTERVAL),
  }),
  
  syncConfig: z.object({
    enabled: z.boolean(),
    direction: z.enum(['to_google', 'from_google', 'bidirectional']),
    autoSync: z.boolean(),
    syncInterval: z.number().min(5).max(1440),
    conflictResolution: z.enum(['local_wins', 'remote_wins', 'manual']),
    retryAttempts: z.number().min(0).max(10),
    retryDelay: z.number().min(1).max(300),
    batchSize: z.number().min(1).max(100),
    notifications: z.object({
      onSuccess: z.boolean(),
      onError: z.boolean(),
      onConflict: z.boolean(),
    }),
  }),
  
  timeSlot: z.object({
    start: z.string().regex(TIME_FORMATS.TIME_24H),
    end: z.string().regex(TIME_FORMATS.TIME_24H),
  }),
  
  dateRange: z.object({
    startDate: z.date(),
    endDate: z.date(),
  }).refine(data => data.endDate >= data.startDate, {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
  }),
};

// --- Funciones de utilidad para configuración ---

/**
 * Valida y normaliza la configuración del calendario
 */
export function validateCalendarConfig(config: Partial<CalendarConfig>): CalendarConfig {
  const validated = ConfigValidationSchemas.calendarConfig.parse({
    ...DEFAULT_CALENDAR_CONFIG,
    ...config,
  });
  
  return validated;
}

/**
 * Valida y normaliza la configuración de sincronización
 */
export function validateSyncConfig(config: Partial<SyncConfiguration>): SyncConfiguration {
  const validated = ConfigValidationSchemas.syncConfig.parse({
    ...DEFAULT_SYNC_CONFIG,
    ...config,
  });
  
  return validated;
}

/**
 * Obtiene el color del calendario basado en la especialidad
 */
export function getColorBySpecialty(specialty: string): string {
  const normalizedSpecialty = specialty.toLowerCase().replace(/\s+/g, '');
  
  const colorMap: Record<string, string> = {
    cardiologia: CALENDAR_COLORS.cardiology,
    dermatologia: CALENDAR_COLORS.dermatology,
    neurologia: CALENDAR_COLORS.neurology,
    pediatria: CALENDAR_COLORS.pediatrics,
    psiquiatria: CALENDAR_COLORS.psychiatry,
    ortopedia: CALENDAR_COLORS.orthopedics,
    ginecologia: CALENDAR_COLORS.gynecology,
    medicina_general: CALENDAR_COLORS.general,
    general: CALENDAR_COLORS.general,
  };
  
  return colorMap[normalizedSpecialty] || CALENDAR_COLORS.general;
}

/**
 * Obtiene la configuración de recordatorios basada en el tipo de cita
 */
export function getRemindersByAppointmentType(type: string): number[] {
  const typeMap: Record<string, number[]> = {
    emergency: [15, 5],
    surgery: [1440, 120, 30],
    consultation: [15,60],
    followup: [60, 15],
    checkup: [1440, 60],
    virtual: [30, 10],
  };
  
  return typeMap[type.toLowerCase()] || NOTIFICATION_SETTINGS.DEFAULT_REMINDERS;
}

/**
 * Calcula el siguiente intervalo de sincronización
 */
export function getNextSyncInterval(lastSync: Date, interval: number): Date {
  const nextSync = new Date(lastSync);
  nextSync.setMinutes(nextSync.getMinutes() + interval);
  return nextSync;
}

/**
 * Verifica si es hora de sincronizar
 */
export function shouldSync(lastSync: Date | null, interval: number): boolean {
  if (!lastSync) return true;
  
  const now = new Date();
  const nextSync = getNextSyncInterval(lastSync, interval);
  
  return now >= nextSync;
}

/**
 * Obtiene la configuración de entorno
 */
export function getEnvironmentConfig() {
  return {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    googleCalendarApiKey: process.env.GOOGLE_CALENDAR_API_KEY,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    databaseUrl: process.env.DATABASE_URL,
    logLevel: process.env.LOG_LEVEL || LOG_LEVELS.INFO,
  };
}

// --- Exportaciones por defecto ---

export default {
  DEFAULT_CALENDAR_CONFIG,
  DEFAULT_SYNC_CONFIG,
  SYNC_CONSTANTS,
  GOOGLE_CALENDAR_LIMITS,
  CALENDAR_COLORS,
  ERROR_MESSAGES,
  validateCalendarConfig,
  validateSyncConfig,
  getColorBySpecialty,
  getRemindersByAppointmentType,
  shouldSync,
};