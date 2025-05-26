// src/db/schema/medical_services.ts

import { mysqlTable, varchar, timestamp, index, int, decimal, boolean, text } from 'drizzle-orm/mysql-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { organization } from './organization';

/**
 * @typedef MedicalServiceTableSchema
 * @author Santiago Prada
 * @description Define la estructura de la tabla 'medical_services' en la base de datos MySQL.
 *
 * @property {number} id - Clave primaria autoincremental interna de la base de datos.
 * @property {string} name - Nombre del servicio médico.
 * @property {string} description - Descripción detallada del servicio.
 * @property {string} code - Código único del servicio (ej. CUPS, internal code).
 * @property {number} durationMinutes - Duración estimada del servicio en minutos.
 * @property {decimal} basePrice - Precio base del servicio.
 * @property {string} category - Categoría del servicio (Consulta, Procedimiento, etc.).
 * @property {boolean} requiresPreparation - Si el servicio requiere preparación previa.
 * @property {text} preparationInstructions - Instrucciones de preparación.
 * @property {number} organizationId - Clave foránea a la organización.
 * @property {boolean} isActive - Estado activo del servicio.
 * @property {Date} createdAt - Timestamp de creación del registro.
 * @property {Date} updatedAt - Timestamp de la última actualización.
 */
export const medicalServices = mysqlTable('medical_services', {
  id: int('id').autoincrement().primaryKey(),
  
  // Información básica del servicio
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  code: varchar('code', { length: 50 }).notNull().unique(), // Código único del servicio
  
  // Detalles operativos
  durationMinutes: int('duration_minutes').notNull().default(30), // Duración en minutos
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull().default('0.00'),
  category: varchar('category', { length: 100 }).notNull(), // Consulta, Procedimiento, Examen, etc.
  
  // Preparación y requisitos
  requiresPreparation: boolean('requires_preparation').default(false).notNull(),
  preparationInstructions: text('preparation_instructions'),
  
  // Organización
  organizationId: int('organization_id').references(() => organization.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
  
  // Estado
  isActive: boolean('is_active').default(true).notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => [
  // Índices para mejorar el rendimiento
  index('service_code_idx').on(table.code),
  index('service_organization_id_idx').on(table.organizationId),
  index('service_name_idx').on(table.name),
  index('service_category_idx').on(table.category),
  index('service_active_idx').on(table.isActive),
]);

// Esquemas Zod para validación
export const insertMedicalServiceSchema = createInsertSchema(medicalServices);
export const selectMedicalServiceSchema = createSelectSchema(medicalServices);

export type MedicalService = typeof medicalServices.$inferSelect;
export type NewMedicalService = typeof medicalServices.$inferInsert;

// Definir las relaciones
import { relations } from 'drizzle-orm/relations';
import { doctorServices } from './doctor_services';
import { appointments } from './appointments';

export const medicalServiceRelations = relations(medicalServices, ({ many, one }) => ({
  // Un servicio puede ser ofrecido por muchos doctores
  doctorServices: many(doctorServices),
  // Un servicio puede tener muchas citas
  appointments: many(appointments),
  // Un servicio pertenece a una organización
  organization: one(organization, {
    fields: [medicalServices.organizationId],
    references: [organization.id],
  }),
}));