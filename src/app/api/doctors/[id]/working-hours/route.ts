/**
 * @fileoverview API para gestión de horarios de trabajo de doctores
 * 
 * Este módulo proporciona endpoints REST para obtener y actualizar los horarios
 * de trabajo de los doctores. Utiliza Zod para validación de datos, Drizzle ORM
 * para interacciones con la base de datos, y soporta tanto el formato nuevo
 * (DoctorWorkingHours) como el formato legacy (WorkingHours).
 * 
 * @author Santiago Prada - Backend Developer
 * @version 1.0.0
 * @since 2025 - 07 - 07
 */

import { NextRequest, NextResponse } from 'next/server';
import { WorkingHours, DEFAULT_WORKING_HOURS } from '@/types/working-hours';
import { 
  doctorIdParamSchema, 
  updateWorkingHoursRequestSchema,
  type DoctorWorkingHours 
} from '@/types/google-calendar-schemas';
import { db } from '@/db';
import { doctors } from '@/db/schema/doctors';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';

/**
 * Interfaz para el contexto de parámetros de ruta
 * @interface RouteContext
 */
interface RouteContext {
  /** Parámetros de la ruta que contienen el ID del doctor */
  params: Promise<{ id: string }>;
}

/**
 * Tipo para respuesta de error estándar de la API
 * @interface ErrorResponse
 */
interface ErrorResponse {
  /** Mensaje de error principal */
  error: string;
  /** Detalles adicionales del error (opcional) */
  details?: string[] | Array<{ field: string; message: string }>;
  /** Formato esperado para corregir el error (opcional) */
  expectedFormat?: Record<string, unknown>;
}

/**
 * Tipo para respuesta exitosa del endpoint GET
 * @interface GetWorkingHoursResponse
 */
interface GetWorkingHoursResponse {
  /** ID del doctor */
  doctorId: number;
  /** Horarios de trabajo (formato nuevo o legacy) */
  workingHours: DoctorWorkingHours | WorkingHours;
}

/**
 * Tipo para respuesta exitosa del endpoint PUT
 * @interface UpdateWorkingHoursResponse
 */
interface UpdateWorkingHoursResponse {
  /** Mensaje de confirmación */
  message: string;
  /** ID del doctor */
  doctorId: number;
  /** Horarios de trabajo actualizados */
  workingHours: DoctorWorkingHours;
}

