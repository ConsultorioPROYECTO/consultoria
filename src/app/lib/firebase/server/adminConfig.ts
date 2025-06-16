/**
 * @fileoverview Configuración e inicialización del SDK de Firebase Admin para el backend.
 * Incluye utilidades para autenticación y tokens personalizados de Firebase.
 * @version 2.0.0
 * @author Santiago Prada
 * @date 2025-05-12
 * @packageDocumentation
 * @module lib/firebase-admin
 */

import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { z } from 'zod';
import serviceAccountCredentials_json from '../../../../../etc/secrets/consultoria-d1072-firebase-adminsdk-fbsvc-348d22fe8e.json';

// === Tipos y Esquemas ===

/**
 * Roles disponibles en el sistema.
 */
export type UserRole = 'admin' | 'doctor' | 'assistant' | 'patient';

/**
 * Permisos específicos por funcionalidad.
 */
export interface UserPermissions {
  /** Puede gestionar citas médicas */
  manageAppointments: boolean;
  /** Puede ver todas las citas de la organización */
  viewAllAppointments: boolean;
  /** Puede gestionar pacientes */
  managePatients: boolean;
  /** Puede gestionar servicios médicos */
  manageServices: boolean;
  /** Puede gestionar doctores y asistentes */
  manageStaff: boolean;
  /** Puede acceder a configuración de organización */
  manageOrganization: boolean;
  /** Puede acceder a Google Calendar */
  accessCalendar: boolean;
  /** Puede generar reportes */
  generateReports: boolean;
}

/**
 * Información específica del doctor.
 */
export interface DoctorInfo {
  /** ID del doctor en la base de datos */
  doctorId: string;
  /** Especialidad médica */
  specialty: string;
  /** ID del calendario de Google */
  googleCalendarId?: string;
  /** Licencia médica */
  medicalLicense?: string;
}

/**
 * Información específica del asistente.
 */
export interface AssistantInfo {
  /** ID del asistente en la base de datos */
  assistantId: string;
  /** Doctores asignados */
  assignedDoctors: string[];
}

/**
 * Claims personalizados para el token de Firebase.
 */
export interface CustomClaims {
  /** Rol del usuario */
  role: UserRole;
  /** ID de la organización */
  organizationId: string;
  /** Nombre de la organización */
  organizationName: string;
  /** Permisos específicos */
  permissions: UserPermissions;
  /** Acceso al calendario */
  calendarAccess: boolean;
  /** Información del doctor (solo para doctores) */
  doctorInfo?: DoctorInfo;
  /** Información del asistente (solo para asistentes) */
  assistantInfo?: AssistantInfo;
  /** Timestamp de creación del token */
  tokenCreatedAt: number;
  /** Versión del token para invalidación */
  tokenVersion: number;
}

/**
 * Esquema de validación para crear un token personalizado.
 */
export const CreateCustomTokenSchema = z.object({
  uid: z.string().min(1, 'UID es requerido'),
  role: z.enum(['admin', 'doctor', 'assistant', 'patient']),
  organizationId: z.string().min(1, 'ID de organización es requerido'),
  organizationName: z.string().min(1, 'Nombre de organización es requerido'),
  doctorInfo: z.object({
    doctorId: z.string(),
    specialty: z.string(),
    googleCalendarId: z.string().optional(),
    medicalLicense: z.string().optional(),
  }).optional(),
  assistantInfo: z.object({
    assistantId: z.string(),
    assignedDoctors: z.array(z.string()),
  }).optional(),
  tokenVersion: z.number().default(1),
});

export type CreateCustomTokenInput = z.infer<typeof CreateCustomTokenSchema>;

// --- Configuración de Credenciales de Cuenta de Servicio ---
// Las credenciales se cargan directamente desde el archivo JSON importado.
// Asegúrate de que `resolveJsonModule: true` y `esModuleInterop: true` (recomendado)
// estén en tu `tsconfig.json` para que la importación de JSON funcione correctamente.

let serviceAccountParams: admin.ServiceAccount | null;

