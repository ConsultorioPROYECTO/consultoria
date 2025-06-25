# Guía de Implementación - Sistema de Consultoría

## Resumen de Mejoras Implementadas

Este documento describe las mejoras implementadas en el sistema de consultoría médica, siguiendo las mejores prácticas de desarrollo con Next.js, TypeScript, Drizzle ORM y ESLint.

## 📋 Prerrequisitos

Antes de implementar las mejoras, asegúrate de tener:

- **Node.js** 18+ instalado
- **npm** como gestor de paquetes
- **MySQL** 8.0+ configurado
- **Firebase** proyecto configurado
- **TypeScript** 5.0+ configurado

### Dependencias Requeridas

```bash
# Instalar dependencias principales
pnpm add drizzle-orm mysql2 zod firebase-admin
pnpm add @types/node @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Instalar dependencias de desarrollo
pnpm add -D drizzle-kit eslint-plugin-drizzle vitest @vitest/ui
```

## 🚀 Mejoras Implementadas

### 1. Utilidades de Base de Datos (`src/db/utils/`)

#### 📁 Creación de la Estructura

Primero, crea la estructura de directorios:

```bash
mkdir -p src/db/utils
touch src/db/utils/index.ts
touch src/db/utils/transactions.ts
touch src/db/utils/user-operations.ts
touch src/db/utils/validation.ts
touch src/db/utils/query-optimization.ts
```

#### Transacciones (`transactions.ts`)

**Implementación completa:**

```typescript
// src/db/utils/transactions.ts
import { db } from '@/db';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { logger } from '@/lib/logging';

type DbTransaction = MySql2Database<typeof schema> & {
  transaction: <T>(fn: (tx: DbTransaction) => Promise<T>) => Promise<T>;
};

/**
 * Ejecuta una función dentro de una transacción automática
 * @param fn Función a ejecutar dentro de la transacción
 * @returns Resultado de la función
 */
export async function withTransaction<T>(
  fn: (tx: DbTransaction) => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    logger.debug('Iniciando transacción de base de datos');
    
    const result = await db.transaction(async (tx) => {
      return await fn(tx as DbTransaction);
    });
    
    const duration = Date.now() - startTime;
    logger.info('Transacción completada exitosamente', { duration });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error en transacción', { error, duration });
    throw handleTransactionError(error);
  }
}

/**
 * Maneja múltiples operaciones en una sola transacción
 * @param operations Array de operaciones a ejecutar
 * @returns Array de resultados
 */
export async function executeInTransaction<T extends readonly unknown[]>(
  ...operations: {
    [K in keyof T]: (tx: DbTransaction) => Promise<T[K]>;
  }
): Promise<T> {
  return withTransaction(async (tx) => {
    const results = [] as unknown as T;
    
    for (let i = 0; i < operations.length; i++) {
      results[i] = await operations[i](tx);
    }
    
    return results;
  });
}

/**
 * Manejo consistente de errores de transacción
 * @param error Error original
 * @returns Error procesado
 */
export function handleTransactionError(error: unknown): Error {
  if (error instanceof Error) {
    // Errores específicos de MySQL
    if (error.message.includes('Duplicate entry')) {
      return new Error('Registro duplicado: Ya existe un registro con estos datos');
    }
    
    if (error.message.includes('Foreign key constraint')) {
      return new Error('Error de integridad: Referencia a registro inexistente');
    }
    
    if (error.message.includes('Data too long')) {
      return new Error('Datos demasiado largos para el campo especificado');
    }
    
    return error;
  }
  
  return new Error('Error desconocido en la transacción');
}

/**
 * Retry automático para transacciones que fallan por deadlock
 * @param fn Función a ejecutar
 * @param maxRetries Número máximo de reintentos
 * @returns Resultado de la función
 */
export async function withRetryTransaction<T>(
  fn: (tx: DbTransaction) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(fn);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Solo reintentar en caso de deadlock
      if (lastError.message.includes('Deadlock') && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 100; // Backoff exponencial
        logger.warn(`Deadlock detectado, reintentando en ${delay}ms (intento ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw lastError;
    }
  }
  
  throw lastError!;
}
```

**Uso en tu proyecto:**

```typescript
// Ejemplo 1: Transacción simple
const result = await withTransaction(async (tx) => {
  const user = await tx.insert(users).values(userData);
  await tx.insert(doctors).values({ userId: user.insertId });
  return user;
});

