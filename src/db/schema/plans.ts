// src/db/schema/plans.ts 

import { mysqlTable, varchar, timestamp, index, int, json, boolean } from 'drizzle-orm/mysql-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

/**
 * @typedef PlansTableSchema
 * @author Santiago Prada
 * @description Define la estructura de la tabla 'plans' en la base de datos MySQL.
 *
 * @property {number} id - Clave primaria autoincremental interna de la base de datos.
 * @property {string} name - Nombre del plan.
 * @property {string} description - Descripción del plan.
 * @property {number} priceMonthly - Precio mensual del plan.
 * @property {number} priceAnnually - Precio anual total del plan.
 * @property {string[]} features - Lista de características principales del plan.
 * @property {string} tokenLimit - Límite de tokens del plan.
 * @property {string} medicosLimit - Límite de médicos del plan.
 * @property {string} asistentesLimit - Límite de asistentes del plan.
 * @property {boolean} isPopular - Indica si el plan es popular (destacado).
 * @property {Date} createdAt - Timestamp de creación del registro.
 * @property {Date} updatedAt - Timestamp de la última actualización.
 */

export const plans = mysqlTable('plans', {
    id: int('id', { unsigned : true}).autoincrement().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 500 }),
    priceMonthly: int('price_monthly').notNull(),
    priceAnnually: int('price_annually').notNull(),
    features: json('features').$type<string[]>().notNull(),
    tokenLimit: varchar('token_limit', { length: 100 }).notNull(),
    medicosLimit: varchar('medicos_limit', { length: 100 }).notNull(),
    asistentesLimit: varchar('asistentes_limit', { length: 100 }).notNull(),
    isPopular: boolean('is_popular').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (plan) => [
    index('plan_name_idx').on(plan.name),
]);

export const insertPlansSchema = createInsertSchema(plans);
export const selectPlansSchema = createSelectSchema(plans);

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
