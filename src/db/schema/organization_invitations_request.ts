// @app/src/db/schema/organization_invitations_request.ts

import { boolean, index, integer, pgTable, timestamp, varchar, foreignKey, char } from "drizzle-orm/pg-core";
import { invitationRole, invitationStatus } from "./enums";
import { organization } from "./organization";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

/**
 *  @typedef NotificationTableSchema
 *  @author Santiago Prada
 *  @description Define la estructura de la tabla 'organization_invitations_request' en la base de datos PostgreSQL,
 *  que gestiona las solicitudes de unión a organizaciones.
 *
 *  @property {number} id - Clave primaria autoincremental interna de la base de datos.
 *  @property {number} organizationId - Clave foránea a la organización solicitante.
 *  @property {number} userId - Clave foránea al usuario que solicita unirse a la organización.
 *  @property {invitationRole} role - Rol del usuario en la organización (admin, medico, asistente, N/A).
 *  @property {invitationStatus} status - Estado de la solicitud (pending, approved, rejected, cancelled, expired).
 *  @property {string | null} message - Mensaje opcional del usuario al solicitar unirse.
 *  @property {Date} createdAt - Timestamp de creación del registro.
 *  @property {Date | null} approvedAt - Timestamp de aprobación de la solicitud (null si no ha sido aprobada).
 *  @property {Date | null} rejectedAt - Timestamp de rechazo de la solicitud (null si no ha sido rechazada).
 *  @property {Date | null} cancelledAt - Timestamp de cancelación de la solicitud (null si no ha sido cancelada).
 *  @property {boolean} isDeleted - Indica si la solicitud ha sido eliminada lógicamente.
 */

export const organizationInvitationRequest = pgTable('organization_invitations_request', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer('organization_id')
    .notNull(),
  userEmail: varchar('user_email', {length: 255})
    .notNull(),
  invitationToken: char('invitation_token', { length: 6 })
    .notNull()
    .unique(),

  role: invitationRole('role').default('N/A').notNull(), //'admin', 'medico', 'asistente', 'N/A'
  status: invitationStatus('status')
    .default('pending')
    .notNull(),
  message: varchar('message', { length: 500 }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  approvedAt: timestamp('approved_at', { mode: 'date' }),
  rejectedAt: timestamp('rejected_at', { mode: 'date' }),
  cancelledAt: timestamp('cancelled_at', { mode: 'date' }),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' })
}, (table) => [
  foreignKey({
    columns: [table.organizationId],
    foreignColumns: [organization.id],
    name: 'org_inv_req_org_id_fk'
  })
    .onDelete('cascade')
    .onUpdate('cascade'),
  index('inv_org_id_idx').on(table.organizationId),
  index('inv_status_idx').on(table.status),
  index('inv_created_at_idx').on(table.createdAt),
  index('inv_approved_at_idx').on(table.approvedAt),
  index('inv_rejected_at_idx').on(table.rejectedAt),
  index('inv_cancelled_at_idx').on(table.cancelledAt),
  index('inv_user_email_idx').on(table.userEmail),
  index('inv_invitation_token_idx').on(table.invitationToken),
  index('inv_role_idx').on(table.role),
]);

export type organizationInvitationRequest = typeof organizationInvitationRequest.$inferSelect;
export type organizationInvitationRequestInsert = typeof organizationInvitationRequest.$inferInsert;

export const organizationInvitationRequestInsertSchema = createInsertSchema(organizationInvitationRequest);
export const organizationInvitationRequestSelectSchema = createSelectSchema(organizationInvitationRequest);
