
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { doctors } from '@/db/schema/doctors';
import { eq } from 'drizzle-orm';
import { googleCalendarService } from '@/lib/google-calendar';
import type { WorkingHours, DaySchedule } from '@/types/working-hours';

/**
 * @fileoverview API endpoint para obtener la disponibilidad de horarios de un doctor específico
 * @description Este endpoint calcula los horarios disponibles de un doctor para una fecha específica,
 * considerando sus horarios de trabajo, descansos y eventos existentes en Google Calendar.
 * 
 * @route GET /api/doctors/[id]/availability
 * @param {string} id - ID del doctor (parámetro de ruta)
 * @param {string} date - Fecha en formato YYYY-MM-DD (parámetro de consulta)
 * @param {number} [interval] - Duración del intervalo en minutos (parámetro de consulta opcional, por defecto 30)
 * 
 * @returns {Array<TimeSlot>} Array de horarios disponibles
 * @returns {Object} Error object en caso de fallo
 * 
 * @example
 * // Obtener disponibilidad para el doctor con ID 123 el 2 de julio de 2025 con intervalos de 30 minutos
 * GET /api/doctors/123/availability?date=2025-07-02
 * 
 * @example
 * // Obtener disponibilidad con intervalos de 15 minutos
 * GET /api/doctors/123/availability?date=2025-07-02&interval=15
 * 
 * @swagger
 * /api/doctors/{id}/availability:
 *   get:
 *     summary: Obtiene la disponibilidad de horarios de un doctor
 *     description: Calcula los horarios disponibles considerando horarios de trabajo, descansos y eventos de Google Calendar
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del doctor
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
 *           type: integer
 *           minimum: 5
 *           maximum: 120
 *           default: 30
 *         description: Duración del intervalo en minutos (5-120 minutos)
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
 *         description: Parámetros inválidos
 *       404:
 *         description: Doctor no encontrado
 *       500:
 *         description: Error interno del servidor
 */

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
    
    // Algoritmo de detección de solapamiento: slotStart < blockEnd && slotEnd > blockStart
    if (slotStart < blockEnd && slotEnd > blockStart) {
      return true;
    }
  }
  return false;
}

