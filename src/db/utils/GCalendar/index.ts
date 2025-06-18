// src/db/utils/GCalendar/index.ts

/**
 * @fileoverview Punto de entrada principal para las utilidades de Google Calendar
 * @author Santiago Prada
 * @description Exportaciones centralizadas de todas las funciones, tipos y configuraciones
 */

import {
  CalendarSyncError,
  ConflictError,
  GoogleCalendarApiError,
  type CalendarConfig,
  type SyncConfiguration,
  type BatchSyncResult,
  type SyncResult,
} from './types';

// --- Exportaciones de utilidades de base de datos ---
export {
  // Schemas
  SyncStatusSchema,
  CalendarSyncSchema,
  AppointmentWithCalendarSchema,
  
  // Funciones de doctores
  getDoctorWithCalendar,
  updateDoctorCalendarConfig,
  updateDoctorLastSync,
  getDoctorsWithSyncEnabled,
  
  // Funciones de citas
  createAppointmentWithCalendar,
  getAppointmentByGoogleEventId,
  updateAppointmentSyncStatus,
  getPendingSyncAppointments,
  getFailedSyncAppointments,
  getDoctorAppointmentsByDateRange,
  getDoctorSyncedAppointments,
  removeAppointmentCalendarInfo,
  
  // Funciones de estadísticas
  getDoctorSyncStats,
  getGeneralSyncStats,
  
  // Funciones de limpieza
  cleanupOldFailedSyncs,
  retryFailedSyncs as retryFailedSyncsFromDb,
  
  // Tipos
  type AppointmentWithCalendar,
  type SyncStatus,
  type CalendarSync,
} from './calendar-db-utils';

// --- Exportaciones del servicio de sincronización ---
export {
  // Schemas
  GoogleEventSchema,
  SyncResultSchema,
  
  // Funciones principales de sincronización
  syncAppointmentToGoogle,
  syncGoogleEventToDatabase,
  deleteAppointmentFromGoogle,
  syncDoctorPendingAppointments,
  syncGoogleCalendarToDatabase,
  
  // Funciones de verificación
  checkAppointmentConflicts,
  
  // Funciones de reintento
  retryFailedSyncs,
  
  // Tipos
  type GoogleEvent,
  type SyncResult,
} from './sync-service';

// --- Exportaciones de tipos ---
export {
  // Schemas principales
  CalendarConfigSchema,
  AppointmentStatusSchema,
  GoogleEventStatusSchema,
  RecurrenceTypeSchema,
  
  // Interfaces principales
  type CalendarConfig,
  type GoogleCalendarEvent,
  type AppointmentSyncData,
  type SyncOperation,
  type ConflictDetection,
  type AvailabilitySlot,
  type DoctorAvailability,
  
  // Tipos de respuesta
  type BatchSyncResult,
  type CalendarStats,
  
  // Configuraciones
  type SyncConfiguration,
  type CalendarEventData,
  
  // Filtros
  type AppointmentFilter,
  type GoogleCalendarFilter,
  
  // Errores personalizados
  CalendarSyncError,
  ConflictError,
  GoogleCalendarApiError,
  
  // Constantes
  DEFAULT_APPOINTMENT_DURATION,
  DEFAULT_SYNC_INTERVAL,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY,
  BATCH_SIZE,
  TIMEZONE_OPTIONS,
  CALENDAR_COLORS,
  
  // Tipos derivados
  type AppointmentStatus,
  type GoogleEventStatus,
  type RecurrenceType,
  type CalendarColor,
  type Timezone,
  
  // Validadores
  validateCalendarConfig,
  validateAppointmentStatus,
  validateSyncStatus,
  
  // Utilidades de tipo
  type PartialBy,
  type RequiredBy,
  type CreateAppointmentData,
  type UpdateAppointmentData,
} from './types';

// --- Exportaciones de configuración ---
export {
  // Configuraciones por defecto
  DEFAULT_CALENDAR_CONFIG,
  DEFAULT_SYNC_CONFIG,
  
  // Constantes del sistema
  SYNC_CONSTANTS,
  GOOGLE_CALENDAR_LIMITS,
  TIME_FORMATS,
  TIMEZONES,
  
  // Estados y prioridades
  APPOINTMENT_STATUSES,
  SYNC_STATUSES,
  SYNC_PRIORITIES,
  
  // Configuraciones específicas
  NOTIFICATION_SETTINGS,
  RECURRENCE_PATTERNS,
  
  // Mensajes de error
  ERROR_MESSAGES,
  
  // Logging
  LOG_LEVELS,
  LOG_CATEGORIES,
  
  // Esquemas de validación
  ConfigValidationSchemas,
  
  // Funciones de utilidad
  validateCalendarConfig as validateCalendarConfigFromConfig,
  validateSyncConfig,
  getColorBySpecialty,
  getRemindersByAppointmentType,
  getNextSyncInterval,
  shouldSync,
  getEnvironmentConfig,
} from './config';

// --- Funciones de conveniencia ---

/**
 * Inicializa la configuración completa de Google Calendar para un doctor
 */
