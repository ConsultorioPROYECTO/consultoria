/**
 * @fileoverview API route for doctor availability with API Key authentication
 * @module api/n8n/doctors/[doctorId]/availability
 * @author Santiago Prada
 * 
 * This module provides endpoints for retrieving doctor availability with API Key authentication,
 * designed for external integrations like n8n workflows.
 * 
 * @requires NextRequest from 'next/server'
 * @requires NextResponse from 'next/server'
 * @requires db from '@/db'
 * @requires doctors from '@/db/schema/doctors'
 * @requires eq from 'drizzle-orm'
 * @requires googleCalendarService from '@/lib/google-calendar'
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://developers.google.com/calendar/api/v3/reference | Google Calendar API}
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { doctors } from '@/db/schema/doctors';
import { eq } from 'drizzle-orm';
import { googleCalendarService } from '@/lib/google-calendar';
import type { WorkingHours, DaySchedule } from '@/types/working-hours';
import { z } from 'zod';

// === API Key Authentication ===

/**
 * Authenticates requests using API Key from headers.
 * 
 * This function validates the API key provided in the request headers
 * and returns the associated organization information.
 * 
 * @param {NextRequest} request - The incoming HTTP request
 * @returns {Promise<{success: boolean, organizationId?: number, error?: string}>} 
 *   Authentication result with organization ID or error
 * 
 * @example
 * ```typescript
 * const authResult = await authenticateApiKey(request);
 * if (!authResult.success) {
 *   return NextResponse.json({ error: authResult.error }, { status: 401 });
 * }
 * ```
 * 
 * @security Requires 'X-API-Key' header with valid API key
 */
async function authenticateApiKey(request: NextRequest): Promise<{
  success: boolean;
  organizationId?: number;
  error?: string;
}> {
  try {
    const apiKey = request.headers.get('X-API-Key');
    
    if (!apiKey) {
      return {
        success: false,
        error: 'API Key requerida en el header X-API-Key'
      };
    }

    // Verificar API key contra variable de entorno
    const validApiKey = process.env.N8N_API_KEY;
    
    if (!validApiKey) {
      console.error('N8N_API_KEY no está configurada en las variables de entorno');
      return {
        success: false,
        error: 'Configuración de API Key no disponible'
      };
    }

    if (apiKey !== validApiKey) {
      return {
        success: false,
        error: 'API Key inválida'
      };
    }

    // Para esta implementación, usaremos la organización por defecto
    // En el futuro se puede extender para soportar múltiples organizaciones
    const defaultOrganizationId = parseInt(process.env.DEFAULT_ORGANIZATION_ID || '1');

    return {
      success: true,
      organizationId: defaultOrganizationId
    };
  } catch (error) {
    console.error('Error en autenticación de API Key:', error);
    return {
      success: false,
      error: 'Error interno de autenticación'
    };
  }
}

// === Zod Validation Schemas ===

/**
 * Zod schema for validating availability request parameters.
 * Optimized for AI/MCP usage with string-to-number coercion and comprehensive validation.
 * 
 * @description This schema handles data coming from external sources (like n8n or AI agents)
 * where numeric values might be passed as strings. It automatically converts and validates:
 * - String numbers to actual numbers (e.g., "123" -> 123)
 * - Date format validation (YYYY-MM-DD)
 * - Interval validation (5-120 minutes)
 * 
 * @example
 * ```typescript
 * // Valid input (strings will be converted to numbers)
 * const input = {
 *   doctorId: "1",
 *   date: "2024-01-15",
 *   interval: "30"
 * };
 * 
 * const result = AvailabilityRequestSchema.parse(input);
 * // result.doctorId will be number 1
 * // result.interval will be number 30
 * ```
 */
const AvailabilityRequestSchema = z.object({
  /** Doctor ID - accepts string or number, converts to number */
  doctorId: z.union([
    z.string().regex(/^\d+$/, 'Doctor ID debe ser un número válido').transform(Number),
    z.number().int().positive('Doctor ID debe ser un número positivo')
  ]),
  
  /** Date in YYYY-MM-DD format */
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD')
    .refine((date) => {
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime()) && parsedDate >= new Date(new Date().setHours(0, 0, 0, 0));
    }, 'Fecha debe ser válida y no puede ser en el pasado'),
  
  /** Interval in minutes - accepts string or number, converts to number */
  interval: z.union([
    z.string().regex(/^\d+$/, 'Interval debe ser un número válido').transform(Number),
    z.number().int()
  ]).refine((val) => val >= 5 && val <= 120, 'Interval debe estar entre 5 y 120 minutos').optional().default(30)
});

