/**
 * @fileoverview Tipos específicos para el dominio de consultoría
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-01-27
 * @description Tipos y interfaces específicas para la gestión de calendarios
 * y citas en el contexto de consultoría médica.
 */

import { z } from 'zod';
import { calendar_v3 } from 'googleapis';

// === Enums ===

/**
 * Estados de una cita
 */
export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled',
}

/**
 * Tipos de consulta
 */
export enum ConsultationType {
  INITIAL = 'initial',
  FOLLOW_UP = 'follow_up',
  EMERGENCY = 'emergency',
  TELEMEDICINE = 'telemedicine',
  PROCEDURE = 'procedure',
  CONSULTATION = 'consultation',
}

/**
 * Prioridades de cita
 */
export enum AppointmentPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// === Esquemas Zod ===

/**
 * Esquema para información del paciente
 */
export const PatientInfoSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nombre del paciente es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos'),
  dateOfBirth: z.string().optional(),
  emergencyContact: z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string(),
  }).optional(),
  medicalHistory: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
});

/**
 * Esquema para información del doctor
 */
export const DoctorInfoSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nombre del doctor es requerido'),
  email: z.string().email('Email inválido'),
  specialization: z.string(),
  licenseNumber: z.string().optional(),
  calendarId: z.string().optional(),
});

/**
 * Esquema para crear una cita médica
 */
export const CreateAppointmentSchema = z.object({
  patient: PatientInfoSchema,
  doctor: DoctorInfoSchema,
  consultationType: z.nativeEnum(ConsultationType),
  priority: z.nativeEnum(AppointmentPriority).default(AppointmentPriority.NORMAL),
  startDateTime: z.string().datetime('Fecha y hora de inicio inválida'),
  endDateTime: z.string().datetime('Fecha y hora de fin inválida'),
  location: z.string().optional(),
  notes: z.string().optional(),
  symptoms: z.string().optional(),
  reasonForVisit: z.string().min(1, 'Motivo de la consulta es requerido'),
  isTelemedicine: z.boolean().default(false),
  meetingLink: z.string().url().optional(),
  reminderMinutes: z.array(z.number()).default([15, 60]), // Recordatorios en minutos
});

/**
 * Esquema para actualizar una cita
 */
export const UpdateAppointmentSchema = CreateAppointmentSchema.partial().extend({
  status: z.nativeEnum(AppointmentStatus).optional(),
  cancellationReason: z.string().optional(),
  completionNotes: z.string().optional(),
});

/**
 * Esquema para configuración de horarios de trabajo
 */
export const WorkingHoursSchema = z.object({
  monday: z.object({ start: z.string(), end: z.string(), enabled: z.boolean() }).optional(),
  tuesday: z.object({ start: z.string(), end: z.string(), enabled: z.boolean() }).optional(),
  wednesday: z.object({ start: z.string(), end: z.string(), enabled: z.boolean() }).optional(),
  thursday: z.object({ start: z.string(), end: z.string(), enabled: z.boolean() }).optional(),
  friday: z.object({ start: z.string(), end: z.string(), enabled: z.boolean() }).optional(),
  saturday: z.object({ start: z.string(), end: z.string(), enabled: z.boolean() }).optional(),
  sunday: z.object({ start: z.string(), end: z.string(), enabled: z.boolean() }).optional(),
});

/**
 * Esquema para configuración de consultorio
 */
