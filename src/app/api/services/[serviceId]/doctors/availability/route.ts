import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { getDoctorAvailability } from '@/lib/calendar-event-retriever';
import { db } from '@/db';
import { doctors } from '@/db/schema/doctors';
import { users } from '@/db/schema/users';
import { medicalServices } from '@/db/schema/medical_services';
import { doctorServices } from '@/db/schema/doctor_services';
import { eq, and } from 'drizzle-orm';
import {
  ServiceDoctorsAvailabilityResponse,
  ServiceAvailabilityError,
  DoctorAvailabilityInfo,
  DoctorAvailabilityByDate,
  TimePeriod,
  TimeInterval,
  IntervalsByPeriodSummary,
} from '@/types/doctor-availability';

/**
 * @fileoverview API endpoint para obtener la disponibilidad de doctores por servicio médico
 * @version 1.0.0
 * @author Santiago Prada - Backend Developer
 * @date 2025-07-24
 * @since 1.0.0
 * @module ServiceDoctorsAvailabilityAPI
 *
 * @description
 * Esta API permite obtener la disponibilidad de horarios de todos los doctores
 * que pueden ofrecer un servicio médico específico. La API calcula los intervalos
 * disponibles basándose en los horarios de trabajo de cada doctor y sus eventos
 * existentes en Google Calendar.
 *
 * **Características principales:**
 * - Consulta de disponibilidad por servicio médico específico
 * - Soporte para múltiples modos de consulta (completo y resumen)
 * - Filtrado por fecha específica o rango de fechas
 * - Agrupación de intervalos por períodos del día (mañana, tarde, noche)
 * - Validación estricta de parámetros de entrada
 * - Manejo de zonas horarias con Luxon
 *
 * **Modos de operación:**
 * 1. **Modo completo** (summaryOnly=false): Retorna todos los intervalos específicos
 * 2. **Modo resumen** (summaryOnly=true): Retorna solo disponibilidad por períodos
 *
 * **Parámetros de consulta soportados:**
 * - `date`: Fecha específica en formato YYYY-MM-DD
 * - `startDate`: Fecha de inicio para consulta de 7 días
 * - `limit`: Número máximo de doctores a procesar
 * - `summaryOnly`: Modo de respuesta (true/false)
 *
 * @example
 * ```typescript
 * // Consulta disponibilidad para fecha específica
 * GET /api/services/123/doctors/availability?date=2025-01-20
 *
 * // Consulta disponibilidad para 7 días desde fecha específica
 * GET /api/services/123/doctors/availability?startDate=2025-01-20
 *
 * // Consulta en modo resumen con límite
 * GET /api/services/123/doctors/availability?summaryOnly=true&limit=5
 * ```
 *
 * @requires next/server - Para NextRequest y NextResponse
 * @requires luxon - Para manejo de fechas y zonas horarias
 * @requires zod - Para validación de esquemas
 * @requires @/lib/calendar-event-retriever - Para lógica de disponibilidad
 * @requires @/db - Para conexión a base de datos con Drizzle ORM
 */

/**
 * Schema de validación para parámetros de consulta
 * Valida que no se usen date y startDate simultáneamente
 */
const QueryParamsSchema = z.object({
  serviceId: z.number().int().positive({
    message: 'El serviceId debe ser un número entero positivo'
  }),
  limit: z.number().int().min(1).max(50).optional(),
  summaryOnly: z.boolean().default(false),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'El formato de date debe ser YYYY-MM-DD'
  }).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'El formato de startDate debe ser YYYY-MM-DD'
  }).optional()
}).refine(
  (data) => !(data.date && data.startDate),
  {
    message: 'No se pueden usar los parámetros date y startDate simultáneamente',
    path: ['date', 'startDate']
  }
).refine(
  (data) => {
    if (data.date) {
      const dateObj = DateTime.fromISO(data.date);
      return dateObj.isValid;
    }
    return true;
  },
  {
    message: 'La fecha proporcionada en date no es válida',
    path: ['date']
  }
).refine(
  (data) => {
    if (data.startDate) {
      const dateObj = DateTime.fromISO(data.startDate);
      return dateObj.isValid;
    }
    return true;
  },
  {
    message: 'La fecha proporcionada en startDate no es válida',
    path: ['startDate']
  }
);

