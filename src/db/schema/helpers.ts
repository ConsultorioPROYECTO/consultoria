import { timestamp } from 'drizzle-orm/pg-core';

export const updatedAt = (name: string) =>
  timestamp(name, { mode: 'date' }).defaultNow().notNull();

export const createdAt = (name: string) =>
  timestamp(name, { mode: 'date' }).defaultNow().notNull();
