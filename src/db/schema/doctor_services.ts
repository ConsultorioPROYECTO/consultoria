// src/db/schema/doctor_services.ts

import { pgTable, integer, numeric, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { doctors } from './doctors';
import { medicalServices } from './medical_services';

/**
 * @typedef DoctorServiceTableSchema
 * @author Santiago Prada
 * @description Define la relación muchos-a-muchos entre doctores y servicios médicos.
 * Permite que un doctor ofrezca múltiples servicios y que un servicio sea ofrecido por múltiples doctores.
 *
 * @property {number} id - Clave primaria autoincremental única.
 * @property {number} doctorId - Clave foránea a la tabla 'doctors'.
 * @property {number} serviceId - Clave foránea a la tabla 'medical_services'.
 * @property {numeric} customPrice - Precio personalizado para este doctor (opcional, si difiere del precio base).
 * @property {boolean} isAvailable - Si el doctor está disponible para ofrecer este servicio.
 * @property {Date} createdAt - Timestamp de cuándo se asignó el servicio al doctor.
 * @property {Date} updatedAt - Timestamp de la última actualización.
 */
export const doctorServices = pgTable('doctor_services', {
  // Clave primaria autoincremental
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),

  // Claves foráneas
  doctorId: integer('doctor_id').references(() => doctors.idDoctor, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
  serviceId: integer('service_id').references(() => medicalServices.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),

  // Campos adicionales
  customPrice: numeric('custom_price', { precision: 10, scale: 2 }), // Precio personalizado (opcional)
  isAvailable: boolean('is_available').default(true).notNull(), // Si el doctor está disponible para este servicio

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  // Índice único compuesto para evitar duplicados
  uniqueIndex('doctor_services_unique_idx').on(table.doctorId, table.serviceId),
  // Índices para mejorar el rendimiento
  index('doctor_services_doctor_id_idx').on(table.doctorId),
  index('doctor_services_service_id_idx').on(table.serviceId),
  index('doctor_services_available_idx').on(table.isAvailable),
]);

// Esquemas Zod para validación
export const insertDoctorServiceSchema = createInsertSchema(doctorServices);
export const selectDoctorServiceSchema = createSelectSchema(doctorServices);

export type DoctorService = typeof doctorServices.$inferSelect;
export type NewDoctorService = typeof doctorServices.$inferInsert;

// Definir las relaciones
import { relations } from 'drizzle-orm/relations';

export const doctorServiceRelations = relations(doctorServices, ({ one }) => ({
  // Relación con doctor
  doctor: one(doctors, {
    fields: [doctorServices.doctorId],
    references: [doctors.idDoctor],
  }),
  // Relación con servicio médico
  service: one(medicalServices, {
    fields: [doctorServices.serviceId],
    references: [medicalServices.id],
  }),
}));