/**
 * Endpoint GET para obtener la disponibilidad de horarios de un doctor
 * 
 * @description Implementa un algoritmo completo de cálculo de disponibilidad que:
 * 1. Valida los parámetros de entrada (ID del doctor y fecha)
 * 2. Consulta la información del doctor desde la base de datos MySQL usando Drizzle ORM
 * 3. Obtiene eventos ocupados desde Google Calendar API v3
 * 4. Combina horarios de trabajo, descansos y eventos para calcular disponibilidad
 * 5. Genera slots de tiempo disponibles basados en la duración de citas configurada
 * 
 * @param {NextRequest} request - Objeto de solicitud de Next.js con parámetros de consulta
 * @param {Object} context - Contexto de la ruta dinámica
 * @param {Promise<{id: string}>} context.params - Parámetros de ruta (ID del doctor)
 * 
 * @returns {Promise<NextResponse<TimeSlot[] | {error: string}>>} 
 * - 200: Array de horarios disponibles
 * - 400: Error de validación de parámetros
 * - 404: Doctor no encontrado o sin configuración
 * - 500: Error interno del servidor
 * 
 * @throws {Error} Error de base de datos o Google Calendar API
 * 
 * @example
 * // Solicitud exitosa con intervalos de 30 minutos (por defecto)
 * GET /api/doctors/123/availability?date=2025-07-02
 * Response: [
 *   { start: "2025-07-02T09:00:00.000Z", end: "2025-07-02T09:30:00.000Z" },
 *   { start: "2025-07-02T09:30:00.000Z", end: "2025-07-02T10:00:00.000Z" }
 * ]
 * 
 * @example
 * // Solicitud con intervalos de 15 minutos
 * GET /api/doctors/123/availability?date=2025-07-02&interval=15
 * Response: [
 *   { start: "2025-07-02T09:00:00.000Z", end: "2025-07-02T09:15:00.000Z" },
 *   { start: "2025-07-02T09:15:00.000Z", end: "2025-07-02T09:30:00.000Z" },
 *   { start: "2025-07-02T09:30:00.000Z", end: "2025-07-02T09:45:00.000Z" }
 * ]
 * 
 * @example
 * // Error de validación
 * GET /api/doctors/abc/availability
 * Response: { error: "El doctorId no es válido" }
 * 
 * @since 1.0.0
 * @version 1.2.0
 * @author Sistema de Gestión de Citas
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<TimeSlot[] | { error: string }>> {
  // Extraer parámetros de consulta de la URL
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date'); // Formato esperado: YYYY-MM-DD
  const intervalParam = searchParams.get('interval'); // Duración del intervalo en minutos

  // Validación: El parámetro 'date' es obligatorio
  if (!dateParam) {
    return NextResponse.json(
      { error: 'El parámetro "date" es requerido' }, 
      { status: 400 }
    );
  }

  // Validación y conversión del parámetro 'interval'
  let intervalMinutes = 30; // Valor por defecto
  if (intervalParam) {
    const parsedInterval = parseInt(intervalParam, 10);
    if (isNaN(parsedInterval) || parsedInterval < 5 || parsedInterval > 120) {
      return NextResponse.json(
        { error: 'El parámetro "interval" debe ser un número entre 5 y 120 minutos' }, 
        { status: 400 }
      );
    }
    intervalMinutes = parsedInterval;
  }

  // Convertir fecha y calcular día de la semana (0=Domingo, 6=Sábado)
  const date = new Date(dateParam);
  const dayOfWeek = date.getUTCDay();
  
  // Resolver parámetros de ruta dinámicos (Next.js 15+)
  const resolvedParams = await params;
  const doctorId = parseInt(resolvedParams.id, 10);

  // Validación: El ID del doctor debe ser un número válido
  if (isNaN(doctorId)) {
    return NextResponse.json(
      { error: 'El doctorId no es válido' }, 
      { status: 400 }
    );
  }

  try {
    // ========================================
    // PASO 1: CONSULTA DE INFORMACIÓN DEL DOCTOR
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
    // PASO 2: FILTRADO POR DÍA DE LA SEMANA
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
    // PASO 3: CONSULTA DE GOOGLE CALENDAR API
    // ========================================
    
    /**
     * Obtiene eventos ocupados del calendario de Google del doctor
     * Utiliza Google Calendar API v3 para consultar eventos del día específico
     */
    const busyBlocksFromGoogle = await googleCalendarService.getBusySlotsForDay(
      doctor.calendar_id, 
      date
    );
    
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
    // PASO 4: COMBINACIÓN DE BLOQUES OCUPADOS
    // ========================================
    
    /**
     * Combina todos los bloques de tiempo ocupados:
     * 1. Eventos de Google Calendar (citas existentes)
     * 2. Tiempos de descanso configurados del doctor
     * 
     * Convierte horarios de descanso (HH:MM) a formato ISO 8601
     */
    const allBusyBlocks: BusyBlock[] = [
      // Eventos de Google Calendar ya validados
      ...validBusyBlocks,
      
      // Descansos del doctor convertidos a formato ISO
      ...breakTimes
        .filter(bt => bt.startTime && bt.endTime) // Validar que existan horarios
        .map(bt => ({
          start: new Date(`${dateParam}T${bt.startTime}:00.000Z`).toISOString(),
          end: new Date(`${dateParam}T${bt.endTime}:00.000Z`).toISOString(),
        }))
    ];

    // ========================================
    // PASO 5: GENERACIÓN DE SLOTS DISPONIBLES
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
     */
    const dayStart = new Date(`${dateParam}T${daySchedule.startTime}:00.000Z`);
    const dayEnd = new Date(`${dateParam}T${daySchedule.endTime}:00.000Z`);

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
      if (!isOverlapping(currentSlotStart, currentSlotEnd, allBusyBlocks)) {
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
     * - Conexión a base de datos MySQL (Drizzle ORM)
     * - Google Calendar API v3 (autenticación, límites de rate, red)
     * - Parsing de datos JSON (working_hours, break_times)
     * - Conversión de fechas y horarios
     * 
     * @param {Error} error - Error capturado durante la ejecución
     */
    console.error('Error al obtener la disponibilidad del doctor:', {
      doctorId,
      date: dateParam,
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
 *           example: "El parámetro 'date' es requerido"
 */