try {
  // El JSON importado se asigna directamente.
  // Se realiza una validación básica de los campos esperados del JSON (snake_case)
  // y se mapean a la interfaz admin.ServiceAccount (camelCase).
  const credentials = serviceAccountCredentials_json;

  if (credentials && typeof credentials === 'object' &&
      'project_id' in credentials && typeof credentials.project_id === 'string' &&
      'private_key' in credentials && typeof credentials.private_key === 'string' &&
      'client_email' in credentials && typeof credentials.client_email === 'string') {
    
    serviceAccountParams = {
      projectId: credentials.project_id,
      privateKey: credentials.private_key.replace(/\\n/g, '\n'), // Manejar escapes de nueva línea
      clientEmail: credentials.client_email,
      // Otros campos del JSON como client_id, type, etc., son generalmente manejados
      // internamente por admin.credential.cert() si los necesita.
    };

    // Verificar que los campos mapeados no sean undefined o null si son críticos
    if (!serviceAccountParams.projectId || !serviceAccountParams.privateKey || !serviceAccountParams.clientEmail) {
        console.error(' [Firebase Admin] Valores críticos (projectId, privateKey, clientEmail) faltan o son inválidos en el JSON de credenciales importado.');
        serviceAccountParams = null;
    }

  } else {
    console.error(' [Firebase Admin] El archivo JSON de credenciales importado está incompleto, no es un objeto, o no tiene el formato esperado (project_id, private_key, client_email deben ser strings).');
    serviceAccountParams = null;
  }
} catch (error) {
  const err = error as Error;
  console.error(` [Firebase Admin] Error al procesar el archivo JSON de credenciales importado: ${err.message}`);
  serviceAccountParams = null;
}

// === Funciones de Permisos ===

/**
 * Obtiene los permisos basados en el rol del usuario.
 */
export function getPermissionsByRole(role: UserRole): UserPermissions {
  const basePermissions: UserPermissions = {
    manageAppointments: false,
    viewAllAppointments: false,
    managePatients: false,
    manageServices: false,
    manageStaff: false,
    manageOrganization: false,
    accessCalendar: false,
    generateReports: false,
  };

  switch (role) {
    case 'admin':
      return {
        manageAppointments: true,
        viewAllAppointments: true,
        managePatients: true,
        manageServices: true,
        manageStaff: true,
        manageOrganization: true,
        accessCalendar: true,
        generateReports: true,
      };

    case 'doctor':
      return {
        ...basePermissions,
        manageAppointments: true,
        viewAllAppointments: false, // Solo sus propias citas
        managePatients: true,
        accessCalendar: true,
        generateReports: true,
      };

    case 'assistant':
      return {
        ...basePermissions,
        manageAppointments: true,
        viewAllAppointments: true, // Puede ver citas de doctores asignados
        managePatients: true,
        accessCalendar: true,
      };

    case 'patient':
      return basePermissions; // Sin permisos administrativos

    default:
      return basePermissions;
  }
}

/**
 * Determina si el usuario tiene acceso al calendario.
 */
export function hasCalendarAccess(role: UserRole): boolean {
  return ['admin', 'doctor', 'assistant'].includes(role);
}

// --- Inicialización de Firebase Admin App ---

/**
 * Inicializa la aplicación Firebase Admin si aún no ha sido inicializada
 * y las credenciales de servicio están disponibles.
 */
if (!admin.apps.length) {
  if (serviceAccountParams && serviceAccountParams.projectId) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountParams),
      });
    } catch (error) {
      const err = error as Error;
      console.error(` [Firebase Admin] Error al inicializar el SDK: ${err.message}`, err.stack);
      throw new Error(`Failed to initialize Firebase Admin SDK: ${err.message}`);
    }
  } else {
    console.warn(
      ' [Firebase Admin] Credenciales de cuenta de servicio no completamente configuradas. ' +
      'El SDK de Firebase Admin no se inicializará. La verificación de tokens fallará.'
    );
  }
}

// Obtener instancia de auth
const auth = getAuth();

// === Funciones Principales ===

/**
 * Crea un token personalizado de Firebase con claims específicos del sistema médico.
 */