// Ejemplo 2: Múltiples operaciones
const [user, doctor, assistant] = await executeInTransaction(
  (tx) => tx.insert(users).values(userData),
  (tx) => tx.insert(doctors).values(doctorData),
  (tx) => tx.insert(assistants).values(assistantData)
);

// Ejemplo 3: Con retry automático
const result = await withRetryTransaction(async (tx) => {
  // Operación que puede causar deadlock
  return await complexDatabaseOperation(tx);
});
```

#### Operaciones de Usuario (`user-operations.ts`)

**Implementación completa:**

```typescript
// src/db/utils/user-operations.ts
import { db } from '@/db';
import { users, doctors, assistants } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withTransaction } from './transactions';
import { logger } from '@/lib/logging';
import type { User, NewUser } from '@/db/schema/users';

// Constantes centralizadas
export const USER_ROLES = {
  ADMIN: 'admin',
  MEDICO: 'medico',
  ASISTENTE: 'asistente',
  NA: 'N/A'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const DEFAULT_DOCTOR_CONFIG = {
  speciality: '',
  calendar_id: '',
  privatePhone: '',
  nitId: '',
  availability: '',
  tokenGoogleId: '',
  calendar_settings: {
    notifications: {
      email: true,
      popup: true,
      minutesBefore: [15, 60],
    },
    workingHours: {
      start: '08:00',
      end: '18:00',
      days: [1, 2, 3, 4, 5],
    },
    autoAcceptMeetings: false,
    defaultMeetingDuration: 30,
  }
} as const;

/**
 * Busca un usuario por su Firebase UID
 * @param firebaseUid UID de Firebase
 * @returns Usuario encontrado o null
 */
export async function findUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
  try {
    logger.debug('Buscando usuario por Firebase UID', { firebaseUid });
    
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseUid, firebaseUid),
    });
    
    if (user) {
      logger.info('Usuario encontrado', { userId: user.id, role: user.role });
    } else {
      logger.warn('Usuario no encontrado', { firebaseUid });
    }
    
    return user || null;
  } catch (error) {
    logger.error('Error al buscar usuario por Firebase UID', { error, firebaseUid });
    throw error;
  }
}

/**
 * Busca un usuario por su ID
 * @param userId ID del usuario
 * @returns Usuario encontrado o null
 */
export async function findUserById(userId: number): Promise<User | null> {
  try {
    logger.debug('Buscando usuario por ID', { userId });
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    return user || null;
  } catch (error) {
    logger.error('Error al buscar usuario por ID', { error, userId });
    throw error;
  }
}

/**
 * Obtiene información completa del usuario incluyendo datos específicos del rol
 * @param userId ID del usuario
 * @returns Información completa del usuario
 */
export async function getCompleteUserInfo(userId: number) {
  try {
    const user = await findUserById(userId);
    if (!user) return null;
    
    let roleSpecificData = null;
    
    if (user.role === USER_ROLES.MEDICO) {
      roleSpecificData = await db.query.doctors.findFirst({
        where: eq(doctors.userId, userId),
      });
    } else if (user.role === USER_ROLES.ASISTENTE) {
      roleSpecificData = await db.query.assistants.findFirst({
        where: eq(assistants.userId, userId),
      });
    }
    
    return {
      ...user,
      roleSpecificData,
    };
  } catch (error) {
    logger.error('Error al obtener información completa del usuario', { error, userId });
    throw error;
  }
}

/**
 * Verifica si dos usuarios pertenecen a la misma organización
 * @param userId1 ID del primer usuario
 * @param userId2 ID del segundo usuario
 * @returns true si pertenecen a la misma organización
 */
export async function usersInSameOrganization(userId1: number, userId2: number): Promise<boolean> {
  try {
    const [user1, user2] = await Promise.all([
      findUserById(userId1),
      findUserById(userId2)
    ]);
    
    if (!user1 || !user2) {
      return false;
    }
    
    return user1.organizationId === user2.organizationId;
  } catch (error) {
    logger.error('Error al verificar organización de usuarios', { error, userId1, userId2 });
    return false;
  }
}

/**
 * Cambia el rol de un usuario de forma transaccional
 * @param targetUserId ID del usuario objetivo
 * @param newRole Nuevo rol
 * @param requestingUserId ID del usuario que solicita el cambio
 * @returns Resultado de la operación
 */
