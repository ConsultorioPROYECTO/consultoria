// src/db/schema/organization.ts 

import { mysqlTable, varchar, timestamp, index, int  } from 'drizzle-orm/mysql-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

/**
 * @typedef PlansTableSchema
 * @author Santiago Prada
 * @description Define la estructura de la tabla 'plans' en la base de datos MySQL.
 *
 * @property {number} id - Clave primaria autoincremental interna de la base de datos.
 * @property {string} name - Nombre del plan.
 * @property {string} description - Descripción del plan.
 * @property {number} price - Precio del plan.
 * @property {number} duration - Duración del plan.
 * @property {Date} createdAt - Timestamp de creación del registro.
 * @property {Date} updatedAt - Timestamp de la última actualización.
 */

export const plans = mysqlTable('plans', {
    id: int('id', { unsigned : true}).autoincrement().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 255 }),
    price: int('price').notNull(),
    duration: int('duration').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (plan) => [
    index('plan_name_idx').on(plan.name),
]);

export const insertPlansSchema = createInsertSchema(plans);
export const selectPlansSchema = createSelectSchema(plans);

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