/**
 * Type inferred from the Zod schema for validated availability request data.
 */
type ValidatedAvailabilityRequest = z.infer<typeof AvailabilityRequestSchema>;

// === Type Definitions ===

/**
 * Representa un tiempo de descanso de un doctor para un día específico
 * @interface BreakTime
 */
type BreakTime = {
  /** Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado) */
  dayOfWeek: number;
  /** Hora de inicio del descanso en formato HH:MM */
  startTime: string;
  /** Hora de fin del descanso en formato HH:MM */
  endTime: string;
};

/**
 * Representa un horario disponible para citas
 * @interface TimeSlot
 */
type TimeSlot = {
  /** Fecha y hora de inicio en formato ISO 8601 */
  start: string;
  /** Fecha y hora de fin en formato ISO 8601 */
  end: string;
};

/**
 * Representa un bloque de tiempo ocupado
 * @interface BusyBlock
 */
type BusyBlock = {
  /** Fecha y hora de inicio en formato ISO 8601 */
  start: string;
  /** Fecha y hora de fin en formato ISO 8601 */
  end: string;
};

// === Utility Functions ===

/**
 * Crea una fecha en una zona horaria específica
 * @param dateStr - Fecha en formato YYYY-MM-DD
 * @param timeStr - Hora en formato HH:MM o HH:MM:SS
 * @param timezone - Zona horaria objetivo
 * @returns Date object ajustado a la zona horaria
 */
function createDateInTimezone(dateStr: string, timeStr: string, timezone: string): Date {
  // Crear fecha base
  const baseDate = new Date(`${dateStr}T${timeStr}`);
  
  // Para simplificar, usamos el offset de zona horaria conocido
  // America/Bogota es UTC-5, pero esto debería ser más dinámico en producción
  const timezoneOffsets: Record<string, number> = {
    'America/Bogota': -5,
    'UTC': 0,
    // Agregar más zonas horarias según sea necesario
  };
  
  const offsetHours = timezoneOffsets[timezone] || -5; // Default a Bogotá
  const offsetMs = offsetHours * 60 * 60 * 1000;
  
  // Ajustar la fecha por el offset de zona horaria
  return new Date(baseDate.getTime() - offsetMs);
}

/**
 * Verifica si un horario propuesto se solapa con bloques de tiempo ocupados
 * 
 * @description Utiliza el algoritmo de detección de solapamiento de intervalos:
 * Dos intervalos [a,b] y [c,d] se solapan si: a < d && b > c
 * 
 * @param {Date} slotStart - Fecha y hora de inicio del horario propuesto
 * @param {Date} slotEnd - Fecha y hora de fin del horario propuesto
 * @param {BusyBlock[]} busyBlocks - Array de bloques de tiempo ocupados
 * 
 * @returns {boolean} true si hay solapamiento, false en caso contrario
 * 
 * @example
 * const start = new Date('2025-07-02T09:00:00Z');
 * const end = new Date('2025-07-02T09:30:00Z');
 * const busy = [{ start: '2025-07-02T09:15:00Z', end: '2025-07-02T09:45:00Z' }];
 * const overlaps = isOverlapping(start, end, busy); // true
 * 
 * @since 1.0.0
 * @author Sistema de Gestión de Citas
 */
function isOverlapping(slotStart: Date, slotEnd: Date, busyBlocks: BusyBlock[]): boolean {
  for (const block of busyBlocks) {
    const blockStart = new Date(block.start);
    const blockEnd = new Date(block.end);
    
    // DEBUG: Log detallado de cada comparación
    const overlaps = slotStart < blockEnd && slotEnd > blockStart;
    if (overlaps) {
      console.log(`🔴 SOLAPAMIENTO DETECTADO:`);
      console.log(`  Slot: ${slotStart.toISOString()} - ${slotEnd.toISOString()}`);
      console.log(`  Bloque ocupado: ${blockStart.toISOString()} - ${blockEnd.toISOString()}`);
      console.log(`  Condición: ${slotStart.toISOString()} < ${blockEnd.toISOString()} && ${slotEnd.toISOString()} > ${blockStart.toISOString()}`);
      console.log(`  Resultado: ${slotStart < blockEnd} && ${slotEnd > blockStart} = ${overlaps}`);
    }
    
    // Algoritmo de detección de solapamiento: slotStart < blockEnd && slotEnd > blockStart
    if (overlaps) {
      return true;
    }
  }
  return false;
}

