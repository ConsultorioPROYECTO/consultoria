// src/lib/firebase/adminConfig.ts

/**
 * @fileoverview Configuración e inicialización del SDK de Firebase Admin para el backend.
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-05-12
 *
 * @description
 * Este archivo inicializa la aplicación Firebase Admin utilizando credenciales de cuenta de servicio.
 * Es esencial para operaciones del lado del servidor como la verificación de Tokens ID de Firebase
 * enviados desde el cliente. Las credenciales se obtienen de variables de entorno por seguridad.
 * NO confundir con la configuración del SDK de cliente de Firebase (firebase/config.ts).
 *
 * @requires firebase-admin - SDK de Admin para Firebase.
 * @requires process - Para acceder a las variables de entorno.
 *
 * @example - Variables de entorno necesarias para `firebase-admin`:
 * # Opción 1 (Recomendada: campos individuales)
 * FIREBASE_ADMIN_PROJECT_ID="tu-project-id-de-firebase"
 * FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0B...\n-----END PRIVATE KEY-----\n" (Asegúrate de escapar los saltos de línea con \n si la variable es una sola línea)
 * FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk-xxxx@tu-project-id-de-firebase.iam.gserviceaccount.com"
 *
 * # Opción 2 (JSON completo en una variable, menos común para este setup)
 * # FIREBASE_SERVICE_ACCOUNT_JSON='{"type": "service_account", "project_id": "...", ...}'
 *
 * Para obtener estas credenciales:
 * 1. Ve a tu Proyecto en Firebase Console.
 * 2. "Configuración del proyecto" (engranaje) -> "Cuentas de servicio".
 * 3. Selecciona "Firebase Admin SDK" y haz clic en "Generar nueva clave privada".
 * 4. Guarda el archivo JSON descargado de forma segura y usa su contenido para las variables de entorno.
 *    ¡NO LO SUBAS A TU REPOSITORIO GIT!
 *
 * @see {@link https://firebase.google.com/docs/admin/setup} - Documentación de Firebase Admin SDK Setup.
 */

import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { z } from 'zod';
// Cache simple en memoria para información de usuarios autenticados
// TTL de 15 minutos para balance entre performance y consistencia
interface CachedUserInfo {
  user: {
    id: number;
    firebaseUid: string;
    email: string | null;
    role: string;
    organizationId: number | null;
    displayName: string | null;
  };
  organizationInfo: {
    id: number;
    name: string;
  } | null;
  timestamp: number;
}

const userCache = new Map<string, CachedUserInfo>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutos en millisegundos

/**
 * Limpia entradas expiradas del cache
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of userCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      userCache.delete(key);
    }
  }
}
import type { DecodedIdToken } from 'firebase-admin/auth'; // Solo para el tipado
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

// --- Inicialización de Firebase Admin App ---

/**
 * Inicializa la aplicación Firebase Admin si aún no ha sido inicializada
 * y las credenciales de servicio están disponibles.
 */
