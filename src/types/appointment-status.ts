/**
 * Tipos y constantes para el manejo de estados de citas médicas.
 * @packageDocumentation
 * @module types/appointment-status
 */

/**
 * Estados válidos para las citas médicas.
 * Estos valores deben coincidir con el enum definido en el esquema de la base de datos.
 */
export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted', 
  ATTENDED: 'attended',
  REJECTED: 'rejected',
  CANCELED: 'canceled'
} as const;

/**
 * Tipo para los estados de citas médicas.
 */
export type AppointmentStatusType = typeof APPOINTMENT_STATUS[keyof typeof APPOINTMENT_STATUS];

/**
 * Mapeo de estados en inglés a español para mostrar en la UI.
 */
export const APPOINTMENT_STATUS_LABELS = {
  [APPOINTMENT_STATUS.PENDING]: 'Pendiente',
  [APPOINTMENT_STATUS.ACCEPTED]: 'Confirmada',
  [APPOINTMENT_STATUS.ATTENDED]: 'Completada',
  [APPOINTMENT_STATUS.REJECTED]: 'Rechazada',
  [APPOINTMENT_STATUS.CANCELED]: 'Cancelada'
} as const;

/**
 * Función para obtener la etiqueta en español de un estado.
 * @param status Estado de la cita en inglés
 * @returns Etiqueta en español
 */
export function getAppointmentStatusLabel(status: AppointmentStatusType): string {
  return APPOINTMENT_STATUS_LABELS[status] || status;
}

/**
 * Función para validar si un valor es un estado válido de cita.
 * @param value Valor a validar
 * @returns true si es un estado válido
 */
export function isValidAppointmentStatus(value: unknown): value is AppointmentStatusType {
  return typeof value === 'string' && Object.values(APPOINTMENT_STATUS).includes(value as AppointmentStatusType);
}

/**
 * Estados de sincronización con Google Calendar.
 */
export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCED: 'synced',
  FAILED: 'failed',
  NOT_SYNCED: 'not_synced'
} as const;

/**
 * Tipo para los estados de sincronización.
 */
export type SyncStatusType = typeof SYNC_STATUS[keyof typeof SYNC_STATUS];

/**
 * Función para validar si un valor es un estado de sincronización válido.
 * @param value Valor a validar
 * @returns true si es un estado de sincronización válido
 */
export function isValidSyncStatus(value: unknown): value is SyncStatusType {
  return typeof value === 'string' && Object.values(SYNC_STATUS).includes(value as SyncStatusType);
}