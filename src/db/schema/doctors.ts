// src/db/schema/users.ts (o donde definas tus esquemas de Drizzle)

import { mysqlTable, varchar, timestamp, index, int, json, boolean } from 'drizzle-orm/mysql-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'; // Para validación con Zod
import { users } from './users';
import { appointments, type Appointment } from './appointments';
import { relations } from 'drizzle-orm/relations';

/**
 * @typedef UserTableSchema
 * @author Santiago Prada
 * @description Define la estructura de la tabla 'users' en la base de datos MySQL.
 *
 * @property {int} idDoctor - Clave primaria autoincremental interna de la base de datos.
 * @property { reference } userId - Clave foránea a la tabla 'users' para relacionar con el usuario.
 * @property { string } speciality - Especialidad del doctor.
 * @property { string } calendar_id - ID del calendario del doctor.
 * @property { string } privatePhone - Número de teléfono privado del doctor.
 * @property { string } nitId - NIT del doctor.
 * @property { string } availability - Disponibilidad del doctor.
 * @property { string } tokenGoogleId - Token de Google.
 * @property { Date } createdAt - Timestamp de cuándo se creó el registro en TU base de datos.
 * @property { Date } updatedAt - Timestamp de la última actualización del registro en TU base de datos.
 
 *
 * @todo Considerar añadir campos específicos de la aplicación, como:
 * - `preferences` (JSON o TEXT)
 * - `organizationId` (si tienes multi-tenancy)
 * - `subscriptionStatus` (si tienes planes de suscripción)
 */
export const doctors = mysqlTable('doctors', {
  // Clave primaria interna de la BD (opcional si firebaseUid es tu PK, pero recomendable tener una PK numérica simple)
  idDoctor: int('id').autoincrement().primaryKey(),

  // ----- Referencia a la tabla users -----
  userId: int('user_id').references(() => users.id,{onDelete: "cascade", onUpdate: "cascade"}).notNull().unique(), // Clave foránea a la tabla users,

  // --- Campos específicos de tu doctor ---
  speciality: varchar('speciality', { length: 255 }).notNull(), // Especialidad del doctor
  calendar_id: varchar('calendar_id', { length: 255 }), // ID del calendario del doctor
  privatePhone: varchar('private_phone', { length: 255 }).notNull(), // Número de teléfono privado del doctor
  nitId: varchar('nit_id', { length: 255 }).notNull(), // NIT del doctor
  tokenGoogleId: varchar('token_google_id', { length: 255 }).notNull(), // Token de Google
  
  // --- Campos de Google Calendar ---
  calendar_timezone: varchar('calendar_timezone', { length: 50 }).default('America/Bogota').notNull(),
  calendar_color: varchar('calendar_color', { length: 7 }).default('#1976D2').notNull(), // Hex color
  calendar_sync_enabled: boolean('calendar_sync_enabled').default(true).notNull(),
  last_calendar_sync: timestamp('last_calendar_sync'),
  calendar_settings: json('calendar_settings'), // Configuraciones específicas del calendario
  
  // --- Configuración de disponibilidad mejorada ---
  working_hours: json('working_hours'), // Horarios detallados por día
  appointment_duration: int('appointment_duration').default(30).notNull(), // Duración por defecto en minutos
 
  // --- Timestamps ---
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(), // Se actualiza automáticamente en cada UPDATE
}, (table) => [
  // Índices para mejorar el rendimiento de las búsquedas
  index('firebase_uid_idx').on(table.userId),
  index('email_idx').on(table.userId), // Si buscas frecuentemente por email
  index('phone_number_idx').on(table.userId),
]);

// Esquemas Zod para validación (opcional pero muy recomendado)
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

// Opcional: Tipos inferidos para usar en tu aplicación
export type DoctorWithAppointments = Doctor & {
  appointments: Appointment[];
};
