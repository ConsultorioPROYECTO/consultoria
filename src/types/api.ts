/**
 * Tipos y utilidades para respuestas y errores de la API.
 * @packageDocumentation
 * @module types/api
 */

import { NextResponse } from 'next/server';

/**
 * Respuesta genérica de la API.
 * @template T Tipo de los datos retornados.
 */
export interface ApiResponse<T = unknown> {
  /** Datos retornados por la API. */
  data?: T;
  /** Mensaje de éxito o información adicional. */
  message?: string;
  /** Mensaje de error si la petición falló. */
  error?: string;
  /** Detalles adicionales del error. */
  details?: string;
}

/**
 * Respuesta estándar de la API con campo de éxito.
 * @template T Tipo de los datos retornados.
 */
export interface APIResponse<T = unknown> {
  /** Indica si la petición fue exitosa. */
  success: boolean;
  /** Datos retornados por la API. */
  data?: T;
  /** Mensaje de éxito o información adicional. */
  message?: string;
  /** Mensaje de error si la petición falló. */
  error?: string;
}

/**
 * Estructura para errores de la API.
 */
export interface ApiError {
  /** Mensaje de error. */
  error: string;
  /** Detalles adicionales del error. */
  details?: string;
}

/**
 * Respuesta de éxito de la API (Next.js).
 * @template T Tipo de los datos retornados.
 */
export type ApiSuccessResponse<T> = NextResponse<{ message: string; data?: T }>;

/**
 * Respuesta de error de la API (Next.js).
 */
export type ApiErrorResponse = NextResponse<ApiError>;

/**
 * Tipo de respuesta de la API (éxito o error).
 * @template T Tipo de los datos retornados.
 */
export type ApiResponseType<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// === User API Types ===
/**
 * Request para sincronizar un usuario con la base de datos.
 */
export interface SyncUserRequest {
  firebaseUid: string;
  email?: string;
  emailVerified?: boolean;
  phoneNumber?: string;
  displayName?: string;
  photoURL?: string;
  providerId?: string;
}

/**
 * Respuesta de sincronización de usuario.
 */
export interface SyncUserResponse {
  message: string;
  user: {
    id: number;
    firebaseUid: string;
    email?: string;
    role: string;
    displayName?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

// === Organization API Types ===
/**
 * Request para crear una organización.
 */
export interface CreateOrganizationRequest {
  organizationName: string;
}

/**
 * Respuesta al crear una organización.
 */
export interface CreateOrganizationResponse {
  message: string;
  organization: {
    id: number;
    name: string;
    invitationCode: string;
  };
}

// === Doctor with Appointments Types ===
/**
 * Representa un doctor con sus citas asociadas.
 */
export interface DoctorWithAppointments {
  idDoctor: number;
  userId: number;
  speciality: string;
  calendar_id: string;
  privatePhone: string;
  nitId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availability: any; // JSON type from database schema
  tokenGoogleId: string;
  createdAt: Date;
  updatedAt: Date;
  appointments: Array<{
    id: number;
    doctorId: number;
    patientId?: number | null;
    serviceId?: number | null;
    time: string;
    status: 'Confirmada' | 'Completada' | 'Pendiente' | 'Llegó' | 'Cancelada';
    date: Date;
    notes?: string | null;
    cancelReason?: string | null;
    reminderSent: boolean;
    // Campos temporales para compatibilidad (DEPRECATED)
    patientName?: string | null;
    service?: string | null;
    createdAt: Date;
    updatedAt: Date;
    patient?: {
      id: number;
      firstName: string;
      lastName: string;
      identificationType: 'CC' | 'TI' | 'CE' | 'PP' | 'RC' | 'AS';
      identificationNumber: string;
      birthDate?: Date | null;
      gender: 'M' | 'F' | 'Other';
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      emergencyContactName?: string | null;
      emergencyContactPhone?: string | null;
      emergencyContactRelation?: string | null;
      medicalHistory?: string | null;
      allergies?: string | null;
      currentMedications?: string | null;
      bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;
      organizationId: number;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    } | null;
  }>;
}

/**
 * Respuesta de la API para múltiples doctores con citas.
 */
export type DoctorsWithAppointmentsResponse = DoctorWithAppointments[];

// === Common Error Messages ===
/**
 * Mensajes de error comunes de la API.
 */
export const API_ERRORS = {
  UNAUTHORIZED: 'Acceso denegado: Token inválido',
  FORBIDDEN: 'Acceso denegado: Permisos insuficientes',
  USER_NOT_FOUND: 'Usuario no encontrado',
  INVALID_REQUEST: 'Solicitud inválida',
  INTERNAL_ERROR: 'Error interno del servidor',
  ASSISTANT_ONLY: 'Acceso denegado: Debes ser asistente',
  ADMIN_ONLY: 'Acceso denegado: Debes ser administrador',
} as const;

/**
 * Códigos de estado HTTP comunes usados en la API.
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const;

// === Helper Functions ===
/**
 * Crea una respuesta de éxito estándar para la API.
 * @param data Datos a retornar.
 * @param message Mensaje de éxito.
 * @param status Código de estado HTTP (por defecto 200).
 */
export function createSuccessResponse<T>(data: T, message: string, status: number = HTTP_STATUS.OK) {
  return NextResponse.json({ message, data }, { status });
}

/**
 * Crea una respuesta de error estándar para la API.
 * @param error Mensaje de error.
 * @param details Detalles adicionales del error.
 * @param status Código de estado HTTP (por defecto 500).
 */
export function createErrorResponse(error: string, details?: string, status: number = HTTP_STATUS.INTERNAL_ERROR) {
  return NextResponse.json({ error, details }, { status });
}

/**
 * Crea una respuesta de API genérica.
 * @param success Indica si la petición fue exitosa.
 * @param data Datos a retornar.
 * @param message Mensaje de éxito o detalles de error.
 * @param error Mensaje de error (si aplica).
 * @param status Código de estado HTTP.
 */
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  message?: string,
  error?: string,
  status?: number
) {
  if (success) {
    return NextResponse.json({ message, data }, { status: status || HTTP_STATUS.OK });
  } else {
    return NextResponse.json({ error, details: message }, { status: status || HTTP_STATUS.INTERNAL_ERROR });
  }
}