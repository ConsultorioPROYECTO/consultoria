import { mysqlTable, int } from 'drizzle-orm/mysql-core';
import { assistants } from './assistants';
import { doctors } from './doctors';

export const assistantDoctor = mysqlTable('assistant_doctor', {
  assistantId: int('assistant_id').references(() => assistants.idAssistant, { onDelete: 'cascade' }).notNull(),
  doctorId: int('doctor_id').references(() => doctors.idDoctor, { onDelete: 'cascade' }).notNull(),
  // Puedes agregar campos adicionales como permisos, rol, etc.
});