export async function changeUserRoleTransactional(
  targetUserId: number,
  newRole: UserRole,
  requestingUserId: number
) {
  return withTransaction(async (tx) => {
    logger.info('Iniciando cambio de rol', { targetUserId, newRole, requestingUserId });
    
    // Verificar que el usuario objetivo existe
    const targetUser = await tx.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });
    
    if (!targetUser) {
      throw new Error('Usuario objetivo no encontrado');
    }
    
    // Verificar que el usuario solicitante tiene permisos
    const requestingUser = await tx.query.users.findFirst({
      where: eq(users.id, requestingUserId),
    });
    
    if (!requestingUser || requestingUser.role !== USER_ROLES.ADMIN) {
      throw new Error('No tienes permisos para cambiar roles');
    }
    
    // Verificar que están en la misma organización
    if (targetUser.organizationId !== requestingUser.organizationId) {
      throw new Error('Solo puedes cambiar roles dentro de tu organización');
    }
    
    const oldRole = targetUser.role;
    
    // Actualizar el rol del usuario
    await tx.update(users)
      .set({ 
        role: newRole,
        updatedAt: new Date()
      })
      .where(eq(users.id, targetUserId));
    
    // Manejar datos específicos del rol
    await handleRoleSpecificData(tx, targetUserId, oldRole, newRole);
    
    logger.info('Cambio de rol completado', {
      targetUserId,
      oldRole,
      newRole,
      requestingUserId
    });
    
    return {
      userId: targetUserId,
      oldRole,
      newRole,
      updatedAt: new Date()
    };
  });
}

/**
 * Maneja la creación/eliminación de datos específicos del rol
 * @param tx Transacción de base de datos
 * @param userId ID del usuario
 * @param oldRole Rol anterior
 * @param newRole Nuevo rol
 */
async function handleRoleSpecificData(
  tx: any,
  userId: number,
  oldRole: string,
  newRole: string
) {
  // Eliminar datos del rol anterior si es necesario
  if (oldRole === USER_ROLES.MEDICO && newRole !== USER_ROLES.MEDICO) {
    await tx.delete(doctors).where(eq(doctors.userId, userId));
  }
  
  if (oldRole === USER_ROLES.ASISTENTE && newRole !== USER_ROLES.ASISTENTE) {
    await tx.delete(assistants).where(eq(assistants.userId, userId));
  }
  
  // Crear datos para el nuevo rol
  if (newRole === USER_ROLES.MEDICO && oldRole !== USER_ROLES.MEDICO) {
    await tx.insert(doctors).values({
      userId,
      ...DEFAULT_DOCTOR_CONFIG
    });
  }
  
  if (newRole === USER_ROLES.ASISTENTE && oldRole !== USER_ROLES.ASISTENTE) {
    await tx.insert(assistants).values({
      userId
    });
  }
}

/**
 * Crea un nuevo usuario con rol específico
 * @param userData Datos del usuario
 * @param role Rol del usuario
 * @returns Usuario creado
 */
export async function createUserWithRole(userData: NewUser, role: UserRole) {
  return withTransaction(async (tx) => {
    logger.info('Creando usuario con rol', { role, email: userData.email });
    
    // Crear el usuario
    const [user] = await tx.insert(users).values({
      ...userData,
      role
    });
    
    const userId = user.insertId;
    
    // Crear datos específicos del rol
    if (role === USER_ROLES.MEDICO) {
      await tx.insert(doctors).values({
        userId,
        ...DEFAULT_DOCTOR_CONFIG
      });
    } else if (role === USER_ROLES.ASISTENTE) {
      await tx.insert(assistants).values({
        userId
      });
    }
    
    logger.info('Usuario creado exitosamente', { userId, role });
    
    return { userId, role };
  });
}
```

**Uso en tu proyecto:**

```typescript
// Buscar usuario
const user = await findUserByFirebaseUid('firebase-uid-123');

// Cambiar rol
const result = await changeUserRoleTransactional(
  targetUserId,
  USER_ROLES.MEDICO,
  adminUserId
);

// Crear usuario con rol
const newUser = await createUserWithRole({
  firebaseUid: 'new-uid',
  email: 'doctor@example.com',
  displayName: 'Dr. Smith'
}, USER_ROLES.MEDICO);
```

#### Validación (`validation.ts`)

**Implementación completa:**

```typescript
// src/db/utils/validation.ts
import { z } from 'zod';
import { USER_ROLES } from './user-operations';
import { logger } from '@/lib/logging';