export async function initializeDoctorCalendar(
  doctorId: number,
  calendarConfig?: Partial<CalendarConfig>,
  syncConfig?: Partial<SyncConfiguration>
) {
  const { validateCalendarConfig, validateSyncConfig } = await import('./config');
  const { updateDoctorCalendarConfig } = await import('./calendar-db-utils');
  
  const validatedCalendarConfig = validateCalendarConfig(calendarConfig || {});
  const validatedSyncConfig = validateSyncConfig(syncConfig || {});
  
  const settings = {
    ...validatedCalendarConfig,
    sync: validatedSyncConfig,
  };
  
  return updateDoctorCalendarConfig(doctorId, {
    calendar_sync_enabled: validatedSyncConfig.enabled,
    calendar_timezone: validatedCalendarConfig.timezone,
    calendar_color: validatedCalendarConfig.color,
    calendar_settings: JSON.stringify(settings),
  });
}

/**
 * Ejecuta una sincronización completa para un doctor
 */
export async function performFullSync(
  doctorId: number,
  options: {
    direction?: 'to_google' | 'from_google' | 'bidirectional';
    dateRange?: { start: Date; end: Date };
    forceSync?: boolean;
  } = {}
): Promise<BatchSyncResult> {
  const {
    syncDoctorPendingAppointments,
    syncGoogleCalendarToDatabase,
  } = await import('./sync-service');
  
  const { direction = 'bidirectional', dateRange, forceSync = false } = options;
  
  const results: SyncResult[] = [];
  let totalProcessed = 0;
  let successful = 0;
  let failed = 0;
  let skipped = 0;
  
  try {
    // Sincronizar hacia Google Calendar
    if (direction === 'to_google' || direction === 'bidirectional') {
      const toGoogleResults = await syncDoctorPendingAppointments(doctorId);
      results.push(...toGoogleResults.map(result => ({
        ...result,
        timestamp: new Date()
      })));
    }
    
    // Sincronizar desde Google Calendar
    if (direction === 'from_google' || direction === 'bidirectional') {
      const fromGoogleResults = await syncGoogleCalendarToDatabase(
        doctorId,
        dateRange?.start,
        dateRange?.end
      );
      results.push(...fromGoogleResults.map(result => ({
        ...result,
        timestamp: new Date()
      })));
    }
    
    // Calcular estadísticas
    totalProcessed = results.length;
    successful = results.filter(r => r.success).length;
    failed = results.filter(r => !r.success).length;
    skipped = results.filter(r => r.action === 'skipped').length;
    
    const summary = {
      created: results.filter(r => r.action === 'created').length,
      updated: results.filter(r => r.action === 'updated').length,
      deleted: results.filter(r => r.action === 'deleted').length,
      errors: results.filter(r => !r.success).map(r => r.error || 'Error desconocido'),
    };
    
    return {
      totalProcessed,
      successful,
      failed,
      skipped,
      results,
      summary,
    };
  } catch (error) {
    throw new CalendarSyncError(
      'Error durante la sincronización completa',
      'FULL_SYNC_ERROR',
      undefined,
      undefined
    );
  }
}

/**
 * Obtiene el estado de sincronización de un doctor
 */
export async function getDoctorSyncStatus(doctorId: number) {
  const { getDoctorWithCalendar, getDoctorSyncStats } = await import('./calendar-db-utils');
  
  const doctor = await getDoctorWithCalendar(doctorId);
  const stats = await getDoctorSyncStats(doctorId);
  
  if (!doctor) {
    throw new Error('Doctor no encontrado');
  }
  
  return {
    doctor: {
      id: doctor.idDoctor,
      calendarId: doctor.calendar_id,
      syncEnabled: doctor.calendar_sync_enabled,
      timezone: doctor.calendar_timezone,
      lastSync: doctor.last_calendar_sync,
    },
    stats,
    isHealthy: (stats.synced / stats.total) > 0.8 && stats.failed < 5,
  };
}

/**
 * Verifica y resuelve conflictos de horarios
 */
export async function resolveScheduleConflicts(
  doctorId: number,
  date: Date,
  time: string,
  duration: number = 30
) {
  const { checkAppointmentConflicts } = await import('./sync-service');
  
  const conflictCheck = await checkAppointmentConflicts(doctorId, date, time, duration);
  
  if (!conflictCheck.hasConflict) {
    return {
      canSchedule: true,
      conflicts: [],
      suggestions: [],
    };
  }
  
  // Generar sugerencias de horarios alternativos
  const suggestions = await generateAlternativeSlots(doctorId, date, duration);
  
  return {
    canSchedule: false,
    conflicts: conflictCheck.conflicts,
    suggestions,
  };
}

/**
 * Genera slots alternativos para una fecha
 */
async function generateAlternativeSlots(
  doctorId: number,
  date: Date,
  duration: number
): Promise<string[]> {
  // Esta función podría implementarse para sugerir horarios alternativos
  // basados en la disponibilidad del doctor y las citas existentes
  return [];
}

// --- Exportación por defecto ---
export default {
  // Funciones principales
  initializeDoctorCalendar,
  performFullSync,
  getDoctorSyncStatus,
  resolveScheduleConflicts,
  
  // Configuraciones
  DEFAULT_CALENDAR_CONFIG: {} as CalendarConfig,
  DEFAULT_SYNC_CONFIG: {} as SyncConfiguration,
  SYNC_CONSTANTS: {} as any,
  
  // Errores
  CalendarSyncError,
  ConflictError,
  GoogleCalendarApiError,
};