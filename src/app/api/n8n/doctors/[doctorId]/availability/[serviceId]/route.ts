import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { getDoctorAvailability } from '@/lib/calendar-event-retriever';
import { db } from '@/db';
import { doctors } from '@/db/schema/doctors';
import { medicalServices } from '@/db/schema/medical_services';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// === API Key Authentication ===

/**
 * @description Autentica la solicitud usando API Key.
 * @param {NextRequest} request - La solicitud a autenticar.
 * @returns {Promise<{ success: boolean; error?: string }>} Resultado de la autenticación.
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
 * @typedef {Object} TimeSlot
 * @property {string} start - Hora de inicio en formato ISO.
 * @property {string} end - Hora de fin en formato ISO.
 */
type TimeSlot = {
  start: string;
  end: string;
};

/**
 * @description Obtiene los slots de disponibilidad para un doctor y servicio específico en una fecha dada.
 * @param {NextRequest} request - La solicitud entrante.
 * @param {{ params: Promise<{ doctorId: string, serviceId: string }> }} context - Contexto con parámetros.
 * @returns {Promise<NextResponse<{ intervals: TimeSlot[]; timezone: string } | { error: string }>>} Respuesta con slots disponibles o error.
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ doctorId: string, serviceId: string }> }
): Promise<NextResponse<{ intervals: TimeSlot[]; timezone: string } | { error: string }>> {
  console.log('API: /api/n8n/doctors/[doctorId]/availability/[serviceId] - Request received');
  
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

  // Validación con Zod
  const querySchema = z.object({
    date: z.string().refine((val) => DateTime.fromISO(val).isValid, { message: 'Formato de fecha inválido. Use YYYY-MM-DD.' }),
  });

  const paramsSchema = z.object({
    doctorId: z.string().refine((val) => !isNaN(parseInt(val, 10)), { message: 'El doctorId debe ser un número válido' }),
    serviceId: z.string().refine((val) => !isNaN(parseInt(val, 10)), { message: 'El serviceId debe ser un número válido' }),
  });

  try {
    querySchema.parse({ date: dateParam });
    const resolvedParams = await params;
    paramsSchema.parse(resolvedParams);
  } catch (error) {
    console.error('Validation Error:', error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors[0].message : 'Parámetros inválidos' },
      { status: 400 }
    );
  }

  console.debug(`Request Params: date=${dateParam}`);

  if (!dateParam) {
    console.error('Validation Error: "date" parameter is required.');
    return NextResponse.json(
      { error: 'El parámetro "date" es requerido' }, 
      { status: 400 }
    );
  }

  const resolvedParams = await params;
  const doctorId = parseInt(resolvedParams.doctorId, 10);
  const serviceId = parseInt(resolvedParams.serviceId, 10);
  console.debug(`Parsed doctorId: ${doctorId}, serviceId: ${serviceId}`);

  try {
    console.log(`Attempting to get availability for doctor ${doctorId} on ${dateParam} with service ${serviceId}`);

    // Fetch doctor's timezone
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, doctorId),
    });
    if (!doctor || !doctor.calendar_timezone) {
      throw new Error('Doctor or timezone not found');
    }
    const doctorTimezone = doctor.calendar_timezone;

    // Fetch service duration
    const service = await db.query.medicalServices.findFirst({
      where: eq(medicalServices.id, serviceId),
    });
    if (!service) {
      throw new Error('Service not found');
    }
    const intervalMinutes = service.durationMinutes;
    if (intervalMinutes < 5) {
      throw new Error('Invalid service duration');
    }
    console.debug(`Service duration: ${intervalMinutes} minutes`);

    const targetDate = DateTime.fromISO(dateParam!, { zone: doctorTimezone });

    const startDate = targetDate.startOf('day');
    const endDate = targetDate.endOf('day');
    console.debug(`Date Range: startDate=${startDate.toISO()}, endDate=${endDate.toISO()}, timezone=${doctorTimezone}`);

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
          start: currentSlotStart.toISO({ includeOffset: false }) || '',
          end: currentSlotEnd.toISO({ includeOffset: false }) || '',
        });
        console.debug(`Generated slot: ${currentSlotStart.toISO()} - ${currentSlotEnd.toISO()}`);
        currentSlotStart = currentSlotEnd;
      }
    }
    console.log(`Generated ${availableSlots.length} final available slots.`);
    console.debug('Final available slots:', availableSlots);

    return NextResponse.json({
      intervals: availableSlots,
      timezone: doctorTimezone
    });

  } catch (error) {
    console.error('Error al obtener la disponibilidad del doctor:', {
      doctorId,
      serviceId,
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