// Esquemas base
export const firebaseUidSchema = z.string()
  .min(1, 'Firebase UID es requerido')
  .max(128, 'Firebase UID demasiado largo')
  .regex(/^[a-zA-Z0-9]+$/, 'Firebase UID contiene caracteres inválidos');

export const emailSchema = z.string()
  .email('Email inválido')
  .max(255, 'Email demasiado largo')
  .transform(email => email.toLowerCase().trim());

export const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Número de teléfono inválido')
  .optional();

export const userRoleSchema = z.enum([
  USER_ROLES.ADMIN,
  USER_ROLES.MEDICO,
  USER_ROLES.ASISTENTE,
  USER_ROLES.NA
] as const, {
  errorMap: () => ({ message: 'Rol de usuario inválido' })
});

// Esquemas de usuario
export const createUserSchema = z.object({
  firebaseUid: firebaseUidSchema,
  email: emailSchema,
  displayName: z.string()
    .min(1, 'Nombre es requerido')
    .max(100, 'Nombre demasiado largo')
    .transform(name => name.trim()),
  photoURL: z.string().url('URL de foto inválida').optional(),
  role: userRoleSchema.default(USER_ROLES.NA),
  organizationId: z.number().int().positive('ID de organización inválido').optional(),
});

export const updateUserSchema = createUserSchema.partial().omit({ firebaseUid: true });

// Esquemas de doctor
export const doctorConfigSchema = z.object({
  speciality: z.string().max(100, 'Especialidad demasiado larga').optional(),
  calendar_id: z.string().max(255, 'ID de calendario demasiado largo').optional(),
  privatePhone: phoneSchema,
  nitId: z.string().max(50, 'NIT demasiado largo').optional(),
  availability: z.string().max(500, 'Disponibilidad demasiado larga').optional(),
  tokenGoogleId: z.string().max(255, 'Token demasiado largo').optional(),
  calendar_settings: z.object({
    notifications: z.object({
      email: z.boolean().default(true),
      popup: z.boolean().default(true),
      minutesBefore: z.array(z.number().int().positive()).default([15, 60]),
    }).default({}),
    workingHours: z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido').default('08:00'),
      end: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido').default('18:00'),
      days: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
    }).default({}),
    autoAcceptMeetings: z.boolean().default(false),
    defaultMeetingDuration: z.number().int().positive().default(30),
  }).default({}),
});

// Esquemas de citas
export const appointmentSchema = z.object({
  patientId: z.number().int().positive('ID de paciente inválido'),
  doctorId: z.number().int().positive('ID de doctor inválido'),
  startTime: z.date('Fecha de inicio inválida'),
  endTime: z.date('Fecha de fin inválida'),
  title: z.string().min(1, 'Título es requerido').max(200, 'Título demasiado largo'),
  description: z.string().max(1000, 'Descripción demasiado larga').optional(),
  status: z.enum(['scheduled', 'confirmed', 'cancelled', 'completed'], {
    errorMap: () => ({ message: 'Estado de cita inválido' })
  }).default('scheduled'),
  meetingLink: z.string().url('URL de reunión inválida').optional(),
}).refine(data => data.endTime > data.startTime, {
  message: 'La fecha de fin debe ser posterior a la fecha de inicio',
  path: ['endTime']
});

// Esquemas de organización
export const organizationSchema = z.object({
  name: z.string()
    .min(1, 'Nombre de organización es requerido')
    .max(100, 'Nombre demasiado largo')
    .transform(name => name.trim()),
  description: z.string().max(500, 'Descripción demasiado larga').optional(),
  address: z.string().max(255, 'Dirección demasiado larga').optional(),
  phone: phoneSchema,
  email: emailSchema.optional(),
  website: z.string().url('URL de sitio web inválida').optional(),
  settings: z.object({
    allowSelfRegistration: z.boolean().default(false),
    requireApproval: z.boolean().default(true),
    defaultUserRole: userRoleSchema.default(USER_ROLES.NA),
  }).default({}),
});

/**
 * Valida un Firebase UID
 * @param uid UID a validar
 * @returns UID validado
 */
export function validateFirebaseUid(uid: string): string {
  try {
    return firebaseUidSchema.parse(uid);
  } catch (error) {
    logger.warn('Firebase UID inválido', { uid, error });
    throw new Error('Firebase UID inválido');
  }
}

