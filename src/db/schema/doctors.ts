// src/db/schema/users.ts (o donde definas tus esquemas de Drizzle)

import { mysqlTable, varchar, timestamp, index, int } from 'drizzle-orm/mysql-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'; // Para validación con Zod

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
  userId: varchar('user_id', { length: 255 }).notNull().unique(), // Muy importante: único y notNull

  // --- Campos específicos de tu doctor ---
  speciality: varchar('speciality', { length: 255 }).notNull(), // Especialidad del doctor
  calendar_id: varchar('calendar_id', { length: 255 }).notNull(), // ID del calendario del doctor
  privatePhone: varchar('private_phone', { length: 255 }).notNull(), // Número de teléfono privado del doctor
  nitId: varchar('nit_id', { length: 255 }).notNull(), // NIT del doctor
  availability: varchar('availability', { length: 255 }).notNull(), // Disponibilidad del doctor
  tokenGoogleId: varchar('token_google_id', { length: 255 }).notNull(), // Token de Google
 
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

export type User = typeof doctors.$inferSelect; // Tipo para seleccionar usuarios
export type NewUser = typeof doctors.$inferInsert; // Tipo para insertar nuevos usuarios