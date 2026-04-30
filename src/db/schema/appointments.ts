// src/db/schema/appointments.ts

import { pgTable, varchar, timestamp, index, integer, text } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { doctors } from './doctors'; // Importar el esquema de doctors
import { patients } from './patients'; // Importar el esquema de patients
import { medicalServices } from './medical_services'; // Importar el esquema de medical_services
import { organization } from './organization'; // Importar el esquema de organization
import { APPOINTMENT_STATUS, SYNC_STATUS } from '@/types/appointment-status';
import { appointmentStatus, syncStatus, appointmentPriority } from './enums';

/**
 * @typedef AppointmentTableSchema
 * @author Santiago Prada
 * @description Define la estructura optimizada de la tabla 'appointments' para dashboards y consultas locales.
 * Mantiene sincronización con Google Calendar pero prioriza consultas rápidas para analytics.
 *
 * @property {number} id - Clave primaria autoincremental interna de la base de datos.
 * @property {number} doctorId - Clave foránea a la tabla 'doctors'.
 * @property {number} patientId - Clave foránea a la tabla 'patients'.
 * @property {number} serviceId - Clave foránea a la tabla 'medical_services'.
 * @property {number} organizationId - Clave foránea a la tabla 'organization'.
 *
 * @property {Date} appointmentDate - Fecha de la cita (YYYY-MM-DD).
 * @property {string} appointmentTime - Hora de inicio de la cita (HH:MM:SS).
 * @property {string} endTime - Hora de finalización de la cita (HH:MM:SS).
 * @property {number} durationMinutes - Duración de la cita en minutos.
 * @property {text} notes - Notas adicionales de la cita.
 * @property {text} patientNotes - Notas específicas del paciente para esta cita.
 * @property {decimal} appointmentPrice - Precio de la cita (puede diferir del precio base del servicio).
 *
 * @property {enum} status - Estado de la cita: 'pending' | 'accepted' | 'attended' | 'rejected' | 'canceled'
 * @property {enum} priority - Prioridad de la cita: 'low' | 'normal' | 'high' | 'urgent'
 * @property {boolean} isFirstTime - Indica si es la primera cita del paciente con este doctor.
 * @property {boolean} isFollowUp - Indica si es una cita de seguimiento.
 * @property {number} followUpOfId - ID de la cita original si es un seguimiento.
 *
 * @property {string} google_event_id - ID del evento en Google Calendar.
 * @property {string} google_calendar_id - ID del calendario donde está el evento.
 * @property {enum} sync_status - Estado de sincronización: 'pending' | 'synced' | 'failed' | 'not_synced'
 * @property {Date} last_sync_attempt - Último intento de sincronización.
 * @property {text} sync_error - Detalles del error si falla la sincronización.
 *
 * @property {Date} createdAt - Timestamp de creación del registro.
 * @property {Date} updatedAt - Timestamp de la última actualización.
 * @property {Date} canceledAt - Timestamp de cancelación (si aplica).
 * @property {Date} attendedAt - Timestamp de cuando se marcó como atendida.
 */
