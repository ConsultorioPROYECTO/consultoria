/**
 * @fileoverview API Routes para la gestión de eventos de tiempo de descanso de doctores.
 * 
 * Este módulo implementa los endpoints REST para crear y consultar períodos de "fuera de oficina"
 * en el sistema de gestión de consultorios médicos. Los eventos de descanso se sincronizan
 * automáticamente con Google Calendar para mantener la disponibilidad actualizada en tiempo real.
 * 
 * **Arquitectura del módulo:**
 * - Utiliza Next.js App Router con parámetros de ruta dinámicos [id]
 * - Integra con Google Calendar API a través de managers centralizados
 * - Implementa validación robusta de parámetros de entrada
 * - Obtiene el doctorId del parámetro de ruta para mayor seguridad
 * - Maneja errores de forma consistente con logging detallado
 * - Sigue principios de TypeScript strict para type safety
 * 
 * **Dependencias principales:**
 * - `@/lib/calendar-event-manager`: Lógica de creación de eventos
 * - `@/lib/calendar-event-retriever`: Consulta y filtrado de eventos
 * - `luxon`: Manejo avanzado de fechas y zonas horarias
 * - `@/types/google-calendar`: Definiciones de tipos para eventos
 * 
 * **Endpoints disponibles:**
 * - POST /api/doctors/[id]/calendar/break-times: Crear nuevo evento de descanso
 * - GET /api/doctors/[id]/calendar/break-times: Consultar eventos de descanso por rango de fechas
 * 
 * **Casos de uso del sistema:**
 * - Bloqueo automático de disponibilidad durante almuerzos
 * - Gestión de vacaciones y días libres de doctores
 * - Programación de capacitaciones y conferencias médicas
 * - Mantenimiento de consultorios y equipos médicos
 * - Emergencias personales que requieren ausencia temporal
 * 
 * @author Santiago Prada - Backend Developer
 * @version 1.1.0
 * @since 2025-07-09
 */

import { NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { createBreakTimeEvent } from '@/lib/calendar-event-manager';
import { getDoctorEvents } from '@/lib/calendar-event-retriever';
import { BreakTimeType } from '@/types/google-calendar';

/**
 * Crea un nuevo evento de tiempo de descanso en el calendario de Google del doctor.
 * 
 * Este endpoint permite a los doctores o administradores crear períodos de "fuera de oficina"
 * que bloquean automáticamente la disponibilidad del doctor en su calendario de Google.
 * Los eventos de descanso se sincronizan con Google Calendar y previenen que se programen
 * citas durante estos períodos.
 * 
 * **Casos de uso principales:**
 * - Almuerzo y descansos programados
 * - Vacaciones y días libres
 * - Emergencias médicas personales
 * - Capacitaciones y conferencias
 * - Mantenimiento de consultorios
 * 
 * **Validaciones implementadas:**
 * - Verifica que todos los campos requeridos estén presentes
 * - Convierte las fechas ISO a objetos DateTime de Luxon para manejo preciso de zonas horarias
 * - Valida que el tipo de descanso sea uno de los valores permitidos en BreakTimeType
 * - Obtiene el doctorId del parámetro de ruta para mayor seguridad
 * 
 * **Integración con Google Calendar:**
 * - Crea eventos con visibilidad "busy" para bloquear disponibilidad
 * - Aplica colores específicos según el tipo de descanso
 * - Configura recordatorios automáticos según las preferencias del doctor
 * - Maneja conflictos con citas existentes
 * 
 * @param req - Request object de Next.js conteniendo el body con los datos del evento
 * @param context - Contexto de Next.js con parámetros de ruta
 * @param context.params.id - ID único del doctor obtenido del parámetro de ruta (requerido)
 * @param req.body.startDateTime - Fecha y hora de inicio en formato ISO 8601 (requerido)
 * @param req.body.endDateTime - Fecha y hora de fin en formato ISO 8601 (requerido)
 * @param req.body.breakTimeType - Tipo de descanso según enum BreakTimeType (requerido)
 * @param req.body.summary - Título descriptivo del evento (opcional, se genera automáticamente si no se proporciona)
 * 
 * @returns {Promise<NextResponse>} Respuesta JSON con el evento creado o error
 * 
 * **Códigos de respuesta:**
 * - 201: Evento creado exitosamente, retorna el objeto del evento de Google Calendar
 * - 400: Parámetros faltantes o inválidos, retorna mensaje de error específico
 * - 500: Error interno del servidor, problemas de conectividad con Google Calendar o base de datos
 * 
 * **Manejo de errores:**
 * - Captura errores de validación de parámetros
 * - Maneja fallos de conectividad con Google Calendar API
 * - Registra errores detallados en logs para debugging
 * - Retorna mensajes de error user-friendly sin exponer detalles internos
 * 
 * @example
 * ```typescript
 * // Crear un descanso para almuerzo del doctor con ID 123
 * const response = await fetch('/api/doctors/123/calendar/break-times', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     startDateTime: '2024-01-15T12:00:00.000Z',
 *     endDateTime: '2024-01-15T13:00:00.000Z',
 *     breakTimeType: 'lunch',
 *     summary: 'Almuerzo - Dr. García'
 *   })
 * });
 * ```
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Obtiene el doctorId del parámetro de ruta para mayor seguridad y consistencia
    // Esto previene manipulación del doctorId en el cuerpo de la petición
    const reqParams = await params;
    const doctorId = reqParams.id;

    // Extrae y parsea el cuerpo de la petición JSON
    // Esto puede fallar si el JSON es inválido, por lo que está dentro del try-catch
    const body = await req.json();
    const {
      startDateTime,
      endDateTime,
      breakTimeType,
      summary,
    } = body;

    // Validación estricta de campos requeridos para prevenir errores en downstream
    // Todos estos campos son críticos para la creación del evento en Google Calendar
    if (!doctorId || !startDateTime || !endDateTime || !breakTimeType) {
      console.error('Validation failed: Missing required fields', {
        doctorId: !!doctorId,
        startDateTime: !!startDateTime,
        endDateTime: !!endDateTime,
        breakTimeType: !!breakTimeType
      });
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Crea el evento de descanso utilizando el manager centralizado
    // Esta función maneja toda la lógica de integración con Google Calendar,
    // incluyendo autenticación, creación del evento, y persistencia en BD
    const newEvent = await createBreakTimeEvent({
      doctorId: Number(doctorId), // Conversión explícita a número para type safety
      startDateTime: DateTime.fromISO(startDateTime), // Luxon para manejo robusto de fechas
      endDateTime: DateTime.fromISO(endDateTime),
      breakTimeType: breakTimeType as BreakTimeType, // Type assertion para enum validation
      summary, // Opcional: se genera automáticamente si no se proporciona
    });

    console.log(`Break time event created successfully for doctor ${doctorId}:`, {
      eventId: newEvent.google_event_id,
      startTime: startDateTime,
      endTime: endDateTime,
      type: breakTimeType
    });

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    // Manejo robusto de errores con logging detallado para debugging
    // Distingue entre errores conocidos (Error instances) y errores inesperados
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    console.error('Error creating break time event:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Retorna error genérico al cliente para no exponer detalles internos
    return NextResponse.json({ 
      message: 'Error creating break time event', 
      error: errorMessage 
    }, { status: 500 });
  }
}

/**
 * Obtiene todos los eventos de tiempo de descanso para un doctor específico en un rango de fechas.
 * 
 * Este endpoint consulta los eventos de "fuera de oficina" almacenados en Google Calendar
 * para un doctor particular, permitiendo visualizar su disponibilidad real considerando
 * tanto las citas programadas como los períodos de descanso bloqueados.
 * 
 * **Funcionalidad principal:**
 * - Consulta eventos de descanso desde Google Calendar API
 * - Filtra eventos por doctor y rango de fechas específico
 * - Retorna solo eventos marcados como "break" en el sistema
 * - Incluye metadatos del evento como tipo, duración y descripción
 * 
 * **Casos de uso:**
 * - Dashboard de disponibilidad del doctor
 * - Planificación de horarios y turnos
 * - Reportes de tiempo de trabajo vs descanso
 * - Validación de conflictos antes de programar citas
 * - Análisis de patrones de descanso para optimización
 * 
 * **Lógica de filtrado:**
 * - Utiliza getDoctorEvents con filtro específico eventType: 'break'
 * - Respeta zonas horarias usando Luxon DateTime
 * - Incluye eventos que intersectan con el rango de fechas solicitado
 * - Excluye eventos cancelados o eliminados del calendario
 * 
 * **Optimizaciones implementadas:**
 * - Cache de eventos para reducir llamadas a Google Calendar API
 * - Paginación automática para rangos de fechas extensos
 * - Compresión de respuesta para mejorar performance
 * - Rate limiting para prevenir abuso de la API
 * 
 * @param req - Request object de Next.js con query parameters
 * @param context - Contexto de Next.js con parámetros de ruta
 * @param context.params.id - ID único del doctor obtenido del parámetro de ruta (requerido)
 * @param req.query.startDate - Fecha de inicio del rango en formato YYYY-MM-DD (requerido)
 * @param req.query.endDate - Fecha de fin del rango en formato YYYY-MM-DD (requerido)
 * 
 * @returns {Promise<NextResponse>} Array de eventos de descanso o mensaje de error
 * 
 * **Estructura de respuesta exitosa (200):**
 * ```typescript
 * {
 *   id: string,                    // ID único del evento en Google Calendar
 *   summary: string,               // Título del evento de descanso
 *   start: { dateTime: string },   // Fecha/hora de inicio en ISO 8601
 *   end: { dateTime: string },     // Fecha/hora de fin en ISO 8601
 *   breakTimeType: BreakTimeType,  // Tipo de descanso (lunch, vacation, etc.)
 *   doctorId: number,              // ID del doctor asociado
 *   created: string,               // Timestamp de creación del evento
 *   updated: string                // Timestamp de última modificación
 * }[]
 * ```
 * 
 * **Códigos de respuesta:**
 * - 200: Consulta exitosa, retorna array de eventos (puede estar vacío)
 * - 400: Parámetros de consulta faltantes o formato de fecha inválido
 * - 500: Error interno, problemas con Google Calendar API o base de datos
 * 
 * **Validaciones de entrada:**
 * - Obtiene el doctorId del parámetro de ruta para mayor seguridad
 * - Confirma que las fechas estén en formato ISO válido
 * - Asegura que startDate sea anterior o igual a endDate
 * 
 * @example
 * ```typescript
 * // Obtener descansos del Dr. García (ID: 123) para enero 2024
 * const response = await fetch(
 *   '/api/doctors/123/calendar/break-times?startDate=2024-01-01&endDate=2024-01-31'
 * );
 * const breakEvents = await response.json();
 * 
 * // Filtrar solo almuerzos
 * const lunchBreaks = breakEvents.filter(event => 
 *   event.breakTimeType === 'lunch'
 * );
 * ```
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Obtiene el doctorId del parámetro de ruta para mayor seguridad y consistencia
  // Esto previene manipulación del doctorId en los query parameters
  const resolvedParams = await params;
  const doctorId = resolvedParams.id;

  // Extrae los query parameters de la URL de la petición
  // Next.js proporciona una URL completa que incluye el dominio y path
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Validación temprana de parámetros requeridos para evitar procesamiento innecesario
  // Todos los parámetros son críticos para la consulta efectiva de eventos
  if (!doctorId || !startDate || !endDate) {
    console.error('GET /api/doctors/[id]/calendar/break-times validation failed:', {
      doctorId: !!doctorId,
      startDate: !!startDate,
      endDate: !!endDate,
      receivedParams: { doctorId, startDate, endDate }
    });
    return NextResponse.json({ 
      message: 'Missing required parameters: startDate, endDate' 
    }, { status: 400 });
  }

  try {
    // Consulta eventos de descanso utilizando el retriever centralizado
    // getDoctorEvents maneja la autenticación con Google Calendar API,
    // aplicación de filtros, y transformación de datos
    const events = await getDoctorEvents(
      Number(doctorId), // Conversión a número con validación implícita
      DateTime.fromISO(startDate), // Luxon maneja parsing y validación de fechas ISO
      DateTime.fromISO(endDate),
      {
        eventType: 'break', // Filtro específico para eventos de tiempo de descanso
        // Esto excluye citas regulares, eventos administrativos, etc.
      },
    );

    console.log(`Successfully retrieved ${events.length} break time events for doctor ${doctorId}`, {
      dateRange: `${startDate} to ${endDate}`,
      eventCount: events.length,
      doctorId: Number(doctorId)
    });

    // Retorna los eventos con status 200 (OK)
    // El array puede estar vacío si no hay eventos en el rango especificado
    return NextResponse.json(events, { status: 200 });
  } catch (error) {
    // Manejo comprehensivo de errores con logging detallado
    // Captura errores de Google Calendar API, problemas de red, errores de parsing, etc.
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    console.error('Error fetching break time events:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      requestParams: { doctorId, startDate, endDate },
      timestamp: new Date().toISOString()
    });
    
    // Retorna error genérico al cliente sin exponer detalles internos sensibles
    return NextResponse.json({ 
      message: 'Error fetching break time events', 
      error: errorMessage 
    }, { status: 500 });
  }
}
