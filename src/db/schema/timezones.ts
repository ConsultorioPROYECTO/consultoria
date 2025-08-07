 // src/db/schema/timezones.ts

import { mysqlTable, varchar, text, int, index } from 'drizzle-orm/mysql-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { organization } from './organization';

/**
 * @typedef TimezoneTableSchema
 * @author Santiago Prada
 * @description Define la estructura de la tabla 'timezones' basada en los datos de IANA timezone database.
 *
 * @property {number} id - Clave primaria autoincremental.
 * @property {string} countryCodes - Códigos de países que usan este timezone (formato ISO 3166, separados por comas).
 * @property {string} coordinates - Latitud y longitud en formato ISO 6709 (±DDMM±DDDMM o ±DDMMSS±DDDMMSS).
 * @property {string} timezoneName - Nombre del timezone usado en la variable de entorno TZ (ej. 'America/New_York').
 * @property {string | null} comments - Comentarios adicionales, presente solo si un país tiene múltiples timezones.
 */
export const timezones = mysqlTable('timezones', {
  id: int('id',{unsigned : true}).autoincrement().primaryKey(),
  countryCodes: varchar('country_codes', { length: 100 }).notNull(), // Para múltiples códigos separados por comas
  coordinates: varchar('coordinates', { length: 50 }).notNull(), // Formato ±DDMM±DDDMM o ±DDMMSS±DDDMMSS
  timezoneName: varchar('timezone_name', { length: 100 }).notNull().unique(), // Ej: 'America/New_York'
  comments: text('comments'), // Comentarios opcionales
}, (table) => [
  // Índices para búsquedas frecuentes
  index('timezone_name_idx').on(table.timezoneName),
  index('country_codes_idx').on(table.countryCodes),
]);

// Esquemas de validación con Zod
export const insertTimezoneSchema = createInsertSchema(timezones);
export const selectTimezoneSchema = createSelectSchema(timezones);

// Relaciones
export const timezonesRelations = relations(timezones, ({ many }) => ({
  organizations: many(organization),
}));

// Tipos TypeScript
export type Timezone = typeof timezones.$inferSelect;
export type NewTimezone = typeof timezones.$inferInsert;