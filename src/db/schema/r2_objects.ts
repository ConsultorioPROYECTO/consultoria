// src/db/schema/r2_objects.ts

import { pgTable, integer, varchar, timestamp, index, text, boolean, bigint, jsonb, unique } from 'drizzle-orm/pg-core';
import { fileCategory, accessLevel } from "./enums";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { organization } from './organization';
import { patients } from './patients';
import { appointments } from './appointments';
import { doctors } from './doctors';
import { medicalServices } from './medical_services';
import { users } from './users';

/**
 * @typedef R2ObjectsTableSchema
 * @description Estructura de la tabla `r2_objects` para trackear archivos en Cloudflare R2 por organización y entidades del dominio.
 */
export const r2Objects = pgTable('r2_objects', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),

  // Identificadores del objeto en R2
  objectKey: varchar('object_key', { length: 500 }).notNull(),
  objectName: varchar('object_name', { length: 255 }).notNull(),
  contentType: varchar('content_type', { length: 100 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  fileHash: varchar('file_hash', { length: 64 }),

  // Referencias opcionales a entidades del sistema médico
  patientId: integer('patient_id').references(() => patients.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  appointmentId: integer('appointment_id').references(() => appointments.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  doctorId: integer('doctor_id').references(() => doctors.idDoctor, { onDelete: 'set null', onUpdate: 'cascade' }),
  medicalServiceId: integer('medical_service_id').references(() => medicalServices.id, { onDelete: 'set null', onUpdate: 'cascade' }),

  // Referencia obligatoria a organización
  organizationId: integer('organization_id').references(() => organization.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),

  // Metadatos adicionales
  fileCategory: fileCategory('file_category').notNull(),
  description: text('description'),
  tags: jsonb('tags'),

  // URLs de acceso temporal (cache)
  lastPresignedUrl: text('last_presigned_url'),
  presignedUrlExpiresAt: timestamp('presigned_url_expires_at', { mode: 'date' }),

  // Control de acceso y estado
  isActive: boolean('is_active').default(true).notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  accessLevel: accessLevel('access_level').default('private').notNull(),

  // Auditoría
  uploadedBy: integer('uploaded_by').references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
}, (table) => [
  // Índices para optimizar consultas
  index('idx_r2_objects_organization_id').on(table.organizationId),
  index('idx_r2_objects_patient_id').on(table.patientId),
  index('idx_r2_objects_appointment_id').on(table.appointmentId),
  index('idx_r2_objects_doctor_id').on(table.doctorId),
  index('idx_r2_objects_medical_service_id').on(table.medicalServiceId),
  index('idx_r2_objects_category').on(table.fileCategory),
  index('idx_r2_objects_uploaded_by').on(table.uploadedBy),
  index('idx_r2_objects_created_at').on(table.createdAt),
  index('idx_r2_objects_object_key').on(table.objectKey),
  index('idx_r2_objects_active').on(table.isActive),
  // Índice único: object_key único por organización
  unique('unique_object_key_org').on(table.objectKey, table.organizationId),
]);

export const insertR2ObjectSchema = createInsertSchema(r2Objects);
export const selectR2ObjectSchema = createSelectSchema(r2Objects);

export type R2Object = typeof r2Objects.$inferSelect;
export type NewR2Object = typeof r2Objects.$inferInsert;

// Relaciones
import { relations } from 'drizzle-orm/relations';

export const r2ObjectRelations = relations(r2Objects, ({ one }) => ({
  organization: one(organization, {
    fields: [r2Objects.organizationId],
    references: [organization.id],
  }),
  patient: one(patients, {
    fields: [r2Objects.patientId],
    references: [patients.id],
  }),
  appointment: one(appointments, {
    fields: [r2Objects.appointmentId],
    references: [appointments.id],
  }),
  doctor: one(doctors, {
    fields: [r2Objects.doctorId],
    references: [doctors.idDoctor],
  }),
  medicalService: one(medicalServices, {
    fields: [r2Objects.medicalServiceId],
    references: [medicalServices.id],
  }),
  uploadedByUser: one(users, {
    fields: [r2Objects.uploadedBy],
    references: [users.id],
  }),
}));