export const ConsultorioConfigSchema = z.object({
  name: z.string().min(1, 'Nombre del consultorio es requerido'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  workingHours: WorkingHoursSchema,
  appointmentDuration: z.number().min(15).max(240).default(30), // minutos
  bufferTime: z.number().min(0).max(60).default(5), // minutos entre citas
  maxAdvanceBooking: z.number().min(1).max(365).default(90), // días
  allowWeekendBooking: z.boolean().default(false),
  timeZone: z.string().default('America/Mexico_City'),
});

// === Tipos TypeScript ===

export type PatientInfo = z.infer<typeof PatientInfoSchema>;
export type DoctorInfo = z.infer<typeof DoctorInfoSchema>;
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;
export type WorkingHours = z.infer<typeof WorkingHoursSchema>;
export type ConsultorioConfig = z.infer<typeof ConsultorioConfigSchema>;

/**
 * Interfaz para una cita completa con metadatos
 */
export interface Appointment {
  id: string;
  calendarId: string;
  eventId: string;
  patient: PatientInfo;
  doctor: DoctorInfo;
  consultationType: ConsultationType;
  priority: AppointmentPriority;
  status: AppointmentStatus;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  notes?: string;
  symptoms?: string;
  reasonForVisit: string;
  isTelemedicine: boolean;
  meetingLink?: string;
  reminderMinutes: number[];
  cancellationReason?: string;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;
  googleEvent?: calendar_v3.Schema$Event;
}

/**
 * Interfaz para slots de tiempo disponibles
 */
export interface AvailableTimeSlot {
  start: string;
  end: string;
  duration: number; // minutos
  isAvailable: boolean;
  conflictReason?: string;
}

/**
 * Interfaz para estadísticas del consultorio
 */
export interface ConsultorioStats {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  upcomingAppointments: number;
  averageAppointmentDuration: number;
  busyHours: { hour: number; count: number }[];
  popularConsultationTypes: { type: ConsultationType; count: number }[];
  patientRetentionRate: number;
}

/**
 * Interfaz para filtros de búsqueda de citas
 */
export interface AppointmentFilters {
  startDate?: string;
  endDate?: string;
  doctorId?: string;
  patientEmail?: string;
  status?: AppointmentStatus[];
  consultationType?: ConsultationType[];
  priority?: AppointmentPriority[];
  isTelemedicine?: boolean;
  searchQuery?: string;
}

/**
 * Interfaz para resultado paginado
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Interfaz para notificaciones
 */
export interface AppointmentNotification {
  id: string;
  appointmentId: string;
  type: 'reminder' | 'confirmation' | 'cancellation' | 'rescheduling';
  recipient: 'patient' | 'doctor' | 'both';
  method: 'email' | 'sms' | 'push';
  scheduledFor: string;
  sent: boolean;
  sentAt?: string;
  content: {
    subject: string;
    body: string;
    templateId?: string;
  };
}

/**
 * Interfaz para configuración de recordatorios
 */
export interface ReminderConfig {
  enabled: boolean;
  methods: ('email' | 'sms' | 'push')[];
  timings: number[]; // minutos antes de la cita
  customMessage?: string;
  includeLocation: boolean;
  includeMeetingLink: boolean;
}

/**
 * Interfaz para métricas de rendimiento
 */
export interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  apiCallsPerMinute: number;
  cacheHitRate: number;
  lastUpdated: string;
}

/**
 * Colores predefinidos para eventos en Google Calendar
 */
export const CALENDAR_COLORS = {
  INITIAL: '1', // Azul
  FOLLOW_UP: '2', // Verde
  EMERGENCY: '11', // Rojo
  TELEMEDICINE: '5', // Amarillo
  PROCEDURE: '9', // Azul oscuro
  CONSULTATION: '7', // Turquesa
  CANCELLED: '8', // Gris
  COMPLETED: '10', // Verde oscuro
} as const;

/**
 * Configuración por defecto para nuevos consultorios
 */
export const DEFAULT_CONSULTORIO_CONFIG: ConsultorioConfig = {
  name: 'Nuevo Consultorio',
  workingHours: {
    monday: { start: '09:00', end: '17:00', enabled: true },
    tuesday: { start: '09:00', end: '17:00', enabled: true },
    wednesday: { start: '09:00', end: '17:00', enabled: true },
    thursday: { start: '09:00', end: '17:00', enabled: true },
    friday: { start: '09:00', end: '17:00', enabled: true },
    saturday: { start: '09:00', end: '13:00', enabled: false },
    sunday: { start: '09:00', end: '13:00', enabled: false },
  },
  appointmentDuration: 30,
  bufferTime: 5,
  maxAdvanceBooking: 90,
  allowWeekendBooking: false,
  timeZone: 'America/Mexico_City',
};