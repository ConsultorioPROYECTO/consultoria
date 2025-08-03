// src/db/schema/contact_requests.ts

import { mysqlTable, varchar, timestamp, text, int } from 'drizzle-orm/mysql-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

/**
 * @typedef ContactRequestTableSchema
 * @author Santiago Prada
 * @description Define la estructura de la tabla 'contact_requests' para almacenar
 * las solicitudes de acceso enviadas desde el formulario de contacto de la landing page.
 *
 * @property {number} id - Clave primaria autoincremental.
 * @property {string} name - Nombre completo de la persona que solicita acceso.
 * @property {string} email - Correo electrónico de contacto.
 * @property {string} company - Empresa u organización del solicitante.
 * @property {string} message - Mensaje detallado sobre el interés en la plataforma.
 * @property {Date} createdAt - Timestamp de cuándo se creó la solicitud.
 * @property {Date} updatedAt - Timestamp de la última actualización del registro.
 */
export const contactRequests = mysqlTable('contact_requests', {
  // Clave primaria
  id: int('id').autoincrement().primaryKey(),

  // Campos del formulario de contacto
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }).notNull(),
  message: text('message').notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Esquemas de validación con Zod
export const insertContactRequestSchema = createInsertSchema(contactRequests);
export const selectContactRequestSchema = createSelectSchema(contactRequests);

// Tipos TypeScript inferidos
export type ContactRequest = typeof contactRequests.$inferSelect;
export type NewContactRequest = typeof contactRequests.$inferInsert;