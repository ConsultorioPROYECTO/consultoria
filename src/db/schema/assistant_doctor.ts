import { pgTable, integer, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { assistants } from './assistants';
import { doctors } from './doctors';

/**
 * @typedef AssistantDoctorTableSchema
 * @author Santiago Prada
 * @description Define la estructura de la tabla 'assistant_doctor' en la base de datos PostgreSQL.
 * Esta tabla gestiona la relación muchos-a-muchos entre asistentes y doctores.
 *
 * @property {number} id - Clave primaria autoincremental interna de la base de datos.
 * @property {number} assistantId - Clave foránea a la tabla 'assistants'.
 * @property {number} doctorId - Clave foránea a la tabla 'doctors'.
 * @property {Date} createdAt - Timestamp de creación del registro.
 * @property {Date} updatedAt - Timestamp de la última actualización.
 */
export const assistantDoctor = pgTable('assistant_doctor', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  assistantId: integer('assistant_id').references(() => assistants.idAssistant, { onDelete: 'cascade' }).notNull(),
  doctorId: integer('doctor_id').references(() => doctors.idDoctor, { onDelete: 'cascade' }).notNull(),
  // Timestamps para auditoría
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  // Índice único combinado para evitar duplicados
  uniqueIndex('assistant_doctor_unique_idx').on(table.assistantId, table.doctorId),
  // Índices individuales para mejorar consultas por assistantId y doctorId
  index('assistant_doctor_assistant_id_idx').on(table.assistantId),
  index('assistant_doctor_doctor_id_idx').on(table.doctorId),
]);

// Esquemas Zod para validación
export const insertAssistantDoctorSchema = createInsertSchema(assistantDoctor);
export const selectAssistantDoctorSchema = createSelectSchema(assistantDoctor);

export type AssistantDoctor = typeof assistantDoctor.$inferSelect;
export type NewAssistantDoctor = typeof assistantDoctor.$inferInsert;