/**
 * Valida un rol de usuario
 * @param role Rol a validar
 * @returns Rol validado
 */
export function validateUserRole(role: string): string {
  try {
    return userRoleSchema.parse(role);
  } catch (error) {
    logger.warn('Rol de usuario inválido', { role, error });
    throw new Error('Rol de usuario inválido');
  }
}

/**
 * Sanitiza y valida datos de entrada
 * @param data Datos a validar
 * @param schema Esquema de validación
 * @returns Datos validados y sanitizados
 */
export function validateAndSanitize<T>(data: unknown, schema: z.ZodSchema<T>): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      
      logger.warn('Errores de validación', { errors: formattedErrors, data });
      
      throw new ValidationError('Datos inválidos', formattedErrors);
    }
    throw error;
  }
}

/**
 * Clase de error personalizada para validaciones
 */
export class ValidationError extends Error {
  public readonly errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  
  constructor(message: string, errors: Array<{ field: string; message: string; code: string }>) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Valida datos de usuario para creación
 * @param userData Datos del usuario
 * @returns Datos validados
 */
export function validateCreateUser(userData: unknown) {
  return validateAndSanitize(userData, createUserSchema);
}

/**
 * Valida datos de usuario para actualización
 * @param userData Datos del usuario
 * @returns Datos validados
 */
export function validateUpdateUser(userData: unknown) {
  return validateAndSanitize(userData, updateUserSchema);
}

/**
 * Valida configuración de doctor
 * @param doctorData Datos del doctor
 * @returns Datos validados
 */
export function validateDoctorConfig(doctorData: unknown) {
  return validateAndSanitize(doctorData, doctorConfigSchema);
}

/**
 * Valida datos de cita
 * @param appointmentData Datos de la cita
 * @returns Datos validados
 */
export function validateAppointment(appointmentData: unknown) {
  return validateAndSanitize(appointmentData, appointmentSchema);
}

/**
 * Valida datos de organización
 * @param organizationData Datos de la organización
 * @returns Datos validados
 */
export function validateOrganization(organizationData: unknown) {
  return validateAndSanitize(organizationData, organizationSchema);
}

/**
 * Valida un array de IDs
 * @param ids Array de IDs
 * @returns IDs validados
 */
export function validateIds(ids: unknown): number[] {
  const schema = z.array(z.number().int().positive('ID inválido'));
  return validateAndSanitize(ids, schema);
}

/**
 * Valida parámetros de paginación
 * @param params Parámetros de paginación
 * @returns Parámetros validados
 */
export function validatePaginationParams(params: unknown) {
  const schema = z.object({
    page: z.number().int().min(1, 'Página debe ser mayor a 0').default(1),
    limit: z.number().int().min(1, 'Límite debe ser mayor a 0').max(100, 'Límite máximo es 100').default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  });
  
  return validateAndSanitize(params, schema);
}

/**
 * Valida filtros de búsqueda
 * @param filters Filtros de búsqueda
 * @returns Filtros validados
 */
export function validateSearchFilters(filters: unknown) {
  const schema = z.object({
    query: z.string().max(100, 'Consulta demasiado larga').optional(),
    role: userRoleSchema.optional(),
    organizationId: z.number().int().positive().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return data.endDate >= data.startDate;
    }
    return true;
  }, {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['endDate']
  });
  