export const appointments = pgTable('appointments', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),

  // --- Claves foráneas ---
  doctorId: integer('doctor_id').references(() => doctors.idDoctor, { onDelete: 'cascade' , onUpdate : 'cascade'}).notNull(),
  patientId: integer('patient_id').references(() => patients.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  serviceId: integer('service_id').references(() => medicalServices.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  organizationId: integer('organization_id').references(()=> organization.id, {onDelete: "cascade", onUpdate: "cascade"}).notNull(),

  // --- Campos de fecha y hora optimizados para consultas ---
  appointmentDate: timestamp('appointment_date', { mode: 'date' }).notNull(),
  appointmentTime: varchar('appointment_time', { length: 8 }).notNull(),
  endTime: varchar('end_time', { length: 8 }),
  durationMinutes: integer('duration_minutes').notNull().default(30),

  // --- Campos de contenido y precio ---
  notes: text('notes'),
  patientNotes: text('patient_notes'),
  appointmentPrice: varchar('appointment_price', { length: 20 }),

  // --- Estados y metadatos ---
  priority: appointmentPriority('priority').default('normal'),
  isFirstTime: integer('is_first_time').default(0),
  isFollowUp: integer('is_follow_up').default(0),
  followUpOfId: integer('follow_up_of_id'),

  // --- Campos de sincronización con Google Calendar ---
  google_event_id: varchar('google_event_id', { length: 255 }).notNull(),
  google_calendar_id: varchar('google_calendar_id', { length: 255 }).notNull(),
  status: appointmentStatus('status').default(APPOINTMENT_STATUS.PENDING).notNull(),
  sync_status: syncStatus('sync_status').default(SYNC_STATUS.PENDING).notNull(),
  last_sync_attempt: timestamp('last_sync_attempt', { mode: 'date' }),
  sync_error: text('sync_error'),

  // --- Timestamps optimizados para analytics ---
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  canceledAt: timestamp('canceled_at', { mode: 'date' }),
  attendedAt: timestamp('attended_at', { mode: 'date' }),
}, (table) => [
  // Índices básicos para relaciones
  index('idx_appointments_doctor_id').on(table.doctorId),
  index('idx_appointments_patient_id').on(table.patientId),
  index('idx_appointments_service_id').on(table.serviceId),
  index('idx_appointments_organization_id').on(table.organizationId),

  // Índices optimizados para dashboards y analytics
  index('idx_appointments_date_time').on(table.appointmentDate, table.appointmentTime),
  index('idx_appointments_status').on(table.status),
  index('idx_appointments_priority').on(table.priority),

  // Índices compuestos para consultas de dashboard frecuentes
  index('idx_appointments_org_date').on(table.organizationId, table.appointmentDate),
  index('idx_appointments_org_status').on(table.organizationId, table.status),
  index('idx_appointments_doctor_date').on(table.doctorId, table.appointmentDate),
  index('idx_appointments_doctor_status').on(table.doctorId, table.status),
  index('idx_appointments_patient_date').on(table.patientId, table.appointmentDate),

  // Índices para métricas de tiempo
  index('idx_appointments_created_at').on(table.createdAt),
  index('idx_appointments_attended_at').on(table.attendedAt),
  index('idx_appointments_canceled_at').on(table.canceledAt),

  // Índices para sincronización con Google Calendar
  index('idx_appointments_google_event_id').on(table.google_event_id),
  index('idx_appointments_sync_status').on(table.sync_status),

  // Índices para seguimientos
  index('idx_appointments_follow_up').on(table.followUpOfId),
  index('idx_appointments_first_time').on(table.isFirstTime),
]);


// Esquemas Zod para validación
export const insertAppointmentsSchema = createInsertSchema(appointments);
export const selectAppointmentsSchema = createSelectSchema(appointments);

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

// Definir las relaciones desde Appointment
import { relations } from 'drizzle-orm/relations';

// Relaciones optimizadas para consultas de dashboard
export const appointmentRelations = relations(appointments, ({ one, many }) => ({
  // Relación con doctor
  doctor: one(doctors, {
    fields: [appointments.doctorId],
    references: [doctors.idDoctor],
  }),
  // Relación con paciente
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  // Relación con servicio médico
  service: one(medicalServices, {
    fields: [appointments.serviceId],
    references: [medicalServices.id],
  }),
  // Relación con organización
  organization: one(organization, {
    fields: [appointments.organizationId],
    references: [organization.id],
  }),
  // Relación de seguimiento - cita original
  originalAppointment: one(appointments, {
    fields: [appointments.followUpOfId],
    references: [appointments.id],
    relationName: 'appointmentFollowUp'
  }),
  // Relación de seguimiento - citas derivadas
  followUpAppointments: many(appointments, {
    relationName: 'appointmentFollowUp'
  }),
}));