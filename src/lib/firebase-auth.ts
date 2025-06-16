/**
 * Utilidades para autenticación y tokens personalizados de Firebase.
 * @packageDocumentation
 * @module lib/firebase-auth
 */

import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { z } from 'zod';

// === Inicialización de Firebase Admin ===
if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const auth = getAuth();

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

export { auth };