  return validateAndSanitize(filters, schema);
}
```

**Uso en tu proyecto:**

```typescript
// Validar datos de usuario
try {
  const validUser = validateCreateUser({
    firebaseUid: 'abc123',
    email: 'user@example.com',
    displayName: 'John Doe',
    role: 'medico'
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Errores:', error.errors);
  }
}

// Validar en middleware
export function validateUserMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = validateCreateUser(req.body);
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: error.errors
      });
    }
    next(error);
  }
}
```

#### Optimización de Consultas (`query-optimization.ts`)
- **Cache en memoria**: Sistema de cache con TTL configurable
- **Consultas optimizadas**: `getCompleteUserInfo`, `getBatchUserInfo`
- **Métricas de rendimiento**: `QueryPerformanceTracker`
- **Invalidación de cache**: Funciones para limpiar cache específico

### 2. Constantes del Sistema (`src/constants/roles.ts`)

- **Roles del sistema**: Definiciones centralizadas
- **Permisos por rol**: Matriz de permisos detallada
- **Jerarquía de roles**: Niveles de privilegio
- **Transiciones permitidas**: Reglas de cambio de rol
- **Funciones utilitarias**: Validación y verificación de permisos

### 3. Sistema de Logging Avanzado (`src/lib/logging.ts`)

#### Características
- **Niveles de log**: DEBUG, INFO, WARN, ERROR, FATAL
- **Múltiples transportes**: Consola, archivo, servicios externos
- **Logging estructurado**: Contexto y metadata
- **Logger hijo**: Contexto heredado

#### Utilidades Especializadas
- **`RequestLogger`**: Logging automático de requests HTTP
- **`DatabaseLogger`**: Logging de operaciones de BD
- **`withRequestLogging`**: Middleware de logging

```typescript
// Ejemplo de uso
logger.info('Usuario autenticado', {
  userId: user.id,
  organizationId: user.organizationId
});
```

### 4. Seguridad (`src/lib/security.ts`)

#### Rate Limiting
- **Configuraciones predefinidas**: API general, login, operaciones sensibles
- **Store en memoria**: Con limpieza automática
- **Logging de violaciones**: Monitoreo de intentos excesivos

#### Validación y Sanitización
- **`sanitizeString`**: Prevención de XSS
- **`sanitizeEmail`**: Validación de emails
- **`validatePasswordStrength`**: Análisis de fortaleza de contraseñas
- **`validatePhoneNumber`**: Validación de números telefónicos

#### Protección CSRF
- **Generación de tokens**: Tokens seguros con crypto
- **Validación de tiempo constante**: Prevención de timing attacks

#### Headers de Seguridad
- **Headers predefinidos**: X-Content-Type-Options, X-Frame-Options, CSP
- **`applySecurityHeaders`**: Aplicación automática

### 5. Utilidades de Testing (`src/lib/testing.ts`)

#### Factories de Datos
- **`UserTestFactory`**: Creación de usuarios de prueba
- **`MockDatabase`**: Base de datos en memoria para testing
- **`MockRequest`**: Simulación de requests HTTP

#### Utilidades de API
- **`APITestUtils`**: Helpers para testing de APIs
- **Responses simuladas**: Éxito y error
- **Autenticación mock**: Contexto de usuario autenticado

#### Testing de Validación
- **`ValidationTestUtils`**: Generación de casos de prueba
- **Datos inválidos**: Casos edge automatizados
- **Testing de esquemas**: Validación exhaustiva

#### Performance Testing
- **`PerformanceTestUtils`**: Medición de tiempo de ejecución
- **Benchmarking**: Estadísticas de rendimiento

### 6. Configuración Centralizada (`src/config/index.ts`)

#### Gestión de Configuración
- **Variables de entorno**: Validación y valores por defecto
- **Configuración por entorno**: Development, test, staging, production
- **Validación automática**: Verificación de configuración requerida

#### Configuraciones Incluidas
- **Base de datos**: Conexión, pool, timeouts
- **Autenticación**: Firebase, JWT, sesiones
- **Rate limiting**: Ventanas de tiempo, límites
- **Logging**: Niveles, transportes, servicios externos
- **Seguridad**: CSRF, CORS, headers, contraseñas
- **Cache**: TTL, tamaño, Redis

### 7. Middleware de Validación (`src/app/lib/middleware/validation.ts`)

- **`createZodValidator`**: Validador genérico con Zod
- **`validateParams`**: Validación de parámetros de ruta
- **`validateRequestBody`**: Validación de cuerpo de request
- **`withValidation`**: Middleware combinado

### 8. Manejo de Errores (`src/lib/error-handling.ts`)

- **`ErrorLogger`**: Logging centralizado de errores
- **Contexto de errores**: Información detallada
- **Handlers específicos**: Base de datos, validación, autorización
- **`withErrorHandling`**: Wrapper para funciones async

### 9. Configuración ESLint Mejorada

#### Reglas Agregadas
- **Calidad de código**: `prefer-const`, `no-var`, `no-unused-vars`
- **Consistencia TypeScript**: `consistent-type-imports`, `no-explicit-any`
- **Seguridad**: `no-non-null-assertion`
- **Formato**: `object-shorthand`, `prefer-template`
- **Next.js específicas**: `no-html-link-for-pages`, `no-img-element`

## 📁 Estructura de Archivos Actualizada

```
src/
├── app/
│   ├── api/
│   │   └── change-rol/
│   │       └── route.ts (refactorizado)
│   └── lib/
│       └── middleware/
│           └── validation.ts (nuevo)
├── config/
│   └── index.ts (nuevo)
├── constants/
│   └── roles.ts (nuevo)
├── db/
│   ├── utils/
│   │   ├── index.ts (actualizado)
│   │   ├── transactions.ts (nuevo)
│   │   ├── user-operations.ts (nuevo)
│   │   ├── validation.ts (nuevo)
│   │   └── query-optimization.ts (nuevo)
│   └── schema/ (existente)
├── lib/
│   ├── error-handling.ts (nuevo)
│   ├── logging.ts (nuevo)
│   ├── security.ts (nuevo)
│   └── testing.ts (nuevo)
└── types/ (existente)
```

## 🔧 Uso de las Mejoras

### En APIs

```typescript
// route.ts refactorizado
import { 
  validateChangeRoleParams, 
  changeUserRoleTransactional,
  findUserByFirebaseUid 
} from '@/db/utils';
import { handleDatabaseError, createErrorContext } from '@/lib/error-handling';
import { logger } from '@/lib/logging';

