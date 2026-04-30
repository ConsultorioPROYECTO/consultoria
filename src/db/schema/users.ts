// src/db/schema/users.ts (o donde definas tus esquemas de Drizzle)

import { pgTable, varchar, timestamp, text, boolean, index, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'; // Para validacion con Zod
import { relations } from 'drizzle-orm/relations';
import { organization } from './organization';
import { userRole } from './enums';

/**
 * @typedef UserTableSchema
 * @author Santiago Prada
 * @description Define la estructura de la tabla 'users' en la base de datos PostgreSQL.
 *
 * @property {number} id - Clave primaria autoincremental interna de la base de datos.
 * @property {string} firebaseUid - El UID unico proporcionado por Firebase Auth. Este sera el enlace principal. Longitud 255 por si acaso, aunque suelen ser mas cortos. Es CRITICO que sea unico.
 * @property {string | null} email - Correo electronico del usuario, obtenido de Firebase. Puede ser nulo si Firebase lo permite (ej. login anonimo, aunque no es nuestro caso aqui).
 * @property {boolean} emailVerified - Si el email ha sido verificado (segun Firebase).
 * @property {string | null} phoneNumber - Numero de telefono del usuario (formato E.164), de Firebase.
 * @property {string | null} displayName - Nombre para mostrar del usuario, de Firebase.
 * @property {string | null} photoURL - URL de la foto de perfil del usuario, de Firebase.
 * @property {string | null} providerId - El proveedor de autenticacion principal (ej. 'google.com', 'password').
 * @property {pgEnum} role - Rol del usuario en tu aplicacion (ej. 'user', 'admin', 'editor'). Default 'N/A'.
 * @property {Date} createdAt - Timestamp de cuando se creo el registro en TU base de datos.
 * @property {Date} updatedAt - Timestamp de la ultima actualizacion del registro en TU base de datos.
 * @property {Date | null} lastLoginAt - Timestamp del ultimo inicio de sesion del usuario (actualizado por tu logica).
 * @property {boolean} isActive - Para desactivar usuarios sin eliminarlos. Default true.
 *
 * @todo Considerar anadir campos especificos de la aplicacion, como:
 * - `preferences` (JSON o TEXT)
 * - `organizationId` (si tienes multi-tenancy)
 * - `subscriptionStatus` (si tienes planes de suscripcion)
 */
export const users = pgTable('users', {
  // Clave primaria interna de la BD (opcional si firebaseUid es tu PK, pero recomendable tener una PK numerica simple)
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),

  // --- Campos de Firebase Auth ---
  firebaseUid: varchar('firebase_uid', { length: 255 }).notNull().unique(), // Muy importante: unico y notNull
  email: varchar('email', { length: 255 }), // Puede ser nulo si el proveedor no lo da, o si permites usuarios sin email.
  emailVerified: boolean('email_verified').default(false),
  phoneNumber: varchar('phone_number', { length: 50 }), // Longitud 50 deberia ser suficiente para E.164 + algunos caracteres extra. Nullable.
  displayName: varchar('display_name', { length: 255 }),
  photoURL: text('photo_url'), // `text` para URLs potencialmente largas
  providerId: varchar('provider_id', { length: 50 }), // ej: 'google.com', 'password', 'phone'

  // --- Campos especificos de tu aplicacion ---
  role: userRole('role').default('N/A').notNull(), //'admin', 'medico', 'asistente', 'N/A'
  isActive: boolean('is_active').default(true).notNull(),
  organizationId: integer('organization_id').references(()=> organization.id, {onDelete: "cascade", onUpdate: "cascade"}),
  lastLoginAt: timestamp('last_login_at', { mode: 'date' }),

  // --- Timestamps ---
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  // Indices para mejorar el rendimiento de las busquedas
  index('firebase_uid_idx').on(table.firebaseUid),
  index('email_idx').on(table.email), // Si buscas frecuentemente por email
  index('role_idx').on(table.role),   // Si filtras por rol
  index('phone_number_idx').on(table.phoneNumber),
]);

// Esquemas Zod para validacion (opcional pero muy recomendado)
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

// Relaciones
export const userRelations = relations(users, ({ one }) => ({
  organization: one(organization, {
    fields: [users.organizationId],
    references: [organization.id]
  })
}));

export type User = typeof users.$inferSelect; // Tipo para seleccionar usuarios
export type NewUser = typeof users.$inferInsert; // Tipo para insertar nuevos usuarios
