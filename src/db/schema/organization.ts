// src/db/schema/organization.ts 

import { mysqlTable, varchar, timestamp, index, int  } from 'drizzle-orm/mysql-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

/**
 * @typedef AppointmentTableSchema
 * @author Santiago Prada
 * @description Define la estructura de la tabla 'organization' en la base de datos MySQL.
 *
 * @property {number} id - Clave primaria autoincremental interna de la base de datos.
 * @property {string} name - Nombre de la organización.
 * @property {string} invitationCode - Código de invitación para la organización.
 * @property {string} address - Dirección de la organización.
 * @property {string} phone - Número de teléfono de la organización.
 * @property {string} email - Correo electrónico de la organización.
 * @property {string} nit - NIT de la organización.
 * @property {string} logo - Logo de la organización.
 * @property {Date} createdAt - Timestamp de creación del registro.
 * @property {Date} updatedAt - Timestamp de la última actualización.
 */

export const organization = mysqlTable('organization', {
  id: int().autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  invitationCode: varchar('invitation_code', { length: 6 }).unique().notNull(),
  address: varchar('address', { length: 255 }),
  phone: varchar('phone', { length: 15 }),
  email: varchar('email', { length: 255 }),
  nit: varchar('nit', { length: 45 }),
  logo: varchar('logo', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (organization) => [
    index('organization_name_idx').on(organization.name),
    index('organization_email_idx').on(organization.email),
    index('organization_phone_idx').on(organization.phone),
    index('organization_nit_idx').on(organization.nit),
    index('organization_invitation_code_idx').on(organization.invitationCode),
  
]);

export const insertOrganizationSchema = createInsertSchema(organization);
export const selectOrganizationSchema = createSelectSchema(organization);

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;