/**
 * Tipo inferido del schema de validación
 */
type QueryParams = z.infer<typeof QueryParamsSchema>;

/**
 * Convierte una fecha DateTime a formato largo en español
 * 
 * @param date - Objeto DateTime de Luxon
 * @returns Fecha formateada en español (ej: "lunes 20 de mayo de 2025")
 * 
 * @example
 * ```typescript
 * const date = DateTime.fromISO('2025-05-20');
 * const formatted = formatDateToLongSpanish(date);
 * // Returns: "martes 20 de mayo de 2025"
 * ```
 */
function formatDateToLongSpanish(date: DateTime): string {
  return date.setLocale('es').toFormat('cccc d \'de\' MMMM \'de\' yyyy');
}

/**
 * Determina el período del día basado en la hora de inicio
 * 
 * @param startTime - Hora en formato HH:mm (24 horas)
 * @returns Período del día correspondiente
 * 
 * @remarks
 * **Clasificación de períodos:**
 * - Mañana: 06:00 - 11:59
 * - Tarde: 12:00 - 17:59  
 * - Noche: 18:00 - 05:59 (del día siguiente)
 * 
 * @example
 * ```typescript
 * getTimePeriod('09:30'); // Returns: 'mañana'
 * getTimePeriod('14:15'); // Returns: 'tarde'
 * getTimePeriod('20:00'); // Returns: 'noche'
 * ```
 */
function getTimePeriod(startTime: string): TimePeriod {
  const hour = parseInt(startTime.split(':')[0], 10);
  
  if (hour >= 6 && hour < 12) {
    return 'mañana';
  } else if (hour >= 12 && hour < 18) {
    return 'tarde';
  } else {
    return 'noche';
  }
}

