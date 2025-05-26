// src/types/api.ts
import { NextResponse } from 'next/server';

// === Base API Types ===
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  details?: string;
}

// Alias for consistency with existing code
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  error: string;
  details?: string;
}

// === Common Response Types ===
export type ApiSuccessResponse<T> = NextResponse<{ message: string; data?: T }>;
export type ApiErrorResponse = NextResponse<ApiError>;
export type ApiResponseType<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// === User API Types ===
export interface SyncUserRequest {
  firebaseUid: string;
  email?: string;
  emailVerified?: boolean;
  phoneNumber?: string;
  displayName?: string;
  photoURL?: string;
  providerId?: string;
}

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
export interface CreateOrganizationRequest {
  organizationName: string;
}

export interface CreateOrganizationResponse {
  message: string;
  organization: {
    id: number;
    name: string;
    invitationCode: string;
  };
}

// === Doctor with Appointments Types ===
export interface DoctorWithAppointments {
  idDoctor: number;
  userId: number;
  speciality: string;
  calendar_id: string;
  privatePhone: string;
  nitId: string;
  availability: string;
  tokenGoogleId: string;
  createdAt: Date;
  updatedAt: Date;
  appointments: Array<{
    id: number;
    doctorId: number;
    time: string;
    status: 'Confirmada' | 'Completada' | 'Pendiente' | 'Llegó';
    patientName: string;
    service: string;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export type DoctorsWithAppointmentsResponse = DoctorWithAppointments[];

// === Common Error Messages ===
export const API_ERRORS = {
  UNAUTHORIZED: 'Acceso denegado: Token inválido',
  FORBIDDEN: 'Acceso denegado: Permisos insuficientes',
  USER_NOT_FOUND: 'Usuario no encontrado',
  INVALID_REQUEST: 'Solicitud inválida',
  INTERNAL_ERROR: 'Error interno del servidor',
  ASSISTANT_ONLY: 'Acceso denegado: Debes ser asistente',
  ADMIN_ONLY: 'Acceso denegado: Debes ser administrador',
} as const;

// === Status Codes ===
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
export function createSuccessResponse<T>(data: T, message: string, status: number = HTTP_STATUS.OK) {
  return NextResponse.json({ message, data }, { status });
}

export function createErrorResponse(error: string, details?: string, status: number = HTTP_STATUS.INTERNAL_ERROR) {
  return NextResponse.json({ error, details }, { status });
}

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