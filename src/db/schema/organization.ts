// src/db/schema/organization.ts 

import { mysqlTable, varchar, timestamp, index, int  } from 'drizzle-orm/mysql-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { plans } from './plans';
import { timezones } from './timezones';

/**
 * @typedef AppointmentTableSchema
 * @author Santiago Prada
 * @description Define la estructura de la tabla 'organization' en la base de datos MySQL.
 *
 * @property {number} id - Clave primaria autoincremental interna de la base de datos.
 * @property {string} name - Nombre de la organización.
 * @property {string} invitationCode - Código de invitación para la organización. (obsoleto, sin uso, previo a ser eliminado.)
 * @property {string} address - Dirección de la organización.
 * @property {string} phone - Número de teléfono de la organización.
 * @property {string} email - Correo electrónico de la organización.
 * @property {string} nit - NIT de la organización.
 * @property {string} logo - Logo de la organización.
 * @property {number} timezoneId - ID de la zona horaria de la organización (referencia a tabla timezones).
 * @property {string} currency - Moneda de la organización.
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
  timezoneId: int('timezone_id', {unsigned : true}).references(() => timezones.id, {onDelete : "set null", onUpdate : "cascade"}),
  currency: varchar('currency', { length: 40 }),
  planId: int('plan_id', {unsigned : true}).references(() => plans.id, {onDelete : "no action", onUpdate : "cascade"}),
  instanceId: varchar('instance_id', { length: 25 }),
  apiKey: varchar('api_key', { length: 25 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (organization) => [
    index('organization_name_idx').on(organization.name),
    index('organization_email_idx').on(organization.email),
    index('organization_phone_idx').on(organization.phone),
    index('organization_nit_idx').on(organization.nit),
    index('organization_invitation_code_idx').on(organization.invitationCode),
    index('organization_plan_id_idx').on(organization.planId),
    index('organization_timezone_id_idx').on(organization.timezoneId),
    index('organization_instance_id_idx').on(organization.instanceId),
    index('organization_api_key_idx').on(organization.apiKey),
]);

// Relaciones
export const organizationRelations = relations(organization, ({ one }) => ({
  timezone: one(timezones, {
    fields: [organization.timezoneId],
    references: [timezones.id],
  }),
  plan: one(plans, {
    fields: [organization.planId],
    references: [plans.id],
  }),
}));

export const insertOrganizationSchema = createInsertSchema(organization);
export const selectOrganizationSchema = createSelectSchema(organization);

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;