/**
 * Endpoint GET para obtener la disponibilidad de doctores por servicio médico
 * 
 * @description
 * Calcula y retorna los horarios disponibles de todos los doctores que pueden
 * ofrecer un servicio médico específico. La API integra datos de horarios de
 * trabajo de la base de datos con eventos existentes en Google Calendar para
 * proporcionar disponibilidad en tiempo real.
 * 
 * **Proceso de cálculo:**
 * 1. Validación de parámetros de entrada con Zod
 * 2. Verificación de existencia del servicio médico
 * 3. Consulta de doctores habilitados para el servicio
 * 4. Cálculo de disponibilidad por doctor usando getDoctorAvailability
 * 5. Agrupación de intervalos por día y período
 * 6. Formateo de respuesta según modo solicitado
 * 
 * **Validaciones implementadas:**
 * - serviceId debe ser un número entero positivo
 * - date y startDate no pueden usarse simultáneamente
 * - Formatos de fecha deben ser YYYY-MM-DD válidos
 * - limit debe estar entre 1 y 50 si se especifica
 * 
 * **Manejo de errores:**
 * - 400: Parámetros inválidos o conflictivos
 * - 404: Servicio médico no encontrado
 * - 500: Errores internos del servidor
 * 
 * @async
 * @function GET
 * @param {NextRequest} request - Objeto de solicitud HTTP de Next.js
 * @param {Object} context - Contexto de la ruta
 * @param {Promise<{serviceId: string}>} context.params - Parámetros de ruta
 * 
 * @returns {Promise<NextResponse<ServiceDoctorsAvailabilityResponse | ServiceAvailabilityError>>}
 * Respuesta HTTP con disponibilidad de doctores o error
 * 
 * @throws {Error} Cuando ocurren errores en consultas a base de datos o Google Calendar
 * 
 * @example
 * ```typescript
 * // Solicitud exitosa para fecha específica
 * GET /api/services/123/doctors/availability?date=2025-01-20
 * 
 * // Respuesta exitosa
 * {
 *   "availability": {
 *     "doctors": [
 *       {
 *         "idDoctor": 1,
 *         "doctorName": "Dr. Juan Pérez",
 *         "availability": {
 *           "lunes 20 de enero de 2025": {
 *             "intervals": {
 *               "mañana": [
 *                 { "startTime": "09:00", "endTime": "09:30" },
 *                 { "startTime": "09:30", "endTime": "10:00" }
 *               ]
 *             },
 *             "timeZone": "America/Bogota"
 *           }
 *         }
 *       }
 *     ]
 *   }
 * }
 * ```
 * 
 * @see {@link getDoctorAvailability} Para lógica de cálculo de disponibilidad
 * @see {@link QueryParamsSchema} Para validaciones de parámetros
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
): Promise<NextResponse<ServiceDoctorsAvailabilityResponse | ServiceAvailabilityError>> {
  console.log('API: /api/services/[serviceId]/doctors/availability - Request received');
  
  try {
    // Resolver parámetros de ruta
    const resolvedParams = await params;
    const serviceId = parseInt(resolvedParams.serviceId, 10);
    console.debug(`Parsed serviceId: ${serviceId}`);

    // Extraer y validar parámetros de consulta
    const { searchParams } = new URL(request.url);
    const rawParams = {
      serviceId,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
      summaryOnly: searchParams.get('summaryOnly') === 'true',
      date: searchParams.get('date') || undefined,
      startDate: searchParams.get('startDate') || undefined
    };
    
    console.debug('Raw query params:', rawParams);

    // Validar parámetros con Zod
    const validationResult = QueryParamsSchema.safeParse(rawParams);
    
    if (!validationResult.success) {
      console.error('Validation Error:', validationResult.error.errors);
      const errorMessages = validationResult.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      
      return NextResponse.json(
        { error: `Parámetros inválidos: ${errorMessages}` },
        { status: 400 }
      );
    }

    const validatedParams: QueryParams = validationResult.data;
    const { limit, summaryOnly, date: dateParam, startDate: startDateParam } = validatedParams;
    console.debug('Validated params:', validatedParams);

    /**
     * Procesar la solicitud de disponibilidad de doctores
     * Maneja toda la lógica de consulta y cálculo de disponibilidad
     */
    console.log(`Attempting to get doctors availability for service ${serviceId}`);

    /**
     * Verificar que el servicio médico existe y obtener su duración
     * La duración se usa para calcular los intervalos de tiempo disponibles
     */
    const service = await db.query.medicalServices.findFirst({
      where: eq(medicalServices.id, serviceId),
    });
    
    if (!service) {
      console.error(`Service with id ${serviceId} not found`);
      return NextResponse.json(
        { error: 'Servicio médico no encontrado' },
        { status: 404 }
      );
    }

    const intervalMinutes = service.durationMinutes;
    if (intervalMinutes < 5) {
      throw new Error('Invalid service duration');
    }
    console.debug(`Service duration: ${intervalMinutes} minutes`);

    /**
     * Buscar doctores habilitados para ofrecer este servicio médico
     * Solo se incluyen doctores con isAvailable=true en doctorServices
     */
    const availableDoctors = await db
      .select({
        idDoctor: doctors.idDoctor,
        doctorName: users.displayName,
        calendarTimezone: doctors.calendar_timezone,
        calendarId: doctors.calendar_id,
      })
      .from(doctorServices)
      .innerJoin(doctors, eq(doctorServices.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(
        and(
          eq(doctorServices.serviceId, serviceId),
          eq(doctorServices.isAvailable, true)
        )
      );

    if (availableDoctors.length === 0) {
      console.log(`No doctors found for service ${serviceId}`);
      return NextResponse.json({
        availability: {
          doctors: []
        }
      });
    }

    console.log(`Found ${availableDoctors.length} doctors for service ${serviceId}`);

    /**
     * Calcular fechas de consulta con prioridad:
     * 1. date específico (un solo día)
     * 2. startDate + 7 días
     * 3. próximos 7 días desde hoy (por defecto)
     */
    const now = DateTime.now().setZone('America/Bogota');
    let startDate: DateTime;
    let endDate: DateTime;
    
    if (dateParam) {
      // Fecha específica: usar solo ese día
      const specificDate = DateTime.fromISO(dateParam, { zone: 'America/Bogota' });
      if (!specificDate.isValid) {
        console.error('Validation Error: Invalid date format');
        return NextResponse.json(
          { error: 'Formato de fecha inválido. Use YYYY-MM-DD.' },
          { status: 400 }
        );
      }
      startDate = specificDate.startOf('day');
      endDate = specificDate.endOf('day');
      console.debug(`Using specific date: ${dateParam}`);
    } else if (startDateParam) {
      // Fecha de inicio personalizada: calcular 7 días desde esa fecha
      const customStartDate = DateTime.fromISO(startDateParam, { zone: 'America/Bogota' });
      if (!customStartDate.isValid) {
        console.error('Validation Error: Invalid startDate format');
        return NextResponse.json(
          { error: 'Formato de startDate inválido. Use YYYY-MM-DD.' },
          { status: 400 }
        );
      }
      startDate = customStartDate.startOf('day');
      endDate = startDate.plus({ days: 7 }).endOf('day');
      console.debug(`Using custom start date for 7 days: ${startDateParam}`);
    } else {
      // Por defecto: próximos 7 días desde hoy
      startDate = now.startOf('day');
      endDate = startDate.plus({ days: 7 }).endOf('day');
      console.debug('Using default 7-day range from today');
    }
    
    console.debug(`Date Range: startDate=${startDate.toISO()}, endDate=${endDate.toISO()}`);

    /**
     * Array para almacenar doctores con disponibilidad calculada
     * Solo se incluyen doctores que tienen al menos un intervalo disponible
     */
    const doctorsAvailability: DoctorAvailabilityInfo[] = [];
    
    /**
     * Aplicar límite de doctores a procesar si se especifica
     * Esto ayuda a optimizar el rendimiento cuando hay muchos doctores
     */
    const doctorsToProcess = limit ? availableDoctors.slice(0, limit) : availableDoctors;
    console.log(`Processing ${doctorsToProcess.length} doctors (limit applied: ${limit || 'none'})`);

    /**
     * Procesar cada doctor para calcular su disponibilidad
     * Se integran horarios de trabajo con eventos existentes en Google Calendar
     */
    for (const doctor of doctorsToProcess) {
      if (!doctor.calendarId) {
        console.warn(`Doctor ${doctor.idDoctor} has no calendar_id, skipping`);
        continue;
      }

      try {
        console.log(`Processing availability for doctor ${doctor.idDoctor}`);
        
        /**
         * Obtener disponibilidad del doctor usando getDoctorAvailability
         * Esta función integra horarios de trabajo con eventos de Google Calendar
         */
        const doctorTimezone = doctor.calendarTimezone || 'America/Bogota';
        const doctorStartDate = startDate.setZone(doctorTimezone);
        const doctorEndDate = endDate.setZone(doctorTimezone);
        
        const availableIntervals = await getDoctorAvailability(
          doctor.idDoctor,
          doctorStartDate,
          doctorEndDate
        );

        console.log(`Doctor ${doctor.idDoctor} has ${availableIntervals.length} available intervals`);

        /**
         * Organizar disponibilidad por día con formato legible en español
         * Estructura: { "lunes 20 de enero de 2025": { intervals, timeZone } }
         */
        const dayAvailability: DoctorAvailabilityByDate = {};
        
        if (summaryOnly) {
          /**
           * Modo resumen: solo días y períodos, sin intervalos específicos
           * Retorna mensaje descriptivo por cada período disponible
           */
          const processedDays = new Set<string>();
          const dayPeriods: { [day: string]: Set<TimePeriod> } = {};
          
          for (const interval of availableIntervals) {
            const intervalStart = interval.start!;
            const intervalEnd = interval.end!;
            const dayKey = formatDateToLongSpanish(intervalStart);
            
            if (!processedDays.has(dayKey)) {
              processedDays.add(dayKey);
              dayPeriods[dayKey] = new Set<TimePeriod>();
            }
            
            // Determinar períodos disponibles en este intervalo
            let currentSlotStart = intervalStart;
            while (currentSlotStart.plus({ minutes: intervalMinutes }) <= intervalEnd) {
              const period = getTimePeriod(currentSlotStart.toFormat('HH:mm'));
              dayPeriods[dayKey].add(period);
              currentSlotStart = currentSlotStart.plus({ minutes: intervalMinutes });
            }
          }
          
          // Crear estructura de respuesta sin intervalos específicos
          for (const [dayKey, periods] of Object.entries(dayPeriods)) {
            dayAvailability[dayKey] = {
              intervals: Object.fromEntries(
                Array.from(periods).map(period => [period, "disponible, consulta el día para obtener más detalles."])
              ) as IntervalsByPeriodSummary,
              timeZone: doctorTimezone
            };
          }
        } else {
          /**
           * Modo completo: incluir todos los intervalos específicos
           * Retorna arrays de intervalos con horarios exactos por período
           */
          for (const interval of availableIntervals) {
            const intervalStart = interval.start!;
            const intervalEnd = interval.end!;
            const dayKey = formatDateToLongSpanish(intervalStart);
            
            // Inicializar el día si no existe
            if (!dayAvailability[dayKey]) {
              dayAvailability[dayKey] = {
                intervals: {},
                timeZone: doctorTimezone
              };
            }
            
            // Generar slots de tiempo basados en la duración del servicio
            let currentSlotStart = intervalStart;
            while (currentSlotStart.plus({ minutes: intervalMinutes }) <= intervalEnd) {
              const currentSlotEnd = currentSlotStart.plus({ minutes: intervalMinutes });
              
              const timeInterval: TimeInterval = {
                startTime: currentSlotStart.toFormat('HH:mm'),
                endTime: currentSlotEnd.toFormat('HH:mm')
              };
              
              // Determinar el período del día
              const period = getTimePeriod(timeInterval.startTime);
              
              // Inicializar el período si no existe
              if (!dayAvailability[dayKey].intervals[period]) {
                dayAvailability[dayKey].intervals[period] = [];
              }
              
              // Agregar el intervalo al período correspondiente (solo en modo completo)
              const periodIntervals = dayAvailability[dayKey].intervals[period];
              if (Array.isArray(periodIntervals)) {
                periodIntervals.push(timeInterval);
              }
              
              currentSlotStart = currentSlotEnd;
            }
          }
        }

        /**
         * Solo agregar doctor si tiene disponibilidad real
         * Esto evita incluir doctores sin horarios disponibles
         */
        const hasAvailability = Object.keys(dayAvailability).length > 0;
        if (hasAvailability) {
          doctorsAvailability.push({
            idDoctor: doctor.idDoctor,
            doctorName: doctor.doctorName || 'Doctor',
            availability: dayAvailability
          });
          console.log(`Doctor ${doctor.idDoctor} added with availability for ${Object.keys(dayAvailability).length} days`);
        } else {
          console.log(`Doctor ${doctor.idDoctor} skipped - no availability found`);
        }

      } catch (doctorError) {
        console.error(`Error processing doctor ${doctor.idDoctor}:`, doctorError);
        // Continuar con el siguiente doctor en caso de error
        continue;
      }
    }

    console.log(`Successfully processed ${doctorsAvailability.length} doctors`);

    /**
     * Retornar respuesta exitosa con doctores que tienen disponibilidad
     * La estructura sigue el tipo ServiceDoctorsAvailabilityResponse
     */
    return NextResponse.json({
      availability: {
        doctors: doctorsAvailability
      }
    });

  } catch (error) {
    console.error('Error al obtener la disponibilidad de doctores:', {
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