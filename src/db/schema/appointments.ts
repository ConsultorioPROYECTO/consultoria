// src/db/schema/appointments.ts 

import { mysqlTable, varchar, timestamp, serial, index, int, mysqlEnum, text } from 'drizzle-orm/mysql-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { doctors } from './doctors'; // Importar el esquema de doctors
import { patients } from './patients'; // Importar el esquema de patients
import { medicalServices } from './medical_services'; // Importar el esquema de medical_services
import { organization } from './organization'; // Importar el esquema de organization
import { APPOINTMENT_STATUS, SYNC_STATUS } from '@/types/appointment-status';

/**
 * @typedef AppointmentTableSchema
 * @author Santiago Prada
 * @description Define la estructura de la tabla 'appointments' en la base de datos MySQL.
 *
 * @property {number} id - Clave primaria autoincremental interna de la base de datos.
 * @property {number} doctorId - Clave foránea a la tabla 'doctors'.
 * @property {number} patientId - Clave foránea a la tabla 'patients'.
 * @property {number} serviceId - Clave foránea a la tabla 'medical_services'.
 * @property {number} organizationId - Clave foránea a la tabla 'organization'.
 
 * @property {enum} status - Estado de la cita: 'pending' | 'accepted' | 'attended' | 'rejected' | 'canceled'
 * @property {string} google_event_id - ID del evento en Google Calendar.
 * @property {string} google_calendar_id - ID del calendario donde está el evento.
 * @property {enum} sync_status - Estado de sincronización: 'pending' | 'synced' | 'failed' | 'not_synced'
 * @property {Date} last_sync_attempt - Último intento de sincronización.
 * @property {text} sync_error - Detalles del error si falla la sincronización.
 
 * @property {Date} createdAt - Timestamp de creación del registro.
 * @property {Date} updatedAt - Timestamp de la última actualización.
 */
export const appointments = mysqlTable('appointments', {
  id: serial('id').primaryKey(),

  // --- Claves foráneas ---
  doctorId: int('doctor_id').references(() => doctors.idDoctor, { onDelete: 'cascade' , onUpdate : 'cascade'}).notNull(),
  patientId: int('patient_id').references(() => patients.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  serviceId: int('service_id').references(() => medicalServices.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  organizationId: int('organization_id').references(()=> organization.id, {onDelete: "cascade", onUpdate: "cascade"}).notNull(),

  // --- Campos de sincronización con Google Calendar ---
  google_event_id: varchar('google_event_id', { length: 255 }).notNull(),
  google_calendar_id: varchar('google_calendar_id', { length: 255 }).notNull(),
  status: mysqlEnum('status', Object.values(APPOINTMENT_STATUS) as [string, ...string[]]).default(APPOINTMENT_STATUS.PENDING).notNull(),
  sync_status: mysqlEnum('sync_status', Object.values(SYNC_STATUS) as [string, ...string[]]).default(SYNC_STATUS.PENDING).notNull(),
  last_sync_attempt: timestamp('last_sync_attempt'),
  sync_error: text('sync_error'),

  // --- Timestamps ---
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => [
  // Índices para mejorar el rendimiento de las búsquedas
  index('appointment_doctor_id_idx').on(table.doctorId),
  index('appointment_patient_id_idx').on(table.patientId),
  index('appointment_service_id_idx').on(table.serviceId),
  index('appointment_organization_id_idx').on(table.organizationId),
  index('appointment_status_idx').on(table.status),
  
  // Índices para Google Calendar
  index('appointment_google_event_id_idx').on(table.google_event_id),
  index('appointment_google_calendar_id_idx').on(table.google_calendar_id),
  index('appointment_sync_status_idx').on(table.sync_status),
]);


// Esquemas Zod para validación
export const insertAppointmentsSchema = createInsertSchema(appointments);
export const selectAppointmentsSchema = createSelectSchema(appointments);

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

// Definir las relaciones desde Appointment
import { relations } from 'drizzle-orm/relations';

export const appointmentRelations = relations(appointments, ({ one }) => ({
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
}));