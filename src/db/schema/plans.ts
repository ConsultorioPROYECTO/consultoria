// src/db/schema/plans.ts

import { pgTable, varchar, timestamp, index, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

/**
 * @typedef PlansTableSchema
 * @author Santiago Prada
 * @description Define la estructura de la tabla 'plans' en la base de datos PostgreSQL.
 *
 * @property {number} id - Clave primaria autoincremental interna de la base de datos.
 * @property {string} name - Nombre del plan.
 * @property {string} description - Descripcion del plan.
 * @property {number} priceMonthly - Precio mensual del plan.
 * @property {number} priceAnnually - Precio anual total del plan.
 * @property {string[]} features - Lista de caracteristicas principales del plan.
 * @property {string} tokenLimit - Limite de tokens del plan.
 * @property {string} medicosLimit - Limite de medicos del plan.
 * @property {string} asistentesLimit - Limite de asistentes del plan.
 * @property {boolean} isPopular - Indica si el plan es popular (destacado).
 * @property {Date} createdAt - Timestamp de creacion del registro.
 * @property {Date} updatedAt - Timestamp de la ultima actualizacion.
 */

export const plans = pgTable('plans', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 500 }),
    priceMonthly: integer('price_monthly').notNull(),
    priceAnnually: integer('price_annually').notNull(),
    features: jsonb('features').$type<string[]>().notNull(),
    tokenLimit: varchar('token_limit', { length: 100 }).notNull(),
    medicosLimit: varchar('medicos_limit', { length: 100 }).notNull(),
    asistentesLimit: varchar('asistentes_limit', { length: 100 }).notNull(),
    isPopular: boolean('is_popular').default(false),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (plan) => [
    index('plan_name_idx').on(plan.name),
]);

export const insertPlansSchema = createInsertSchema(plans);
export const selectPlansSchema = createSelectSchema(plans);

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
