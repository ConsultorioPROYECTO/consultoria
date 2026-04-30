// src/db/schema/organization.ts

import { pgTable, varchar, timestamp, index, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { plans } from './plans';
import { type z } from 'zod';

/**
 * @typedef AppointmentTableSchema
 * @author Santiago Prada
 * @description Define la estructura de la tabla 'organization' en la base de datos PostgreSQL.
 *
 * @property {number} id - Clave primaria autoincremental interna de la base de datos.
 * @property {string} name - Nombre de la organizacion.
 * @property {string} invitationCode - Codigo de invitacion para la organizacion. (obsoleto, sin uso, previo a ser eliminado.)
 * @property {string} address - Direccion de la organizacion.
 * @property {string} phone - Numero de telefono de la organizacion.
 * @property {string} email - Correo electronico de la organizacion.
 * @property {string} nit - NIT de la organizacion.
 * @property {string} logo - Logo de la organizacion.
 * @property {string} timezone - Zona horaria de la organizacion.
 * @property {string} currency - Moneda de la organizacion.
 * @property {Date} createdAt - Timestamp de creacion del registro.
 * @property {Date} updatedAt - Timestamp de la ultima actualizacion.
 */

export const organization = pgTable('organization', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  invitationCode: varchar('invitation_code', { length: 6 }).unique().notNull(),
  address: varchar('address', { length: 255 }),
  phone: varchar('phone', { length: 15 }),
  email: varchar('email', { length: 255 }),
  nit: varchar('nit', { length: 45 }),
  logo: varchar('logo', { length: 255 }),
  timezone: varchar('timezone', { length: 40 }),
  currency: varchar('currency', { length: 40 }),
  planId: integer('plan_id').references(() => plans.id, {onDelete : "no action", onUpdate : "cascade"}),
  instanceId: varchar('instance_id', { length: 25 }),
  apiKey: varchar('api_key', { length: 25 }),
  r2BucketName: varchar('r2_bucket_name', { length: 255 }).unique(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (organization) => [
    index('organization_name_idx').on(organization.name),
    index('organization_email_idx').on(organization.email),
    index('organization_phone_idx').on(organization.phone),
    index('organization_nit_idx').on(organization.nit),
    index('organization_invitation_code_idx').on(organization.invitationCode),
    index('organization_plan_id_idx').on(organization.planId),
    index('organization_instance_id_idx').on(organization.instanceId),
    index('organization_api_key_idx').on(organization.apiKey),
]);

export const insertOrganizationSchema = createInsertSchema(organization);
export const selectOrganizationSchema = createSelectSchema(organization);

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = z.infer<typeof insertOrganizationSchema>;
