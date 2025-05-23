// src/db/schema/appointments.ts (o donde definas tus esquemas de Drizzle)

import { mysqlTable, varchar, timestamp, serial, index, date as mysqlDate, int } from 'drizzle-orm/mysql-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { doctors } from './doctors'; // Importar el esquema de doctors

/**
 * @typedef AppointmentTableSchema
 * @author Santiago Prada
 * @description Define la estructura de la tabla 'appointments' en la base de datos MySQL.
 *
 * @property {number} idAppointment - Clave primaria autoincremental interna de la base de datos.
 * @property {number} doctorId - Clave foránea a la tabla 'doctors'.
 * @property {string} time - Tiempo en formato hora HH:MM (ej. 14:30).
 * @property {string} patientName - Nombre del paciente (temporalmente, luego se referenciará a 'patients').
 * @property {string} service - Descripción del servicio (temporalmente, luego se referenciará a 'services').
 * @property {Date} date - Fecha de la cita.
 * @property {Date} createdAt - Timestamp de creación del registro.
 * @property {Date} updatedAt - Timestamp de la última actualización.
 */
export const appointments = mysqlTable('appointments', {
  idAppointment: serial('id_appointment').primaryKey(),

  // --- Clave foránea para la relación con doctors ---
  doctorId: int('doctor_id').references(() => doctors.idDoctor, { onDelete: 'cascade' , onUpdate : 'cascade'}).notNull(),

  // --- Campos específicos de la cita ---
  time: varchar('time', { length: 5 }).notNull(), // Formato HH:MM
  patientName: varchar('patient_name', { length: 255 }).notNull(),
  service: varchar('service', { length: 255 }).notNull(),
  date: mysqlDate('date').notNull(),

  // --- Timestamps ---
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => [
  // Índices para mejorar el rendimiento de las búsquedas
  index('appointment_doctor_id_idx').on(table.doctorId),
  index('appointment_time_idx').on(table.time),
  index('appointment_date_idx').on(table.date),
]);


// Esquemas Zod para validación
export const insertAppointmentsSchema = createInsertSchema(appointments);
export const selectAppointmentsSchema = createSelectSchema(appointments);

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

// Definir la relación desde Appointment hacia Doctor
import { relations } from 'drizzle-orm/relations';

export const appointmentRelationsToDoctor = relations(appointments, ({ one }) => ({
  doctor: one(doctors, {
    fields: [appointments.doctorId],
    references: [doctors.idDoctor],
  }),
}));