if (!admin.apps.length) {
  if (serviceAccountParams && serviceAccountParams.projectId) { // Verifica que las credenciales esenciales estén presentes
    console.log(' [Firebase Admin] Inicializando SDK...');
    //console.log(' [Firebase Admin] Proyecto:', serviceAccountParams);
    console.log(' [Firebase Admin] Inspeccionando objeto admin antes de initializeApp:', admin); // Nueva línea de log
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountParams),
        // Opcional: si usas Firebase Realtime Database desde el admin SDK
        // databaseURL: `https://<TU_PROJECT_ID_O_DATABASE_NAME>.firebaseio.com`
      });
      console.log(' [Firebase Admin] SDK inicializado correctamente.');
    } catch (error) {
      const err = error as Error;
      console.error(` [Firebase Admin] Error al inicializar el SDK: ${err.message}`, err.stack);
      // En un entorno de producción, podrías querer que esto sea un error fatal
      // si el admin SDK es crítico para el funcionamiento de tus APIs.
      throw new Error(`Failed to initialize Firebase Admin SDK: ${serviceAccountParams} ${err.message}`);
    }
  } else {
    // Advertencia si las credenciales no están configuradas pero no es necesariamente un error fatal
    // (por ejemplo, si algunas partes de la app no usan el admin SDK o en entornos de prueba específicos).
    console.warn(
      ' [Firebase Admin] Credenciales de cuenta de servicio no completamente configuradas ' +
      'o FIREBASE_SERVICE_ACCOUNT_JSON no es un JSON válido. ' +
      'El SDK de Firebase Admin no se inicializará. La verificación de tokens fallará.'
    );
  }
} else {
  console.log(' [Firebase Admin] SDK ya estaba inicializado.'); // Log opcional
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
 * Verifica y decodifica un token de ID de Firebase con cache optimizado.
 * 
 * @param idToken - El token de ID de Firebase a verificar
 * @returns Promise que resuelve con el token decodificado y claims personalizados
 * 
 * @throws {Error} Cuando el token es inválido, expirado o la verificación falla
 * 
 * @example
 * ```typescript
 * try {
 *   const decodedToken = await verifyIdToken(idToken);
 *   console.log('User ID:', decodedToken.uid);
 *   console.log('Custom claims:', decodedToken.customClaims);
 * } catch (error) {
 *   console.error('Token verification failed:', error);
 * }
 * ```
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken & { customClaims?: CustomClaims }> {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Extraer custom claims si existen
    const customClaims = decodedToken.customClaims as CustomClaims | undefined;
    
    return {
      ...decodedToken,
      customClaims
    };
  } catch (error) {
    console.error('Error verifying ID token:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Verifica un token y obtiene información completa del usuario con cache optimizado.
 * Reduce consultas a la base de datos mediante cache en memoria.
 * 
 * @param idToken - El token de ID de Firebase a verificar
 * @returns Promise que resuelve con información completa del usuario
 * 
 * @throws {Error} Cuando el token es inválido o el usuario no existe
 * 
 * @example
 * ```typescript
 * try {
 *   const userInfo = await verifyTokenAndGetUserInfo(idToken);
 *   console.log('User:', userInfo.user);
 *   console.log('Organization:', userInfo.organizationInfo);
 * } catch (error) {
 *   console.error('Authentication failed:', error);
 * }
 * ```
 */
export async function verifyTokenAndGetUserInfo(idToken: string): Promise<{
  decodedToken: DecodedIdToken & { customClaims?: CustomClaims };
  user: CachedUserInfo['user'];
  organizationInfo: CachedUserInfo['organizationInfo'];
}> {
  // Primero verificar el token con Firebase
  const decodedToken = await verifyIdToken(idToken);
  
  // Limpiar cache expirado periódicamente
  if (Math.random() < 0.1) { // 10% de probabilidad de limpiar cache
    cleanExpiredCache();
  }
  cleanExpiredCache();
  
  // Buscar en cache primero
  const cacheKey = decodedToken.uid;
  const cachedInfo = userCache.get(cacheKey);
  const now = Date.now();
  
  if (cachedInfo && (now - cachedInfo.timestamp) < CACHE_TTL) {
    // Cache hit - retornar información cached
    return {
      decodedToken,
      user: cachedInfo.user,
      organizationInfo: cachedInfo.organizationInfo
    };
  }
  
  // Cache miss - consultar base de datos
  const { db } = await import('@/db');
  const { users, organization } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');
  
  const userWithOrg = await db
    .select({
      // Información del usuario
      userId: users.id,
      firebaseUid: users.firebaseUid,
      email: users.email,
      role: users.role,
      organizationId: users.organizationId,
      displayName: users.displayName,
      
      // Información de la organización
      organizationName: organization.name,
      orgId: organization.id,
    })
    .from(users)
    .leftJoin(organization, eq(users.organizationId, organization.id))
    .where(eq(users.firebaseUid, decodedToken.uid))
    .limit(1);
  
  if (userWithOrg.length === 0) {
    throw new Error('Usuario no encontrado en la base de datos');
  }
  
  const userInfo = userWithOrg[0];
  
  // Preparar datos para cache
  const cacheData: CachedUserInfo = {
    user: {
      id: userInfo.userId,
      firebaseUid: userInfo.firebaseUid,
      email: userInfo.email,
      role: userInfo.role,
      organizationId: userInfo.organizationId,
      displayName: userInfo.displayName,
    },
    organizationInfo: userInfo.organizationName ? {
      id: userInfo.orgId!,
      name: userInfo.organizationName,
    } : null,
    timestamp: now
  };
  
  // Guardar en cache
  userCache.set(cacheKey, cacheData);
  
  return {
    decodedToken,
    user: cacheData.user,
    organizationInfo: cacheData.organizationInfo
  };
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