export async function createMedicalCustomToken(
  input: CreateCustomTokenInput
): Promise<string> {
  try {
    // Validar entrada
    const validatedInput = CreateCustomTokenSchema.parse(input);
    
    const { uid, role, organizationId, organizationName, doctorInfo, assistantInfo, tokenVersion } = validatedInput;

    // Construir claims personalizados
    const customClaims: CustomClaims = {
      role,
      organizationId,
      organizationName,
      permissions: getPermissionsByRole(role),
      calendarAccess: hasCalendarAccess(role),
      tokenCreatedAt: Date.now(),
      tokenVersion,
    };

    // Agregar información específica según el rol
    if (role === 'doctor' && doctorInfo) {
      customClaims.doctorInfo = doctorInfo;
    }

    if (role === 'assistant' && assistantInfo) {
      customClaims.assistantInfo = assistantInfo;
    }

    // Crear el token personalizado
    const customToken = await auth.createCustomToken(uid, customClaims);
    
    console.log(`Token personalizado creado para usuario ${uid} con rol ${role}`);
    return customToken;
  } catch (error) {
    console.error('Error creando token personalizado:', error);
    throw new Error(`Error creando token personalizado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Verifica y decodifica un token de ID de Firebase.
 */
export async function verifyIdToken(idToken: string) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Extraer claims personalizados del token decodificado
    const customClaims = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role,
      organizationId: decodedToken.organizationId,
      organizationName: decodedToken.organizationName,
      permissions: decodedToken.permissions,
      calendarAccess: decodedToken.calendarAccess,
      doctorInfo: decodedToken.doctorInfo,
      assistantInfo: decodedToken.assistantInfo,
      tokenCreatedAt: decodedToken.tokenCreatedAt,
      tokenVersion: decodedToken.tokenVersion,
    } as CustomClaims & { uid: string; email?: string };
    
    return {
      success: true,
      decodedToken,
      customClaims,
    };
  } catch (error) {
    console.error('Error verificando token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Verifica un Token ID de Firebase proporcionado por el cliente (función legacy).
 */
export const verifyFirebaseToken = async (idToken: string): Promise<DecodedIdToken | null> => {
  if (!admin.apps.length || !admin.app()) {
    console.error(' [Firebase Admin] Intento de verificar token pero el SDK de Admin no está inicializado.');
    return null;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    const err = error as Error & { code?: string };
    console.error(
        ` [Firebase Admin] Error al verificar el Token ID (Código: ${err.code || 'N/A'}): ${err.message}`
    );
    return null;
  }
};

/**
 * Actualiza los claims personalizados de un usuario existente.
 */
export async function updateUserClaims(
  uid: string,
  newClaims: Partial<CustomClaims>
): Promise<void> {
  try {
    // Obtener claims actuales
    const userRecord = await auth.getUser(uid);
    const currentClaims = (userRecord.customClaims as CustomClaims) || {};

    // Combinar claims existentes con los nuevos
    const updatedClaims: CustomClaims = {
      ...currentClaims,
      ...newClaims,
      tokenCreatedAt: Date.now(), // Actualizar timestamp
      tokenVersion: (currentClaims.tokenVersion || 0) + 1, // Incrementar versión
    };

    // Actualizar claims en Firebase
    await auth.setCustomUserClaims(uid, updatedClaims);
    
    console.log(`Claims actualizados para usuario ${uid}`);
  } catch (error) {
    console.error('Error actualizando claims:', error);
    throw new Error(`Error actualizando claims: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Revoca todos los tokens de un usuario (útil para logout forzado).
 */
export async function revokeUserTokens(uid: string): Promise<void> {
  try {
    await auth.revokeRefreshTokens(uid);
    console.log(`Tokens revocados para usuario ${uid}`);
  } catch (error) {
    console.error('Error revocando tokens:', error);
    throw new Error(`Error revocando tokens: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Verifica si un usuario tiene un permiso específico.
 */
export function hasPermission(
  customClaims: CustomClaims,
  permission: keyof UserPermissions
): boolean {
  return customClaims.permissions?.[permission] || false;
}

/**
 * Verifica si un usuario pertenece a una organización específica.
 */
export function belongsToOrganization(
  customClaims: CustomClaims,
  organizationId: string
): boolean {
  return customClaims.organizationId === organizationId;
}

/**
 * Middleware helper para verificar autenticación en rutas de API.
 */
export async function verifyAuthToken(authHeader?: string) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Token de autorización requerido',
    };
  }

  const token = authHeader.split('Bearer ')[1];
  return await verifyIdToken(token);
}

// Exportar la instancia `admin` si se necesita acceso directo en otras partes del backend.
export { admin as firebaseAdmin };

// Export auth for convenience
export { auth };