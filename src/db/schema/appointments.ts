// src/db/schema/appointments.ts 

import { mysqlTable, varchar, timestamp, serial, index, date as mysqlDate, int, mysqlEnum, text, boolean } from 'drizzle-orm/mysql-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { doctors } from './doctors'; // Importar el esquema de doctors
import { patients } from './patients'; // Importar el esquema de patients
import { medicalServices } from './medical_services'; // Importar el esquema de medical_services
import { organization } from './organization'; // Importar el esquema de organization

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
 * @property {string} time - Tiempo en formato hora HH:MM (ej. 14:30).
 * @property {enum} status - Estado de la cita enum("Confirmada", "Completada", "Pendiente", "Llegó", "Cancelada"). 
 * @property {Date} date - Fecha de la cita.
 * @property {text} notes - Notas de la cita.
 * @property {text} cancelReason - Razón de cancelación (si aplica).
 * @property {boolean} reminderSent - Si se envió recordatorio.
 * @property {string} patientName - Nombre del paciente (TEMPORAL - mantener para compatibilidad).
 * @property {string} service - Descripción del servicio (TEMPORAL - mantener para compatibilidad).
 * @property {string} google_event_id - ID del evento en Google Calendar.
 * @property {string} google_calendar_id - ID del calendario donde está el evento.
 * @property {enum} sync_status - Estado de sincronización con Google Calendar.
 * @property {Date} last_sync_attempt - Último intento de sincronización.
 * @property {text} sync_error - Detalles del error si falla la sincronización.
 * @property {number} duration_minutes - Duración de la cita en minutos.
 * @property {boolean} is_virtual - Si la cita es virtual.
 * @property {string} meeting_link - Enlace de la reunión virtual.
 * @property {Date} createdAt - Timestamp de creación del registro.
 * @property {Date} updatedAt - Timestamp de la última actualización.
 */
export const appointments = mysqlTable('appointments', {
  id: serial('id').primaryKey(),

  // --- Claves foráneas ---
  doctorId: int('doctor_id').references(() => doctors.idDoctor, { onDelete: 'cascade' , onUpdate : 'cascade'}).notNull(),
  patientId: int('patient_id').references(() => patients.id, { onDelete: 'cascade', onUpdate: 'cascade' }), // Opcional por compatibilidad
  serviceId: int('service_id').references(() => medicalServices.id, { onDelete: 'set null', onUpdate: 'cascade' }), // Opcional por compatibilidad
  organizationId: int('organization_id').references(()=> organization.id, {onDelete: "cascade", onUpdate: "cascade"}).notNull(),


  // --- Campos específicos de la cita ---
  time: varchar('time', { length: 12 }).notNull(), // Formato HH:MM AM/PM
  status: mysqlEnum('status',["Confirmada", "Completada", "Pendiente", "Llegó", "Cancelada"]).default("Pendiente").notNull(),
  date: mysqlDate('date').notNull(),
  
  // --- Campos adicionales ---
  notes: text('notes'), // Notas de la cita
  cancelReason: text('cancel_reason'), // Razón de cancelación
  reminderSent: boolean('reminder_sent').default(false).notNull(), // Si se envió recordatorio
  
  // --- Campos temporales para compatibilidad (DEPRECATED) ---
  patientName: varchar('patient_name', { length: 255 }), // TEMPORAL - usar patientId en su lugar
  service: varchar('service', { length: 255 }), // TEMPORAL - usar serviceId en su lugar

  // --- Campos de sincronización con Google Calendar ---
  google_event_id: varchar('google_event_id', { length: 255 }), // ID del evento en Google Calendar
  google_calendar_id: varchar('google_calendar_id', { length: 255 }), // ID del calendario donde está el evento
  sync_status: mysqlEnum('sync_status', ['pending', 'synced', 'failed', 'not_synced']).default('pending').notNull(),
  last_sync_attempt: timestamp('last_sync_attempt'),
  sync_error: text('sync_error'), // Detalles del error si falla la sincronización
  
  // --- Campos adicionales para mejor gestión ---
  duration_minutes: int('duration_minutes').default(30).notNull(),
  is_virtual: boolean('is_virtual').default(false).notNull(),
  meeting_link: varchar('meeting_link', { length: 500 }),

  // --- Timestamps ---
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => [
  // Índices para mejorar el rendimiento de las búsquedas
  index('appointment_doctor_id_idx').on(table.doctorId),
  index('appointment_patient_id_idx').on(table.patientId),
  index('appointment_service_id_idx').on(table.serviceId),
  index('appointment_organization_id_idx').on(table.organizationId),
  index('appointment_time_idx').on(table.time),
  index('appointment_date_idx').on(table.date),
  index('appointment_status_idx').on(table.status),
  index('appointment_date_time_idx').on(table.date, table.time), // Índice compuesto para búsquedas por fecha y hora
  
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