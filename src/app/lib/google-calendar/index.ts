/**
 * @fileoverview Exportaciones principales del módulo Google Calendar
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-01-27
 * @description Punto de entrada principal para todas las funcionalidades
 * de Google Calendar API con Service Account.
 */

// === Configuración ===
export {
  googleAuth,
  googleCalendarClient,
  calendarConfig,
  verifyConnection,
  getServiceAccountInfo,
} from './config';

// === Utilidades CRUD ===
export {
  // Tipos y esquemas
  CreateCalendarSchema,
  CreateEventSchema,
  UpdateEventSchema,
  type CreateCalendarInput,
  type CreateEventInput,
  type UpdateEventInput,
  type CalendarOperationResult,
  
  // Funciones de calendario
  createCalendar,
  getCalendar,
  listCalendars,
  updateCalendar,
  deleteCalendar,
  
  // Funciones de eventos
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  
  // Funciones de utilidad
  searchEvents,
  checkAvailability,
  getAvailableSlots,
} from './calendar-utils';

// === Servicio de citas médicas ===
export {
  createAppointment,
  getAppointment,
  listAppointments,
  updateAppointment,
  cancelAppointment,
  deleteAppointment,
  searchAppointments,
  getAvailableAppointmentSlots,
  getConsultorioStatistics,
} from './appointment-service';

// === Tipos específicos del dominio ===
export {
  // Enums
  AppointmentStatus,
  ConsultationType,
  AppointmentPriority,
  
  // Esquemas
  PatientInfoSchema,
  DoctorInfoSchema,
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  WorkingHoursSchema,
  ConsultorioConfigSchema,
  
  // Tipos
  type PatientInfo,
  type DoctorInfo,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
  type WorkingHours,
  type ConsultorioConfig,
  type Appointment,
  type AvailableTimeSlot,
  type AppointmentFilters,
  type PaginatedResult,
  type ConsultorioStats,
  type AppointmentNotification,
  type ReminderConfig,
  type PerformanceMetrics,
  
  // Constantes
  CALENDAR_COLORS,
  DEFAULT_CONSULTORIO_CONFIG,
} from './types';

// === Re-exportar tipos de Google Calendar ===
export type { calendar_v3 } from 'googleapis';