// @app/src/db/schema/organization_join_request.ts

import { boolean, index, int, mysqlEnum, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { organization } from "./organization";
import { users } from "./users";

/**
 *  @typedef NotificationTableSchema
 *  @author Santiago Prada
 *  @description Define la estructura de la tabla 'organization_join_request' en la base de datos MySQL,
 *  que gestiona las solicitudes de unión a organizaciones.
 * 
 *  @property {number} id - Clave primaria autoincremental interna de la base de datos.
 *  @property {number} organizationId - Clave foránea a la organización solicitante.
 *  @property {number} userId - Clave foránea al usuario que solicita unirse a la organización.
 *  @property {mysqlEnum} status - Estado de la solicitud (Pendiente, Aprobada, Rechazada).
 *  @property {string | null} message - Mensaje opcional del usuario al solicitar unirse.
 *  @property {Date} createdAt - Timestamp de creación del registro.
 *  @property {Date | null} approvedAt - Timestamp de aprobación de la solicitud (null si no ha sido aprobada).
 *  @property {Date | null} rejectedAt - Timestamp de rechazo de la solicitud (null si no ha sido rechazada).
 *  @property {Date | null} cancelledAt - Timestamp de cancelación de la solicitud (null si no ha sido cancelada).
 *  @property {boolean} isDeleted - Indica si la solicitud ha sido eliminada lógicamente.
 */

export const organizationJoinRequest = mysqlTable('organization_join_request', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id')
    .references(() => organization.id, { onDelete: 'cascade', onUpdate: 'cascade' })
    .notNull(),
  userId: int('user_id')
    .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' })
    .notNull(),
  status: mysqlEnum('status', ['pending', 'approved', 'rejected'])
    .default('pending')
    .notNull(),
  message: varchar('message', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  approvedAt: timestamp('approved_at'),
  rejectedAt: timestamp('rejected_at'),
  cancelledAt: timestamp('cancelled_at'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
}, (table) => [
  index('organization_id_idx').on(table.organizationId),
  index('user_id_idx').on(table.userId),
  index('status_idx').on(table.status),
  index('created_at_idx').on(table.createdAt),
  index('approved_at_idx').on(table.approvedAt),
  index('rejected_at_idx').on(table.rejectedAt),
  index('cancelled_at_idx').on(table.cancelledAt),
]);