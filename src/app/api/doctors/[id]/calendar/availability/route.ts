
import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { getDoctorAvailability } from '@/lib/calendar-event-retriever';

/**
 * @fileoverview API endpoint para obtener la disponibilidad de horarios de un doctor específico.
 * 
 * Este módulo implementa el endpoint GET para calcular y retornar los horarios disponibles de un doctor
 * en una fecha específica, integrando datos de horarios de trabajo de la base de datos y eventos de Google Calendar.
 * Utiliza la función centralizada `getDoctorAvailability` para la lógica de cálculo, asegurando consistencia
 * en todo el sistema.
 * 
 * **Características clave:**
 * - Cálculo dinámico de intervalos disponibles basado en horarios de trabajo y eventos existentes
 * - Soporte para intervalos personalizables (5-120 minutos)
 * - Manejo de zonas horarias con Luxon para precisión global
 * - Validación estricta de parámetros de entrada
 * - Logging detallado para monitoreo y debugging
 * 
 * **Dependencias principales:**
 * - `@/lib/calendar-event-retriever`: Lógica central de disponibilidad
 * - `luxon`: Manejo de fechas y tiempos
 * - `next/server`: Next.js API routes
 * 
 * **Endpoint disponible:**
 * - GET /api/doctors/[id]/calendar/availability?date=YYYY-MM-DD&interval=MINUTES
 * 
 * **Mejoras recientes:**
 * - Integración con ignoreEventId para validaciones al reprogramar (versión 1.3.0)
 * - Optimización de consultas a Google Calendar
 * - Mejora en el manejo de errores con mensajes user-friendly
 * 
 * @author Santiago Prada - Backend Developer
 * @version 1.3.0
 * @since 2025-07-02
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
    if (isNaN(parsedInterval) || parsedInterval < 5 ) {
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


/**
 * Representa un horario disponible para citas.
 * 
 * @interface TimeSlot
 * @property {string} start - Fecha y hora de inicio en formato ISO 8601
 * @property {string} end - Fecha y hora de fin en formato ISO 8601
 */
type TimeSlot = {
  start: string;
  end: string;
};