/**
 * @fileoverview API endpoint para obtener la disponibilidad de horarios de un doctor específico con autenticación API Key
 * @description Este endpoint calcula los horarios disponibles de un doctor para una fecha específica,
 * considerando sus horarios de trabajo, descansos y eventos existentes en Google Calendar.
 * Requiere autenticación mediante API Key para acceso desde sistemas externos como n8n.
 * 
 * @route GET /api/n8n/doctors/[doctorId]/availability
 * @param {string} doctorId - ID del doctor (parámetro de ruta)
 * @param {string} date - Fecha en formato YYYY-MM-DD (parámetro de consulta)
 * @param {number} [interval] - Duración del intervalo en minutos (parámetro de consulta opcional, por defecto 30)
 * 
 * @returns {Array<TimeSlot>} Array de horarios disponibles
 * @returns {Object} Error object en caso de fallo
 * 
 * @example
 * // Obtener disponibilidad para el doctor con ID 123 el 2 de julio de 2025 con intervalos de 30 minutos
 * GET /api/n8n/doctors/123/availability?date=2025-07-02
 * Headers: { "X-API-Key": "your-api-key" }
 * 
 * @example
 * // Obtener disponibilidad con intervalos de 15 minutos
 * GET /api/n8n/doctors/123/availability?date=2025-07-02&interval=15
 * Headers: { "X-API-Key": "your-api-key" }
 * 
 * @swagger
 * /api/n8n/doctors/{doctorId}/availability:
 *   get:
 *     summary: Obtiene la disponibilidad de horarios de un doctor con autenticación API Key
 *     description: Calcula los horarios disponibles considerando horarios de trabajo, descansos y eventos de Google Calendar
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único del doctor (acepta string o number)
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha para consultar disponibilidad (YYYY-MM-DD)
 *       - in: query
 *         name: interval
 *         required: false
 *         schema:
 *           type: string
 *           minimum: 5
 *           maximum: 120
 *           default: 30
 *         description: Duración del intervalo en minutos (5-120 minutos, acepta string o number)
 *     responses:
 *       200:
 *         description: Lista de horarios disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TimeSlot'
 *       400:
 *         description: Parámetros inválidos o errores de validación
 *       401:
 *         description: API Key inválida o faltante
 *       404:
 *         description: Doctor no encontrado
 *       500:
 *         description: Error interno del servidor
 * 
 * @version 1.1.0 - Agregada autenticación API Key y validación Zod con AI/MCP optimization
 * @since 1.0.0
 * @author Sistema de Gestión de Citas
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ doctorId: string }> }
): Promise<NextResponse<TimeSlot[] | { error: string }>> {
  try {
    // 1. Autenticar usando API Key
    const authResult = await authenticateApiKey(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || 'Autenticación fallida' }, 
        { status: 401 }
      );
    }

    const organizationId = authResult.organizationId!;

    // 2. Extraer y validar parámetros
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const intervalParam = searchParams.get('interval');
    
    // Resolver parámetros de ruta dinámicos (Next.js 15+)
    const resolvedParams = await params;
    const doctorIdParam = resolvedParams.doctorId;

    // 3. Validar parámetros usando Zod
    let validatedData: ValidatedAvailabilityRequest;
    try {
      validatedData = AvailabilityRequestSchema.parse({
        doctorId: doctorIdParam,
        date: dateParam,
        interval: intervalParam
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        }).join(', ');
        
        return NextResponse.json(
          { error: `Errores de validación: ${errorMessages}` }, 
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Error de validación de parámetros' }, 
        { status: 400 }
      );
    }

    const { doctorId, date: validatedDate, interval: intervalMinutes } = validatedData;

    // 4. Convertir fecha y calcular día de la semana (0=Domingo, 6=Sábado)
    const date = new Date(validatedDate);
    const dayOfWeek = date.getUTCDay();

    // ========================================
    // PASO 5: CONSULTA DE INFORMACIÓN DEL DOCTOR
    // ========================================
    
    /**
     * Consulta la información del doctor desde MySQL usando Drizzle ORM
     * Incluye: horarios de trabajo, descansos, ID de calendario de Google, duración de citas
     */
    const doctorResult = await db
      .select()
      .from(doctors)
      .where(eq(doctors.idDoctor, doctorId))
      .limit(1);
    
    const doctor = doctorResult[0];

    // Validación: Doctor debe existir y tener configuración básica
    if (!doctor || !doctor.calendar_id || !doctor.working_hours) {
      return NextResponse.json(
        { error: 'Doctor no encontrado o sin configuración de calendario/horario' }, 
        { status: 404 }
      );
    }

    // ========================================
    // PASO 6: FILTRADO POR DÍA DE LA SEMANA
    // ========================================
    
    /**
     * Mapea el número del día de la semana a la propiedad correspondiente del objeto WorkingHours
     * 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado
     */
    const dayNames: (keyof WorkingHours)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    /**
     * Extrae horarios de trabajo y descansos específicos para el día solicitado
     * Los horarios se almacenan como JSON en la base de datos
     */
    const doctorWorkingHours = doctor.working_hours as WorkingHours | null;
    const daySchedule: DaySchedule | null = doctorWorkingHours?.[dayName] || null;
    
    const breakTimes = ((doctor.break_times as BreakTime[] | null) || [])
      .filter(bt => bt.dayOfWeek === dayOfWeek);

    // Si el doctor no trabaja este día o el día no está activo, retornar array vacío
    if (!daySchedule || !daySchedule.isActive) {
      return NextResponse.json([]); // El doctor no trabaja este día
    }

    // ========================================
    // PASO 7: CONSULTA DE GOOGLE CALENDAR API
    // ========================================
    
    /**
     * Obtiene eventos ocupados del calendario de Google del doctor
     * Utiliza Google Calendar API v3 para consultar eventos del día específico
     * Ahora incluye la zona horaria del doctor para consultas precisas
     */
    const doctorTimezone = doctor.calendar_timezone || 'America/Bogota';
    const busyBlocksFromGoogle = await googleCalendarService.getBusySlotsForDay(
      doctor.calendar_id, 
      date,
      doctorTimezone
    );
    
    // DEBUG: Log para verificar los bloques ocupados obtenidos de Google Calendar
    console.log('=== DEBUG AVAILABILITY API (N8N) ===');
    console.log('Doctor ID:', doctorId);
    console.log('Organization ID:', organizationId);
    console.log('Calendar ID:', doctor.calendar_id);
    console.log('Doctor timezone:', doctorTimezone);
    console.log('Fecha solicitada:', validatedDate);
    console.log('Fecha objeto:', date);
    console.log('Día de la semana:', dayOfWeek);
    console.log('Interval minutes:', intervalMinutes);
    console.log('Bloques ocupados de Google Calendar:', JSON.stringify(busyBlocksFromGoogle, null, 2));
    
    /**
     * Filtrado y validación de bloques de Google Calendar
     * Asegura que los bloques tengan propiedades start y end válidas
     * Convierte tipos de Google Calendar API a nuestro tipo BusyBlock
     */
    const validBusyBlocks: BusyBlock[] = busyBlocksFromGoogle
      .filter(block => 
        block.start && 
        block.end && 
        typeof block.start === 'string' && 
        typeof block.end === 'string'
      )
      .map(block => ({
        start: block.start as string,
        end: block.end as string
      }));

    // ========================================
    // PASO 8: COMBINACIÓN DE BLOQUES OCUPADOS
    // ========================================
    
    /**
     * Combina todos los bloques de tiempo ocupados:
     * 1. Eventos de Google Calendar (citas existentes)
     * 2. Tiempos de descanso configurados del doctor
     * 
     * Convierte horarios de descanso (HH:MM) a formato ISO 8601 usando la zona horaria del doctor
     */
    const allBusyBlocks: BusyBlock[] = [
      // Eventos de Google Calendar ya validados
      ...validBusyBlocks,
      
      // Descansos del doctor convertidos a formato ISO con zona horaria correcta
      ...breakTimes
        .filter(bt => bt.startTime && bt.endTime) // Validar que existan horarios
        .map(bt => {
          // Crear fechas en la zona horaria del doctor usando la función auxiliar
          const breakStart = createDateInTimezone(validatedDate, `${bt.startTime}:00`, doctorTimezone);
          const breakEnd = createDateInTimezone(validatedDate, `${bt.endTime}:00`, doctorTimezone);
          
          console.log(`DEBUG Break time: ${bt.startTime}-${bt.endTime} -> ${breakStart.toISOString()}-${breakEnd.toISOString()}`);
          
          return {
            start: breakStart.toISOString(),
            end: breakEnd.toISOString(),
          };
        })
    ];
    
    // DEBUG: Log para verificar todos los bloques ocupados combinados
    console.log('Bloques válidos de Google Calendar:', JSON.stringify(validBusyBlocks, null, 2));
    console.log('Descansos del doctor:', JSON.stringify(breakTimes, null, 2));
    console.log('TODOS los bloques ocupados combinados:', JSON.stringify(allBusyBlocks, null, 2));

    // ========================================
    // PASO 9: GENERACIÓN DE SLOTS DISPONIBLES
    // ========================================
    
    /**
     * Array para almacenar los horarios disponibles calculados
     * Cada slot representa un período de tiempo libre para agendar citas
     */
    const availableSlots: TimeSlot[] = [];
    
    /**
     * Duración de cada cita en minutos
     * Se obtiene del parámetro de consulta 'interval', por defecto 30 minutos
     * Nota: Este valor sobrescribe la configuración del doctor para mayor flexibilidad
     */
    const appointmentDuration = intervalMinutes;
    
    // Validación: Los horarios de trabajo deben estar completos
    if (!daySchedule.startTime || !daySchedule.endTime) {
      return NextResponse.json(
        { error: 'Horarios de trabajo incompletos' }, 
        { status: 400 }
      );
    }
    
    /**
     * Conversión de horarios de trabajo a objetos Date
     * Formato de entrada: "HH:MM" -> Formato de salida: Date ISO 8601
     * Ahora usa la zona horaria del doctor usando la función auxiliar
     */
    const dayStart = createDateInTimezone(validatedDate, `${daySchedule.startTime}:00`, doctorTimezone);
    const dayEnd = createDateInTimezone(validatedDate, `${daySchedule.endTime}:00`, doctorTimezone);
    
    // DEBUG: Log para verificar las fechas de trabajo
    console.log('=== DEBUG HORARIOS DE TRABAJO ===');
    console.log('Doctor timezone:', doctorTimezone);
    console.log('Date param:', validatedDate);
    console.log('Day schedule start time:', daySchedule.startTime);
    console.log('Day schedule end time:', daySchedule.endTime);
    console.log('Day start (timezone adjusted):', dayStart);
    console.log('Day end (timezone adjusted):', dayEnd);
    console.log('Day start ISO:', dayStart.toISOString());
    console.log('Day end ISO:', dayEnd.toISOString());

    /**
     * ALGORITMO DE GENERACIÓN DE SLOTS:
     * 1. Inicia desde el horario de inicio del doctor
     * 2. Genera slots de duración appointmentDuration
     * 3. Verifica que no se solape con bloques ocupados
     * 4. Avanza al siguiente slot posible
     * 5. Continúa hasta el horario de fin del doctor
     */
    let currentSlotStart = dayStart;

    while (currentSlotStart < dayEnd) {
      // Calcular el fin del slot actual
      const currentSlotEnd = new Date(
        currentSlotStart.getTime() + appointmentDuration * 60000
      );

      // Si el slot se extiende más allá del horario de trabajo, terminar
      if (currentSlotEnd > dayEnd) {
        break;
      }

      // Verificar si el slot está libre (no se solapa con bloques ocupados)
      const hasOverlap = isOverlapping(currentSlotStart, currentSlotEnd, allBusyBlocks);
      
      // DEBUG: Log para cada slot evaluado
      console.log(`Evaluando slot: ${currentSlotStart.toISOString()} - ${currentSlotEnd.toISOString()}`);
      console.log(`¿Tiene solapamiento?: ${hasOverlap}`);
      
      if (!hasOverlap) {
        console.log('✅ Slot agregado como disponible');
        availableSlots.push({
          start: currentSlotStart.toISOString(),
          end: currentSlotEnd.toISOString(),
        });
      }

      // Avanzar al siguiente slot posible
      currentSlotStart = new Date(
        currentSlotStart.getTime() + appointmentDuration * 60000
      );
    }

    // Retornar los slots disponibles en formato JSON
    return NextResponse.json(availableSlots);

  } catch (error) {
    // ========================================
    // MANEJO DE ERRORES
    // ========================================
    
    /**
     * Manejo centralizado de errores del endpoint
     * 
     * Posibles fuentes de error:
     * - Autenticación de API Key
     * - Validación de parámetros con Zod
     * - Conexión a base de datos MySQL (Drizzle ORM)
     * - Google Calendar API v3 (autenticación, límites de rate, red)
     * - Parsing de datos JSON (working_hours, break_times)
     * - Conversión de fechas y horarios
     * 
     * @param {Error} error - Error capturado durante la ejecución
     */
    console.error('Error al obtener la disponibilidad del doctor (N8N API):', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    /**
     * Respuesta de error genérica para el cliente
     * No expone detalles internos por seguridad
     */
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: X-API-Key
 *   schemas:
 *     TimeSlot:
 *       type: object
 *       required:
 *         - start
 *         - end
 *       properties:
 *         start:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de inicio en formato ISO 8601
 *           example: "2025-07-02T09:00:00.000Z"
 *         end:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de fin en formato ISO 8601
 *           example: "2025-07-02T09:30:00.000Z"
 *     
 *     ErrorResponse:
 *       type: object
 *       required:
 *         - error
 *       properties:
 *         error:
 *           type: string
 *           description: Mensaje de error descriptivo
 *           example: "API Key requerida en el header X-API-Key"
 */