// src/db/utils/GCalendar/types.ts

import { z } from 'zod';

/**
 * @fileoverview Tipos y esquemas para la integración con Google Calendar
 * @author Santiago Prada
 * @description Definiciones de tipos, interfaces y esquemas de validación
 */

// --- Esquemas de validación ---

export const CalendarConfigSchema = z.object({
  timezone: z.string().default('America/Bogota'),
  color: z.string().optional(),
  notifications: z.object({
    email: z.boolean().default(true),
    popup: z.boolean().default(true),
    reminderMinutes: z.array(z.number()).default([15, 60]),
  }).default({}),
  workingHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    days: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]), // Lunes a Viernes
  }).optional(),
  autoSync: z.boolean().default(true),
  syncInterval: z.number().min(5).max(1440).default(30), // minutos
});

export const AppointmentStatusSchema = z.enum([
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled'
]);

export const SyncStatusSchema = z.enum([
  'pending',
  'synced',
  'failed',
  'not_synced'
]);

export const GoogleEventStatusSchema = z.enum([
  'confirmed',
  'tentative',
  'cancelled'
]);

export const RecurrenceTypeSchema = z.enum([
  'none',
  'daily',
  'weekly',
  'monthly',
  'yearly'
]);

// --- Interfaces principales ---

export interface CalendarConfig {
  timezone: string;
  color?: string;
  notifications: {
    email: boolean;
    popup: boolean;
    reminderMinutes: number[];
  };
  workingHours?: {
    start: string;
    end: string;
    days: number[];
  };
  autoSync: boolean;
  syncInterval: number;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  status: 'confirmed' | 'tentative' | 'cancelled';
  created: string;
  updated: string;
  creator?: {
    email: string;
    displayName?: string;
  };
  organizer?: {
    email: string;
    displayName?: string;
  };
  recurrence?: string[];
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: {
        type: string;
      };
    };
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
  };
}

export interface AppointmentSyncData {
  appointmentId: number;
  googleEventId?: string;
  googleCalendarId?: string;
  syncStatus: z.infer<typeof SyncStatusSchema>;
  lastSyncAttempt?: Date;
  syncError?: string;
  conflictResolution?: 'local_wins' | 'remote_wins' | 'manual';
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  direction: 'to_google' | 'from_google' | 'bidirectional';
  appointmentId?: number;
  googleEventId?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ConflictDetection {
  hasConflict: boolean;
  conflictType: 'time_overlap' | 'double_booking' | 'availability_mismatch';
  conflictingAppointments: Array<{
    id: number;
    patientName?: string;
    time: string;
    duration: number;
  }>;
  suggestions: string[];
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  available: boolean;
  reason?: string;
  appointmentId?: number;
}

export interface DoctorAvailability {
  doctorId: number;
  date: string;
  slots: AvailabilitySlot[];
  workingHours: {
    start: string;
    end: string;
  };
  breaks: Array<{
    start: string;
    end: string;
    reason: string;
  }>;
  exceptions: Array<{
    start: string;
    end: string;
    type: 'unavailable' | 'extended_hours';
    reason: string;
  }>;
}

// --- Tipos de respuesta ---

export interface SyncResult {
  success: boolean;
  appointmentId?: number;
  googleEventId?: string;
  error?: string;
  action: 'created' | 'updated' | 'deleted' | 'skipped';
  timestamp: Date;
  details?: Record<string, any>;
}

export interface BatchSyncResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  results: SyncResult[];
  summary: {
    created: number;
    updated: number;
    deleted: number;
    errors: string[];
  };
}

export interface CalendarStats {
  doctorId: number;
  totalAppointments: number;
  syncedAppointments: number;
  pendingSync: number;
  failedSync: number;
  lastSyncDate?: Date;
  syncSuccessRate: number;
  averageSyncTime?: number;
}

// --- Configuraciones de sincronización ---

export interface SyncConfiguration {
  enabled: boolean;
  direction: 'to_google' | 'from_google' | 'bidirectional';
  autoSync: boolean;
  syncInterval: number; // minutos
  conflictResolution: 'local_wins' | 'remote_wins' | 'manual';
  retryAttempts: number;
  retryDelay: number; // segundos
  batchSize: number;
  notifications: {
    onSuccess: boolean;
    onError: boolean;
    onConflict: boolean;
  };
}

// --- Tipos de eventos ---

export interface CalendarEventData {
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: {
        type: 'hangoutsMeet' | 'addOn';
      };
    };
  };
  recurrence?: string[];
  visibility?: 'default' | 'public' | 'private';
}

// --- Filtros y consultas ---

export interface AppointmentFilter {
  doctorId?: number;
  patientId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  status?: z.infer<typeof AppointmentStatusSchema>[];
  syncStatus?: z.infer<typeof SyncStatusSchema>[];
  hasGoogleEvent?: boolean;
  isVirtual?: boolean;
}

export interface GoogleCalendarFilter {
  calendarId: string;
  timeMin?: string;
  timeMax?: string;
  q?: string; // search query
  singleEvents?: boolean;
  orderBy?: 'startTime' | 'updated';
  maxResults?: number;
  pageToken?: string;
}

// --- Errores personalizados ---

export class CalendarSyncError extends Error {
  constructor(
    message: string,
    public code: string,
    public appointmentId?: number,
    public googleEventId?: string
  ) {
    super(message);
    this.name = 'CalendarSyncError';
  }
}

export class ConflictError extends Error {
  constructor(
    message: string,
    public conflicts: ConflictDetection
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class GoogleCalendarApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public apiError?: any
  ) {
    super(message);
    this.name = 'GoogleCalendarApiError';
  }
}

// --- Constantes ---

export const DEFAULT_APPOINTMENT_DURATION = 30; // minutos
export const DEFAULT_SYNC_INTERVAL = 30; // minutos
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY = 5; // segundos
export const BATCH_SIZE = 50;

export const TIMEZONE_OPTIONS = [
  'America/Bogota',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/Madrid',
  'Europe/London',
  'Asia/Tokyo',
] as const;

export const CALENDAR_COLORS = {
  blue: '#4285f4',
  green: '#0f9d58',
  purple: '#9c27b0',
  red: '#ea4335',
  orange: '#ff9800',
  yellow: '#ffeb3b',
  pink: '#e91e63',
  cyan: '#00bcd4',
} as const;

// --- Tipos derivados ---

export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;
export type SyncStatus = z.infer<typeof SyncStatusSchema>;
export type GoogleEventStatus = z.infer<typeof GoogleEventStatusSchema>;
export type RecurrenceType = z.infer<typeof RecurrenceTypeSchema>;
export type CalendarColor = keyof typeof CALENDAR_COLORS;
export type Timezone = typeof TIMEZONE_OPTIONS[number];

// --- Validadores de tipos ---

export const validateCalendarConfig = (config: unknown): CalendarConfig => {
  return CalendarConfigSchema.parse(config);
};

export const validateAppointmentStatus = (status: unknown): AppointmentStatus => {
  return AppointmentStatusSchema.parse(status);
};

export const validateSyncStatus = (status: unknown): SyncStatus => {
  return SyncStatusSchema.parse(status);
};

// --- Utilidades de tipo ---

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type CreateAppointmentData = PartialBy<
  AppointmentSyncData,
  'syncStatus' | 'lastSyncAttempt'
>;

export type UpdateAppointmentData = Partial<
  Pick<AppointmentSyncData, 'syncStatus' | 'syncError' | 'googleEventId' | 'googleCalendarId'>
>;