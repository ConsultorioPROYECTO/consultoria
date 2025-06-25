import { mysqlTable, int, timestamp, index } from 'drizzle-orm/mysql-core';
import { users } from './users';

export const assistants = mysqlTable('assistants', {
  idAssistant: int('id').autoincrement().primaryKey(),
  userId: int('user_id').references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull().unique(),
  // Puedes agregar más campos relevantes aquí, como organización, contacto, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index('assistant_user_id_idx').on(table.userId),
]);

// Esquemas Zod para validación
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
export const insertAssistantsSchema = createInsertSchema(assistants);
export const selectAssistantsSchema = createSelectSchema(assistants);

export type Assistant = typeof assistants.$inferSelect;
export type NewAssistant = typeof assistants.$inferInsert;