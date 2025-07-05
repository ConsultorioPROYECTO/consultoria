
import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { getDoctorAvailability } from '@/lib/calendar-event-retriever';

/**
 * @fileoverview API endpoint para obtener la disponibilidad de horarios de un doctor específico
 * @description Este endpoint calcula los horarios disponibles de un doctor para una fecha específica,
 * utilizando la lógica centralizada en `calendar-event-retriever.ts` que combina horarios de trabajo,
 * descansos y eventos existentes en Google Calendar.
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
 * Endpoint GET para obtener la disponibilidad de horarios de un doctor
 * 
 * @description Este endpoint ahora utiliza la función `getDoctorAvailability`
 * de `src/lib/calendar-event-retriever.ts` para calcular la disponibilidad,
 * simplificando la lógica de este controlador de API.
 * 
 * @param {NextRequest} request - Objeto de solicitud de Next.js con parámetros de consulta
 * @param {Object} context - Contexto de la ruta dinámica
 * @param {Promise<{id: string}>} context.params - Parámetros de ruta (ID del doctor)
 * 
 * @returns {Promise<NextResponse<TimeSlot[] | {error: string}>>} 
 * - 200: Array de horarios disponibles
 * - 400: Error de validación de parámetros
 * - 404: Doctor no encontrado
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
 * @version 1.3.0
 * @author Sistema de Gestión de Citas
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<TimeSlot[] | { error: string }>> {
  console.log('API: /api/doctors/[id]/availability - Request received');
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const intervalParam = searchParams.get('interval');

  console.debug(`Request Params: date=${dateParam}, interval=${intervalParam}`);

  if (!dateParam) {
    console.error('Validation Error: "date" parameter is required.');
    return NextResponse.json(
      { error: 'El parámetro "date" es requerido' }, 
      { status: 400 }
    );
  }

  let intervalMinutes = 30;
  if (intervalParam) {
    const parsedInterval = parseInt(intervalParam, 10);
    if (isNaN(parsedInterval) || parsedInterval < 5 || parsedInterval > 120) {
      console.error(`Validation Error: Invalid "interval" parameter: ${intervalParam}`);
      return NextResponse.json(
        { error: 'El parámetro "interval" debe ser un número entre 5 y 120 minutos' }, 
        { status: 400 }
      );
    }
    intervalMinutes = parsedInterval;
  }
  console.debug(`Parsed intervalMinutes: ${intervalMinutes}`);

  const resolvedParams = await params;
  const doctorId = parseInt(resolvedParams.id, 10);
  console.debug(`Parsed doctorId: ${doctorId}`);

  if (isNaN(doctorId)) {
    console.error(`Validation Error: Invalid doctorId: ${resolvedParams.id}`);
    return NextResponse.json(
      { error: 'El doctorId no es válido' }, 
      { status: 400 }
    );
  }

  try {
    console.log(`Attempting to get availability for doctor ${doctorId} on ${dateParam}`);
    const targetDate = DateTime.fromISO(dateParam, { zone: 'utc' });
    if (!targetDate.isValid) {
      console.error(`Validation Error: Invalid date format for ${dateParam}`);
      return NextResponse.json(
        { error: 'Formato de fecha inválido. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const startDate = targetDate.startOf('day');
    const endDate = targetDate.endOf('day');
    console.debug(`Date Range: startDate=${startDate.toISO()}, endDate=${endDate.toISO()}`);

    console.log('Calling getDoctorAvailability...');
    const availableIntervals = await getDoctorAvailability(
      doctorId,
      startDate,
      endDate
    );
    console.log(`Received ${availableIntervals.length} available intervals from getDoctorAvailability.`);
    console.debug('Raw available intervals:', availableIntervals.map(i => i.toISO()));

    const availableSlots: TimeSlot[] = [];
    for (const interval of availableIntervals) {
      let currentSlotStart = interval.start!;
      console.debug(`Processing interval: ${interval.start!.toISO()} - ${interval.end!.toISO()}`);
      while (currentSlotStart.plus({ minutes: intervalMinutes }) <= interval.end!) {
        const currentSlotEnd = currentSlotStart.plus({ minutes: intervalMinutes });
        availableSlots.push({
          start: currentSlotStart.toISO() || '',
          end: currentSlotEnd.toISO() || '',
        });
        console.debug(`Generated slot: ${currentSlotStart.toISO()} - ${currentSlotEnd.toISO()}`);
        currentSlotStart = currentSlotEnd;
      }
    }
    console.log(`Generated ${availableSlots.length} final available slots.`);
    console.debug('Final available slots:', availableSlots);

    return NextResponse.json(availableSlots);

  } catch (error) {
    console.error('Error al obtener la disponibilidad del doctor:', {
      doctorId,
      date: dateParam,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}

