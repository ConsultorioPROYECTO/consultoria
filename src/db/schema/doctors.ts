// src/db/schema/users.ts (o donde definas tus esquemas de Drizzle)

import { pgTable, varchar, timestamp, index, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'; // Para validacion con Zod
import { users } from './users';
import { appointments, type Appointment } from './appointments';
import { relations } from 'drizzle-orm/relations';

/**
 * @typedef UserTableSchema
 * @author Santiago Prada
 * @description Define la estructura de la tabla 'users' en la base de datos PostgreSQL.
 *
 * @property {int} idDoctor - Clave primaria autoincremental interna de la base de datos.
 * @property { reference } userId - Clave foranea a la tabla 'users' para relacionar con el usuario.
 * @property { string } speciality - Especialidad del doctor.
 * @property { string } calendar_id - ID del calendario del doctor.
 * @property { string } privatePhone - Numero de telefono privado del doctor.
 * @property { string } nitId - NIT del doctor.
 * @property { string } availability - Disponibilidad del doctor.
 * @property { string } tokenGoogleId - Token de Google.
 * @property { Date } createdAt - Timestamp de cuando se creo el registro en TU base de datos.
 * @property { Date } updatedAt - Timestamp de la ultima actualizacion del registro en TU base de datos.


 *
 * @todo Considerar anadir campos especificos de la aplicacion, como:
 * - `preferences` (JSON o TEXT)
 * - `organizationId` (si tienes multi-tenancy)
 * - `subscriptionStatus` (si tienes planes de suscripcion)
 */
export const doctors = pgTable('doctors', {
  // Clave primaria interna de la BD (opcional si firebaseUid es tu PK, pero recomendable tener una PK numerica simple)
  idDoctor: integer('id').generatedAlwaysAsIdentity().primaryKey(),

  // ----- Referencia a la tabla users -----
  userId: integer('user_id').references(() => users.id, {onDelete: "cascade", onUpdate: "cascade"}).notNull().unique(), // Clave foranea a la tabla users,

  // --- Campos especificos de tu doctor ---
  speciality: varchar('speciality', { length: 255 }).notNull(), // Especialidad del doctor
  calendar_id: varchar('calendar_id', { length: 255 }), // ID del calendario del doctor
  privatePhone: varchar('private_phone', { length: 255 }).notNull(), // Numero de telefono privado del doctor
  nitId: varchar('nit_id', { length: 255 }).notNull(), // NIT del doctor
  tokenGoogleId: varchar('token_google_id', { length: 255 }).notNull(), // Token de Google

  // --- Campos de Google Calendar ---
  calendar_timezone: varchar('calendar_timezone', { length: 50 }).default('America/Bogota').notNull(),
  calendar_color: varchar('calendar_color', { length: 7 }).default('#1976D2').notNull(), // Hex color
  calendar_sync_enabled: boolean('calendar_sync_enabled').default(true).notNull(),
  last_calendar_sync: timestamp('last_calendar_sync', { mode: 'date' }),
  calendar_settings: jsonb('calendar_settings'), // Configuraciones especificas del calendario

  // --- Configuracion de disponibilidad mejorada ---
  working_hours: jsonb('working_hours'), // Horarios detallados por dia
  appointment_duration: integer('appointment_duration').default(30).notNull(), // Duracion por defecto en minutos

  // --- Timestamps ---
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  // Indices para mejorar el rendimiento de las busquedas
  index('doctors_user_id_idx').on(table.userId),
]);

// Esquemas Zod para validacion (opcional pero muy recomendado)
export const insertDoctorsSchema = createInsertSchema(doctors);
export const selectDoctorsSchema = createSelectSchema(doctors);

export type Doctor = typeof doctors.$inferSelect; // Tipo para seleccionar medicos
export type NewDoctor = typeof doctors.$inferInsert; // Tipo para insertar nuevos medicos

// Definir las relaciones
import { doctorServices } from './doctor_services';

export const doctorRelations = relations(doctors, ({ many, one }) => ({
  // Un doctor tiene muchas citas
  appointments: many(appointments),
  // Un doctor puede ofrecer muchos servicios
  doctorServices: many(doctorServices),
  // Un doctor pertenece a un usuario
  user: one(users, {
    fields: [doctors.userId],
    references: [users.id],
  }),
}));

// Opcional: Tipos inferidos para usar en tu aplicacion
export type DoctorWithAppointments = Doctor & {
  appointments: Appointment[];
};
