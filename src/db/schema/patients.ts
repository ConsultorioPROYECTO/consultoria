// src/db/schema/patients.ts

import { mysqlTable, varchar, timestamp, index, int, mysqlEnum, date as mysqlDate, text, boolean, unique } from 'drizzle-orm/mysql-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { organization } from './organization';

/**
 * @typedef PatientTableSchema
 * @author Santiago Prada
 * @description Define la estructura de la tabla 'patients' en la base de datos MySQL.
 *
 * @property {number} id - Clave primaria autoincremental interna de la base de datos.
 * @property {string} patientCode - Código único del paciente generado automáticamente.
 * @property {number|null} userId - Clave foránea a la tabla 'users' (opcional para pacientes no registrados).
 * @property {string} firstName - Nombre del paciente.
 * @property {string} lastName - Apellido del paciente.
 * @property {string} identificationType - Tipo de identificación (CC, TI, CE, etc.).
 * @property {string} identificationNumber - Número de identificación.
 * @property {Date|null} birthDate - Fecha de nacimiento.
 * @property {enum} gender - Género del paciente.
 * @property {string|null} phone - Número de teléfono principal.
 * @property {string|null} email - Correo electrónico.
 * @property {string|null} address - Dirección de residencia.
 * @property {string|null} emergencyContactName - Nombre del contacto de emergencia.
 * @property {string|null} emergencyContactPhone - Teléfono del contacto de emergencia.
 * @property {string|null} emergencyContactRelation - Relación con el contacto de emergencia.
 * @property {text|null} medicalHistory - Historia médica (JSON o texto).
 * @property {text|null} allergies - Alergias conocidas.
 * @property {text|null} currentMedications - Medicamentos actuales.
 * @property {string|null} bloodType - Tipo de sangre.
 * @property {number} organizationId - Clave foránea a la organización.
 * @property {boolean} isActive - Estado activo del paciente.
 * @property {Date} createdAt - Timestamp de creación del registro.
 * @property {Date} updatedAt - Timestamp de la última actualización.
 */
export const patients = mysqlTable('patients', {
  id: int('id').autoincrement().primaryKey(),
  
  // Información personal básica
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  identificationType: mysqlEnum('identification_type', ['CC', 'TI', 'CE', 'PP', 'RC', 'AS']).notNull(),
  identificationNumber: varchar('identification_number', { length: 50 }).notNull(),
  birthDate: mysqlDate('birth_date'),
  gender: mysqlEnum('gender', ['M', 'F', 'Other']).notNull(),
  
  // Información de contacto
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  
  // Contacto de emergencia
  emergencyContactName: varchar('emergency_contact_name', { length: 200 }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 20 }),
  emergencyContactRelation: varchar('emergency_contact_relation', { length: 50 }),
  
  // Información médica
  medicalHistory: text('medical_history'), // Se puede usar JSON si se necesita estructura
  allergies: text('allergies'),
  currentMedications: text('current_medications'),
  bloodType: mysqlEnum('blood_type', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  
  // Organización a la que pertenece
  organizationId: int('organization_id').references(() => organization.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
  
  // Estado
  isActive: boolean('is_active').default(true).notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => [
  // Índices para mejorar el rendimiento
  index('patient_organization_id_idx').on(table.organizationId),
  index('patient_name_idx').on(table.firstName, table.lastName),
  index('patient_email_idx').on(table.email),
  index('patient_phone_idx').on(table.phone),
  // Índice único compuesto para evitar duplicados de identificación
  unique('patient_identification_unique').on(table.identificationType, table.identificationNumber),
]);

// Esquemas Zod para validación
export const insertPatientSchema = createInsertSchema(patients);
export const selectPatientSchema = createSelectSchema(patients);

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;

// Definir las relaciones
import { relations } from 'drizzle-orm/relations';
import { appointments } from './appointments';

export const patientRelations = relations(patients, ({ many, one }) => ({
  // Un paciente puede tener muchas citas
  appointments: many(appointments),
  // Un paciente pertenece a una organización
  organization: one(organization, {
    fields: [patients.organizationId],
    references: [organization.id],
  }),
}));