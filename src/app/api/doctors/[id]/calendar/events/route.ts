import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { getDoctorEvents } from '@/lib/calendar-event-retriever';
import { BreakTimeType, BREAK_TIME_TYPES } from '@/types/google-calendar';

/**
 * @fileoverview API endpoint para obtener eventos del calendario de un doctor.
 * @description Este endpoint permite obtener eventos (citas o descansos) de un doctor
 * en un rango de fechas, con opciones de filtrado por tipo de evento, estado de cita
 * o tipo de descanso.
 * 
 * @route GET /api/doctors/[id]/calendar/events
 * @param {string} id - ID del doctor (parámetro de ruta)
 * @param {string} startDate - Fecha de inicio en formato YYYY-MM-DD (parámetro de consulta)
 * @param {string} endDate - Fecha de fin en formato YYYY-MM-DD (parámetro de consulta)
 * @param {string} [eventType] - Tipo de evento a filtrar ('appointment' o 'break')
 * @param {string} [appointmentStatus] - Estado de la cita a filtrar (ej. "Confirmada", "Completada")
 * @param {string} [breakTimeType] - Tipo de descanso a filtrar ('lunch', 'personal', 'meeting', 'other')
 * 
 * @returns {Array<AppointmentEventData | BreakTimeEventData>} Array de eventos.
 * @returns {Object} Error object en caso de fallo.
 * 
 * @example
 * // Obtener todas las citas y descansos para el doctor 123 entre dos fechas
 * GET /api/doctors/123/calendar/events?startDate=2025-07-01&endDate=2025-07-31
 * 
 * @example
 * // Obtener solo citas confirmadas para el doctor 123
 * GET /api/doctors/123/calendar/events?startDate=2025-07-01&endDate=2025-07-31&eventType=appointment&appointmentStatus=Confirmada
 * 
 * @example
 * // Obtener solo descansos de tipo 'lunch' para el doctor 123
 * GET /api/doctors/123/calendar/events?startDate=2025-07-01&endDate=2025-07-31&eventType=break&breakTimeType=lunch
 * 
 * @swagger
 * /api/doctors/{id}/calendar/events:
 *   get:
 *     summary: Obtener eventos del calendario de un doctor
 *     description: Permite obtener eventos (citas o descansos) de un doctor en un rango de fechas, con opciones de filtrado.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del doctor.
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio para la consulta (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin para la consulta (YYYY-MM-DD).
 *       - in: query
 *         name: eventType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [appointment, break]
 *         description: Tipo de evento a filtrar.
 *       - in: query
 *         name: appointmentStatus
 *         required: false
 *         schema:
 *           type: string
 *         description: Estado de la cita a filtrar (solo si eventType es 'appointment').
 *       - in: query
 *         name: breakTimeType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [lunch, personal, meeting, other]
 *         description: Tipo de descanso a filtrar (solo si eventType es 'break').
 *     responses:
 *       200:
 *         description: Lista de eventos del calendario.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/AppointmentEventData'
 *                   - $ref: '#/components/schemas/BreakTimeEventData'
 *       400:
 *         description: Parámetros inválidos.
 *       404:
 *         description: Doctor no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('API: /api/doctors/[id]/calendar/events - Request received');
  try {
    const { id } = await params;
    const doctorId = parseInt(id, 10);
    console.debug(`Parsed doctorId: ${doctorId}`);
    
    if (isNaN(doctorId)) {
      console.error(`Validation Error: Invalid doctor ID: ${id}`);
      return NextResponse.json(
        { error: 'Invalid doctor ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const eventType = searchParams.get('eventType');
    const appointmentStatus = searchParams.get('appointmentStatus');
    const breakTimeType = searchParams.get('breakTimeType');

    console.debug(`Request Params: startDate=${startDateParam}, endDate=${endDateParam}, eventType=${eventType}, appointmentStatus=${appointmentStatus}, breakTimeType=${breakTimeType}`);

    if (!startDateParam || !endDateParam) {
      console.error('Validation Error: startDate and endDate are required.');
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const startDate = DateTime.fromISO(startDateParam, { zone: 'utc' });
    const endDate = DateTime.fromISO(endDateParam, { zone: 'utc' });

    if (!startDate.isValid || !endDate.isValid) {
      console.error(`Validation Error: Invalid date format for startDate=${startDateParam} or endDate=${endDateParam}`);
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD format' },
        { status: 400 }
      );
    }
    console.debug(`Parsed Date Range: startDate=${startDate.toISO()}, endDate=${endDate.toISO()}`);

    const filters: {
      eventType?: 'appointment' | 'break';
      appointmentStatus?: string;
      breakTimeType?: BreakTimeType;
    } = {};

    if (eventType === 'appointment' || eventType === 'break') {
      filters.eventType = eventType;
    }
    if (appointmentStatus) {
      filters.appointmentStatus = appointmentStatus;
    }
    if (breakTimeType && BREAK_TIME_TYPES.includes(breakTimeType as BreakTimeType)) {
      filters.breakTimeType = breakTimeType as BreakTimeType;
    }
    console.debug('Applied Filters:', filters);

    console.log('Calling getDoctorEvents...');
    const events = await getDoctorEvents(
      doctorId,
      startDate,
      endDate,
      filters
    );
    console.log(`Received ${events.length} events from getDoctorEvents.`);
    console.debug('Retrieved Events:', events);

    return NextResponse.json({
      success: true,
      data: {
        events: events,
        dateRange: {
          start: startDate.toISODate(),
          end: endDate.toISODate(),
        },
        count: events.length,
      },
    });
  } catch (error) {
    console.error('Error getting doctor calendar events:', {
      doctorId: (await params).id, // Access doctorId from params for error logging
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}