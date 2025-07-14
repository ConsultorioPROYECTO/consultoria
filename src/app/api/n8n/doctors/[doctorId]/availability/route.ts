/**
 * @fileoverview API endpoint para obtener la disponibilidad de horarios de un doctor específico con autenticación API Key
 * 
 * Este módulo implementa el endpoint GET seguro para calcular y retornar los horarios disponibles de un doctor
 * en una fecha específica, integrando datos de horarios de trabajo de la base de datos y eventos de Google Calendar.
 * Requiere autenticación mediante API Key para acceso controlado desde sistemas externos como n8n.
 * 
 * **Características clave:**
 * - Autenticación segura con API Key
 * - Cálculo dinámico de intervalos disponibles
 * - Soporte para intervalos personalizables (5-120 minutos)
 * - Manejo de zonas horarias con Luxon
 * - Validación estricta y logging detallado
 * 
 * **Dependencias principales:**
 * - `@/lib/calendar-event-retriever`: Lógica de disponibilidad
 * - `luxon`: Manejo de fechas
 * - `next/server`: Next.js API routes
 * 
 * **Endpoint disponible:**
 * - GET /api/n8n/doctors/[doctorId]/availability?date=YYYY-MM-DD&interval=MINUTES
 * 
 * **Mejoras recientes:**
 * - Añadida autenticación API Key (versión 1.2.0)
 * - Integración con ignoreEventId (versión 1.3.0)
 * - Optimizaciones de performance
 * 
 * @author Santiago Prada - Backend Developer
 * @version 1.3.0
 * @since 2025-07-02
 */

import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { getDoctorAvailability } from '@/lib/calendar-event-retriever';

// === API Key Authentication ===

/**
 * Autentica solicitudes usando API Key de los headers.
 * 
 * Verifica la presencia y validez de la API Key contra la variable de entorno N8N_API_KEY.
 * 
 * @param {NextRequest} request - La solicitud HTTP entrante
 * @returns {Promise<{success: boolean, error?: string}>} Resultado de la autenticación
 * 
 * @example
 * const auth = await authenticateApiKey(request);
 * if (!auth.success) {
 *   return NextResponse.json({ error: auth.error }, { status: 401 });
 * }
 */
async function authenticateApiKey(request: NextRequest): Promise<{
  success: boolean;
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

    return {
      success: true
    };
  } catch (error) {
    console.error('Error en autenticación de API Key:', error);
    return {
      success: false,
      error: 'Error interno de autenticación'
    };
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

/**
 * Endpoint GET para obtener la disponibilidad de horarios de un doctor con autenticación API Key.
 * 
 * @description Calcula horarios disponibles con autenticación segura. Utiliza getDoctorAvailability
 * para la lógica principal.
 * 
 * **Proceso:**
 * 1. Autenticar API Key
 * 2. Validar parámetros
 * 3. Calcular intervalos disponibles
 * 4. Generar slots de tiempo
 * 
 * **Manejo de errores:**
 * - 401: Autenticación fallida
 * - 400: Parámetros inválidos
 * - 500: Errores internos
 * 
 * @param {NextRequest} request - Solicitud con parámetros de consulta
 * @param {Object} context - Contexto de ruta
 * @param {Promise<{doctorId: string}>} context.params - ID del doctor
 * 
 * @returns {Promise<NextResponse<TimeSlot[] | {error: string}>>}
 * 
 * @example
 * GET /api/n8n/doctors/123/availability?date=2025-07-02
 * Headers: { "X-API-Key": "your-api-key" }
 * Response: [{ start: "2025-07-02T09:00:00.000Z", end: "2025-07-02T09:30:00.000Z" }]
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ doctorId: string }> }
): Promise<NextResponse<TimeSlot[] | { error: string }>> {
  console.log('API: /api/n8n/doctors/[doctorId]/availability - Request received');
  
  // 1. Autenticar usando API Key
  const authResult = await authenticateApiKey(request);
  
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error || 'Autenticación fallida' }, 
      { status: 401 }
    );
  }

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
  const doctorId = parseInt(resolvedParams.doctorId, 10);
  console.debug(`Parsed doctorId: ${doctorId}`);

  if (isNaN(doctorId)) {
    console.error(`Validation Error: Invalid doctorId: ${resolvedParams.doctorId}`);
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