/**
 * Obtiene los horarios de trabajo de un doctor específico
 * 
 * Este endpoint recupera los horarios de trabajo configurados para un doctor
 * utilizando su ID único. Soporta tanto el formato nuevo (DoctorWorkingHours)
 * como el formato legacy (WorkingHours) para mantener compatibilidad hacia atrás.
 * 
 * @async
 * @function GET
 * @param {NextRequest} request - Objeto de solicitud HTTP de Next.js
 * @param {RouteContext} context - Contexto de la ruta que contiene los parámetros
 * @param {Promise<{ id: string }>} context.params - Parámetros de ruta con el ID del doctor
 * 
 * @returns {Promise<NextResponse<GetWorkingHoursResponse | ErrorResponse>>} 
 * Respuesta JSON que contiene:
 * - En caso exitoso (200): `{ doctorId: number, workingHours: DoctorWorkingHours | WorkingHours }`
 * - En caso de ID inválido (400): `{ error: string, details: string[], expectedFormat: object }`
 * - En caso de doctor no encontrado (404): `{ error: string }`
 * - En caso de error interno (500): `{ error: string }`
 * 
 * @throws {ZodError} Cuando la validación del ID del doctor falla
 * @throws {Error} Cuando ocurre un error en la consulta a la base de datos
 * 
 * @example
 * ```typescript
 * // Solicitud exitosa
 * GET /api/doctors/123/working-hours
 * // Respuesta:
 * {
 *   "doctorId": 123,
 *   "workingHours": {
 *     "workingHours": [
 *       {
 *         "day": "MONDAY",
 *         "intervals": [{ "start": "09:00", "end": "17:00" }]
 *       }
 *     ]
 *   }
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // ID inválido
 * GET /api/doctors/abc/working-hours
 * // Respuesta (400):
 * {
 *   "error": "ID de doctor inválido",
 *   "details": ["Expected number, received nan"],
 *   "expectedFormat": {
 *     "note": "El ID debe ser un número entero positivo",
 *     "example": "GET /api/doctors/123/working-hours"
 *   }
 * }
 * ```
 * 
 * @see {@link doctorIdParamSchema} Para validación de parámetros
 * @see {@link DoctorWorkingHours} Para el formato nuevo de horarios
 * @see {@link WorkingHours} Para el formato legacy de horarios
 * @see {@link DEFAULT_WORKING_HOURS} Para horarios por defecto
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<GetWorkingHoursResponse | ErrorResponse>> {
  try {
    // Resolver los parámetros de la ruta de forma asíncrona
    const resolvedParams = await params;
    
    /**
     * Validación del parámetro ID del doctor usando esquema Zod
     * 
     * Utiliza `doctorIdParamSchema` para validar que el ID sea un número válido.
     * Si la validación falla, retorna un error 400 con detalles específicos.
     * 
     * @see {@link doctorIdParamSchema} Esquema de validación para el ID
     */
    const validationResult = doctorIdParamSchema.safeParse(resolvedParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'ID de doctor inválido',
          details: validationResult.error.errors.map(err => err.message),
          expectedFormat: {
            note: "El ID debe ser un número entero positivo",
            example: "GET /api/doctors/123/working-hours"
          }
        },
        { status: 400 }
      );
    }
    
    // Convertir el ID validado a número entero
    const doctorId = parseInt(validationResult.data.id);

    /**
     * Consulta a la base de datos usando Drizzle ORM
     * 
     * Busca el doctor por ID y obtiene sus horarios de trabajo almacenados.
     * Utiliza una consulta optimizada con `limit(1)` para mejor rendimiento.
     * 
     * @see {@link doctors} Esquema de la tabla doctors
     * @see {@link eq} Función de comparación de Drizzle ORM
     */
    const doctor = await db
      .select({
        idDoctor: doctors.idDoctor,
        workingHours: doctors.working_hours
      })
      .from(doctors)
      .where(eq(doctors.idDoctor, doctorId))
      .limit(1);

    // Verificar si el doctor existe en la base de datos
    if (doctor.length === 0) {
      return NextResponse.json(
        { error: 'Doctor no encontrado' },
        { status: 404 }
      );
    }

    /**
     * Procesamiento de horarios de trabajo con compatibilidad hacia atrás
     * 
     * Maneja tanto el formato nuevo (DoctorWorkingHours) como el formato legacy (WorkingHours).
     * Si no hay horarios configurados, utiliza los horarios por defecto.
     * 
     * @see {@link DoctorWorkingHours} Formato nuevo de horarios
     * @see {@link WorkingHours} Formato legacy de horarios
     * @see {@link DEFAULT_WORKING_HOURS} Horarios por defecto del sistema
     */
    const storedWorkingHours = doctor[0].workingHours;
    let workingHours: DoctorWorkingHours | WorkingHours;
    
    if (storedWorkingHours) {
      // Intentar usar el formato nuevo (DoctorWorkingHours)
      try {
        const parsedHours = storedWorkingHours as DoctorWorkingHours;
        workingHours = parsedHours;
      } catch {
        // Fallback al formato legacy si el nuevo formato falla
        workingHours = storedWorkingHours as WorkingHours || DEFAULT_WORKING_HOURS;
      }
    } else {
      // Usar horarios por defecto si no hay configuración previa
      workingHours = DEFAULT_WORKING_HOURS;
    }

    // Retornar respuesta exitosa con los horarios del doctor
    return NextResponse.json({
      doctorId,
      workingHours,
    });
  } catch (error) {
    /**
     * Manejo centralizado de errores
     * 
     * Registra el error para debugging y proporciona respuestas apropiadas
     * según el tipo de error encontrado.
     */
    console.error('Error al obtener horarios del doctor:', error);
    
    /**
     * Manejo específico de errores de validación Zod
     * 
     * Los errores de Zod contienen información detallada sobre qué campos
     * fallaron en la validación, útil para debugging del cliente.
     * 
     * @see {@link ZodError} Tipo de error de validación de Zod
     */
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: 'Error de validación',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }
    
    // Error genérico del servidor para casos no manejados específicamente
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * Actualiza los horarios de trabajo de un doctor específico
 * 
 * Este endpoint permite actualizar completamente los horarios de trabajo de un doctor.
 * Utiliza validación estricta con Zod para asegurar la integridad de los datos y
 * soporta el formato nuevo (DoctorWorkingHours) con validaciones avanzadas como
 * detección de intervalos superpuestos y validación de formatos de tiempo.
 * 
 * @async
 * @function PUT
 * @param {NextRequest} request - Objeto de solicitud HTTP que contiene los nuevos horarios en el body
 * @param {RouteContext} context - Contexto de la ruta que contiene los parámetros
 * @param {Promise<{ id: string }>} context.params - Parámetros de ruta con el ID del doctor
 * 
 * @returns {Promise<NextResponse<UpdateWorkingHoursResponse | ErrorResponse>>}
 * Respuesta JSON que contiene:
 * - En caso exitoso (200): `{ message: string, doctorId: number, workingHours: DoctorWorkingHours }`
 * - En caso de ID inválido (400): `{ error: string, details: string[], expectedFormat: object }`
 * - En caso de datos inválidos (400): `{ error: string, details: object[], expectedFormat: object }`
 * - En caso de doctor no encontrado (404): `{ error: string }`
 * - En caso de error interno (500): `{ error: string }`
 * 
 * @throws {ZodError} Cuando la validación del ID o del cuerpo de la solicitud falla
 * @throws {Error} Cuando ocurre un error en la consulta o actualización de la base de datos
 * 
 * @example
 * ```typescript
 * // Solicitud exitosa
 * PUT /api/doctors/123/working-hours
 * // Body:
 * {
 *   "workingHours": [
 *     {
 *       "day": "MONDAY",
 *       "intervals": [
 *         { "start": "09:00", "end": "12:00" },
 *         { "start": "14:00", "end": "17:00" }
 *       ]
 *     }
 *   ]
 * }
 * // Respuesta (200):
 * {
 *   "message": "Horarios actualizados exitosamente",
 *   "doctorId": 123,
 *   "workingHours": { "workingHours": [...] }
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Datos inválidos - intervalos superpuestos
 * PUT /api/doctors/123/working-hours
 * // Body con intervalos superpuestos
 * // Respuesta (400):
 * {
 *   "error": "Datos de horarios inválidos",
 *   "details": [
 *     {
 *       "field": "workingHours.0.intervals",
 *       "message": "Time intervals cannot overlap"
 *     }
 *   ],
 *   "expectedFormat": { ... }
 * }
 * ```
 * 
 * @see {@link doctorIdParamSchema} Para validación de parámetros
 * @see {@link updateWorkingHoursRequestSchema} Para validación del cuerpo de la solicitud
 * @see {@link DoctorWorkingHours} Para el formato de horarios esperado
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<UpdateWorkingHoursResponse | ErrorResponse>> {
  try {
    // Resolver los parámetros de la ruta de forma asíncrona
    const resolvedParams = await params;
    
    /**
     * Validación del parámetro ID del doctor usando esquema Zod
     * 
     * Valida que el ID del doctor sea un número entero válido antes de proceder
     * con la actualización. Retorna error 400 si la validación falla.
     * 
     * @see {@link doctorIdParamSchema} Esquema de validación para el ID
     */
    const paramValidation = doctorIdParamSchema.safeParse(resolvedParams);
    if (!paramValidation.success) {
      return NextResponse.json(
        { 
          error: 'ID de doctor inválido',
          details: paramValidation.error.errors.map(err => err.message),
          expectedFormat: {
            note: "El ID debe ser un número entero positivo",
            example: "PUT /api/doctors/123/working-hours"
          }
        },
        { status: 400 }
      );
    }
    
    // Convertir el ID validado a número entero
    const doctorId = parseInt(paramValidation.data.id);

    /**
     * Validación del cuerpo de la solicitud usando esquema Zod
     * 
     * Valida la estructura completa de los horarios de trabajo, incluyendo:
     * - Formato de días de la semana
     * - Formato de intervalos de tiempo (HH:mm)
     * - Detección de intervalos superpuestos
     * - Validación de horarios lógicos (inicio < fin)
     * 
     * @see {@link updateWorkingHoursRequestSchema} Esquema de validación completo
     */
    const body = await request.json();
    const bodyValidation = updateWorkingHoursRequestSchema.safeParse(body);
    
    // Manejo de errores de validación del cuerpo de la solicitud
    if (!bodyValidation.success) {
      return NextResponse.json(
        { 
          error: 'Datos de horarios inválidos',
          details: bodyValidation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          })),
          expectedFormat: {
            workingHours: [
              {
                dayOfWeek: "MONDAY",
                intervals: [
                  { start: "09:00", end: "17:00" }
                ]
              },
              {
                dayOfWeek: "TUESDAY", 
                intervals: [
                  { start: "09:00", end: "12:00" },
                  { start: "14:00", end: "17:00" }
                ]
              }
            ]
          }
        },
        { status: 400 }
      );
    }
    
    // Extraer los horarios validados del cuerpo de la solicitud
    const { workingHours } = bodyValidation.data;

    /**
     * Verificación de existencia del doctor en la base de datos
     * 
     * Antes de actualizar los horarios, verifica que el doctor existe.
     * Esto previene actualizaciones en registros inexistentes y proporciona
     * un mensaje de error más específico al cliente.
     * 
     * @see {@link doctors} Esquema de la tabla doctors
     * @see {@link eq} Función de comparación de Drizzle ORM
     */
    const existingDoctor = await db
      .select({ idDoctor: doctors.idDoctor })
      .from(doctors)
      .where(eq(doctors.idDoctor, doctorId))
      .limit(1);

    if (existingDoctor.length === 0) {
      return NextResponse.json(
        { error: 'Doctor no encontrado' },
        { status: 404 }
      );
    }

    /**
     * Actualización de horarios en la base de datos usando Drizzle ORM
     * 
     * Construye el objeto DoctorWorkingHours y actualiza el registro del doctor.
     * La operación es atómica y utiliza transacciones implícitas de Drizzle.
     * 
     * @see {@link DoctorWorkingHours} Tipo de datos para horarios
     * @see {@link doctors.working_hours} Campo de la tabla para almacenar horarios
     */
    const doctorWorkingHoursData: DoctorWorkingHours = { workingHours };
    await db
      .update(doctors)
      .set({ working_hours: doctorWorkingHoursData })
      .where(eq(doctors.idDoctor, doctorId));

    /**
     * Respuesta exitosa de actualización
     * 
     * Retorna confirmación de la actualización junto con los datos actualizados
     * para que el cliente pueda verificar que los cambios se aplicaron correctamente.
     */
    return NextResponse.json({
      message: 'Horarios actualizados exitosamente',
      doctorId,
      workingHours: doctorWorkingHoursData,
    });
  } catch (error) {
    /**
     * Manejo centralizado de errores para la función PUT
     * 
     * Registra el error para debugging y proporciona respuestas apropiadas
     * según el tipo de error encontrado. Incluye manejo específico para
     * errores de validación Zod y errores genéricos del servidor.
     */
    console.error('Error al actualizar horarios del doctor:', error);
    
    /**
     * Manejo específico de errores de validación Zod
     * 
     * Los errores de Zod proporcionan información detallada sobre campos
     * específicos que fallaron en la validación, incluyendo validaciones
     * personalizadas como intervalos superpuestos.
     * 
     * @see {@link ZodError} Tipo de error de validación de Zod
     */
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: 'Error de validación',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }
    
    // Error genérico del servidor para casos no manejados específicamente
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}