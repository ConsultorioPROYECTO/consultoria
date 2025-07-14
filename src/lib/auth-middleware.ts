/**
 * Middleware de autenticación para rutas de API.
 * @packageDocumentation
 * @module lib/auth-middleware
 */

import { NextRequest } from 'next/server';
import { verifyAuthToken, CustomClaims, hasPermission, belongsToOrganization, UserPermissions } from '../app/lib/firebase/server/adminConfig';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { createErrorResponse, HTTP_STATUS, API_ERRORS } from '@/types/api';

/**
 * Opciones para el middleware de autenticación.
 */
export interface AuthMiddlewareOptions {
  /** Permisos requeridos para acceder a la ruta */
  requiredPermissions?: (keyof UserPermissions)[];
  /** Roles permitidos para acceder a la ruta */
  allowedRoles?: string[];
  /** ID de organización requerido (opcional) */
  requireOrganization?: string;
  /** Si se permite acceso sin autenticación */
  allowUnauthenticated?: boolean;
}

/**
 * Resultado del middleware de autenticación.
 */
export interface AuthResult {
  /** Indica si la autenticación fue exitosa */
  success: boolean;
  /** Claims del usuario autenticado */
  user?: CustomClaims & { uid: string; email?: string };
  /** Error si la autenticación falló */
  error?: ReturnType<typeof createErrorResponse>;
}

/**
 * Middleware principal de autenticación.
 * @debug modulo por revision, no funciona correctamente.
 */
export async function authenticateRequest(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<AuthResult> {
  const {
    requiredPermissions = [],
    allowedRoles = [],
    requireOrganization,
    allowUnauthenticated = false,
  } = options;

  // Si se permite acceso sin autenticación
  if (allowUnauthenticated) {
    return { success: true };
  }

  // Obtener token del header Authorization
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return {
      success: false,
      error: createErrorResponse(
        API_ERRORS.UNAUTHORIZED,
        'Token de autorización requerido',
        HTTP_STATUS.UNAUTHORIZED
      ),
    };
  }

  // Verificar token
  const authResult = await verifyAuthToken(authHeader);
  
  if (!authResult.success) {
    return {
      success: false,
      error: createErrorResponse(
        API_ERRORS.UNAUTHORIZED,
        `Token inválido: ${authResult.error || 'Claims no disponibles'}`,
        HTTP_STATUS.UNAUTHORIZED
      ),
    };
  }

  const user = (authResult as { success: true; customClaims: CustomClaims & { uid: string; email?: string }; decodedToken: DecodedIdToken }).customClaims;

  // Verificar roles permitidos
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return {
      success: false,
      error: createErrorResponse(
        API_ERRORS.FORBIDDEN,
        `Acceso denegado. Roles permitidos: ${allowedRoles.join(', ')}`,
        HTTP_STATUS.FORBIDDEN
      ),
    };
  }

  // Verificar permisos requeridos
  for (const permission of requiredPermissions) {
    if (!hasPermission(user, permission)) {
      return {
        success: false,
        error: createErrorResponse(
          API_ERRORS.FORBIDDEN,
          `Permiso requerido: ${permission}`,
          HTTP_STATUS.FORBIDDEN
        ),
      };
    }
  }

  // Verificar organización
  if (requireOrganization && !belongsToOrganization(user, requireOrganization)) {
    return {
      success: false,
      error: createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'Acceso denegado a esta organización',
        HTTP_STATUS.FORBIDDEN
      ),
    };
  }

  return {
    success: true,
    user,
  };
}

/**
 * Middleware específico para rutas de administrador.
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  return authenticateRequest(request, {
    allowedRoles: ['admin']
  });
}

/**
 * Middleware específico para rutas de doctor.
 */
export async function requireDoctor(request: NextRequest): Promise<AuthResult> {
  return authenticateRequest(request, {
    allowedRoles: ['admin', 'doctor'],
    requiredPermissions: ['manageAppointments'],
  });
}

/**
 * Middleware específico para rutas de asistente.
 */
export async function requireAssistant(request: NextRequest): Promise<AuthResult> {
  return authenticateRequest(request, {
    allowedRoles: ['admin', 'assistant'],
    requiredPermissions: ['manageAppointments'],
  });
}

/**
 * Middleware específico para rutas de gestión de pacientes.
 */
export async function requirePatientManagement(request: NextRequest): Promise<AuthResult> {
  return authenticateRequest(request, {
    allowedRoles: ['admin', 'doctor', 'assistant'],
    requiredPermissions: ['managePatients'],
  });
}

/**
 * Middleware específico para rutas de calendario.
 */
export async function requireCalendarAccess(request: NextRequest): Promise<AuthResult> {
  const authResult = await authenticateRequest(request, {
    allowedRoles: ['admin', 'doctor', 'assistant'],
  });

  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  // Verificar acceso específico al calendario
  if (!authResult.user.calendarAccess) {
    return {
      success: false,
      error: createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'Acceso al calendario no autorizado',
        HTTP_STATUS.FORBIDDEN
      ),
    };
  }

  return authResult;
}

/**
 * Helper para extraer información del doctor del token.
 */
export function getDoctorInfo(user: CustomClaims & { uid: string }) {
  if (user.role !== 'doctor' || !user.doctorInfo) {
    return null;
  }
  return user.doctorInfo;
}

/**
 * Helper para extraer información del asistente del token.
 */
export function getAssistantInfo(user: CustomClaims & { uid: string }) {
  if (user.role !== 'assistant' || !user.assistantInfo) {
    return null;
  }
  return user.assistantInfo;
}

/**
 * Helper para verificar si un usuario puede acceder a las citas de un doctor específico.
 */
export function canAccessDoctorAppointments(
  user: CustomClaims & { uid: string },
  doctorId: string
): boolean {
  // Admin puede acceder a todo
  if (user.role === 'admin') {
    return true;
  }

  // Doctor puede acceder a sus propias citas
  if (user.role === 'doctor' && user.doctorInfo?.doctorId === doctorId) {
    return true;
  }

  // Asistente puede acceder a citas de doctores asignados
  if (user.role === 'assistant' && user.assistantInfo?.assignedDoctors.includes(doctorId)) {
    return true;
  }

  return false;
}

/**
 * Helper para verificar si un usuario puede gestionar un paciente específico.
 */
export function canManagePatient(
  user: CustomClaims & { uid: string },
  patientOrganizationId: string
): boolean {
  // Verificar que pertenezca a la misma organización
  if (!belongsToOrganization(user, patientOrganizationId)) {
    return false;
  }

  // Verificar permisos de gestión de pacientes
  return hasPermission(user, 'managePatients');
}