export async function POST(request: Request) {
  try {
    const context = createErrorContext(request);
    const params = await validateChangeRoleParams(request);
    const user = await findUserByFirebaseUid(params.firebaseUid);
    
    const result = await changeUserRoleTransactional(
      params.targetUserId,
      params.newRole,
      user.id
    );
    
    logger.info('Role change completed', context, { result });
    return Response.json({ success: true, data: result });
  } catch (error) {
    return handleDatabaseError(error, request);
  }
}
```

### En Testing

```typescript
import { UserTestFactory, MockDatabase, APITestUtils } from '@/lib/testing';

describe('Change Role API', () => {
  let mockDb: MockDatabase;
  
  beforeEach(() => {
    mockDb = new MockDatabase();
  });
  
  it('should change user role successfully', async () => {
    const admin = UserTestFactory.createAdmin();
    const user = UserTestFactory.createAssistant();
    
    const request = APITestUtils.createAuthenticatedRequest(
      admin, 'POST', '/api/change-rol', {
        targetUserId: user.id,
        newRole: 'medico'
      }
    );
    
    // Test implementation
  });
});
```

## 🚦 Configuración de Entorno

### Variables de Entorno Requeridas

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_NAME=consultoria
DB_USER=root
DB_PASSWORD=password

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# JWT
JWT_SECRET=your-jwt-secret

# Opcional: Configuraciones adicionales
RATE_LIMIT_ENABLED=true
LOG_LEVEL=1
SECURITY_ENABLE_CSRF=true
```

## 📊 Beneficios de las Mejoras

### 1. **Mantenibilidad**
- Código modular y reutilizable
- Separación clara de responsabilidades
- Documentación exhaustiva

### 2. **Seguridad**
- Rate limiting configurable
- Validación robusta de entrada
- Headers de seguridad automáticos
- Logging de eventos de seguridad

### 3. **Rendimiento**
- Cache inteligente con TTL
- Consultas optimizadas
- Métricas de rendimiento
- Transacciones eficientes

### 4. **Observabilidad**
- Logging estructurado
- Contexto detallado de errores
- Métricas de performance
- Trazabilidad de requests

### 5. **Testabilidad**
- Factories de datos
- Mocks integrados
- Utilidades de testing
- Casos de prueba automatizados

### 6. **Escalabilidad**
- Configuración por entorno
- Cache distribuido (Redis)
- Pool de conexiones optimizado
- Arquitectura modular

## 🔄 Próximos Pasos

1. **Implementar tests unitarios** usando las utilidades creadas
2. **Configurar CI/CD** con las nuevas reglas de ESLint
3. **Monitoreo en producción** con el sistema de logging
4. **Optimización continua** usando las métricas de performance
5. **Documentación de API** con los nuevos esquemas de validación

## 📝 Notas de Migración

- El API `change-rol` ha sido refactorizado para usar las nuevas utilidades
- Las configuraciones ahora se centralizan en `src/config/index.ts`
- El logging reemplaza los `console.log` anteriores
- Las validaciones ahora usan Zod en lugar de validación manual
- Las transacciones de BD son ahora automáticas y seguras

Esta implementación proporciona una base sólida para el crecimiento y mantenimiento del sistema de consultoría médica.