/**
 * @swagger
 * /api/doctors/{id}/working-hours:
 *   get:
 *     summary: Obtiene los horarios de trabajo de un doctor.
 *     description: >
 *       Recupera los horarios de trabajo configurados para un doctor específico, utilizando el ID del doctor.
 *       Estos horarios definen la disponibilidad general del doctor para programar citas.
 *     tags:
 *       - Doctores
 *       - Horarios
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID numérico único del doctor.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Horarios de trabajo obtenidos exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 doctorId:
 *                   type: integer
 *                   description: ID del doctor.
 *                   example: 123
 *                 workingHours:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/DoctorWorkingHours'
 *                     - $ref: '#/components/schemas/WorkingHours'
 *             examples:
 *               nuevo_formato:
 *                 summary: Formato nuevo (DoctorWorkingHours)
 *                 value:
 *                   doctorId: 123
 *                   workingHours:
 *                     workingHours:
 *                       - day: "MONDAY"
 *                         intervals:
 *                           - start: "09:00"
 *                             end: "12:00"
 *                           - start: "14:00"
 *                             end: "17:00"
 *                       - day: "TUESDAY"
 *                         intervals:
 *                           - start: "09:00"
 *                             end: "17:00"
 *                       - day: "WEDNESDAY"
 *                         intervals:
 *                           - start: "09:00"
 *                             end: "12:00"
 *                       - day: "FRIDAY"
 *                         intervals:
 *                           - start: "08:00"
 *                             end: "16:00"
 *               formato_legacy:
 *                 summary: Formato legacy (WorkingHours)
 *                 value:
 *                   doctorId: 123
 *                   workingHours:
 *                     monday:
 *                       isActive: true
 *                       startTime: "09:00"
 *                       endTime: "17:00"
 *                     tuesday:
 *                       isActive: true
 *                       startTime: "09:00"
 *                       endTime: "17:00"
 *                     wednesday:
 *                       isActive: false
 *                       startTime: "09:00"
 *                       endTime: "17:00"
 *                     thursday:
 *                       isActive: true
 *                       startTime: "09:00"
 *                       endTime: "17:00"
 *                     friday:
 *                       isActive: true
 *                       startTime: "09:00"
 *                       endTime: "17:00"
 *                     saturday:
 *                       isActive: false
 *                       startTime: "09:00"
 *                       endTime: "17:00"
 *                     sunday:
 *                       isActive: false
 *                       startTime: "09:00"
 *                       endTime: "17:00"
 *       400:
 *         description: El ID del doctor proporcionado es inválido.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "ID de doctor inválido"
 *                 details:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Expected number, received nan"]
 *                 expectedFormat:
 *                   type: object
 *                   description: Información sobre el formato correcto esperado
 *                   properties:
 *                     note:
 *                       type: string
 *                       example: "El ID debe ser un número entero positivo"
 *                     example:
 *                       type: string
 *                       example: "GET /api/doctors/123/working-hours"
 *       404:
 *         description: No se encontró un doctor con el ID proporcionado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Doctor no encontrado"
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error interno del servidor"
 *   put:
 *     summary: Actualiza los horarios de trabajo de un doctor.
 *     description: >
 *       Actualiza o establece los horarios de trabajo para un doctor específico. 
 *       Este endpoint requiere un objeto `workingHours` completo que sobreescribirá la configuración existente.
 *     tags:
 *       - Doctores
 *       - Horarios
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID numérico único del doctor.
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workingHours
 *             properties:
 *               workingHours:
 *                 $ref: '#/components/schemas/DoctorWorkingHours'
 *           examples:
 *             horario_completo:
 *               summary: Horario de trabajo completo
 *               value:
 *                 workingHours:
 *                   - day: "MONDAY"
 *                     intervals:
 *                       - start: "09:00"
 *                         end: "12:00"
 *                       - start: "14:00"
 *                         end: "17:00"
 *                   - day: "TUESDAY"
 *                     intervals:
 *                       - start: "09:00"
 *                         end: "17:00"
 *                   - day: "WEDNESDAY"
 *                     intervals:
 *                       - start: "09:00"
 *                         end: "12:00"
 *                   - day: "THURSDAY"
 *                     intervals:
 *                       - start: "08:00"
 *                         end: "16:00"
 *                   - day: "FRIDAY"
 *                     intervals:
 *                       - start: "09:00"
 *                         end: "17:00"
 *             horario_parcial:
 *               summary: Horario de trabajo parcial (solo algunos días)
 *               value:
 *                 workingHours:
 *                   - day: "MONDAY"
 *                     intervals:
 *                       - start: "09:00"
 *                         end: "17:00"
 *                   - day: "WEDNESDAY"
 *                     intervals:
 *                       - start: "10:00"
 *                         end: "14:00"
 *                   - day: "FRIDAY"
 *                     intervals:
 *                       - start: "08:00"
 *                         end: "12:00"
 *     responses:
 *       200:
 *         description: Horarios actualizados exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Horarios actualizados exitosamente
 *                 doctorId:
 *                   type: integer
 *                   example: 123
 *                 workingHours:
 *                   $ref: '#/components/schemas/DoctorWorkingHours'
 *             examples:
 *               actualizacion_exitosa:
 *                 summary: Respuesta de actualización exitosa
 *                 value:
 *                   message: "Horarios actualizados exitosamente"
 *                   doctorId: 123
 *                   workingHours:
 *                     workingHours:
 *                       - day: "MONDAY"
 *                         intervals:
 *                           - start: "09:00"
 *                             end: "12:00"
 *                           - start: "14:00"
 *                             end: "17:00"
 *                       - day: "TUESDAY"
 *                         intervals:
 *                           - start: "09:00"
 *                             end: "17:00"
 *                       - day: "WEDNESDAY"
 *                         intervals:
 *                           - start: "09:00"
 *                             end: "12:00"
 *                       - day: "THURSDAY"
 *                         intervals:
 *                           - start: "08:00"
 *                             end: "16:00"
 *                       - day: "FRIDAY"
 *                         intervals:
 *                           - start: "09:00"
 *                             end: "17:00"
 *       400:
 *         description: Datos de entrada inválidos (ID de doctor, formato de `workingHours`).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *                 expectedFormat:
 *                   type: object
 *                   description: Ejemplo del formato correcto esperado
 *                   $ref: '#/components/schemas/DoctorWorkingHours'
 *             examples:
 *               id_invalido:
 *                 summary: ID de doctor inválido
 *                 value:
 *                   error: "ID de doctor inválido"
 *                   details: ["Expected number, received nan"]
 *                   expectedFormat:
 *                     note: "El ID debe ser un número entero positivo"
 *                     example: "PUT /api/doctors/123/working-hours"
 *               horarios_invalidos:
 *                 summary: Formato de horarios inválido
 *                 value:
 *                   error: "Datos de horarios inválidos"
 *                   details:
 *                     - field: "workingHours.0.day"
 *                       message: "Invalid enum value. Expected 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY', received 'lunes'"
 *                     - field: "workingHours.0.intervals.0.start"
 *                       message: "Invalid time format. Expected HH:mm (e.g., '09:00')"
 *                   expectedFormat:
 *                     workingHours:
 *                       - day: "MONDAY"
 *                         intervals:
 *                           - start: "09:00"
 *                             end: "17:00"
 *                       - day: "TUESDAY"
 *                         intervals:
 *                           - start: "09:00"
 *                             end: "12:00"
 *                           - start: "14:00"
 *                             end: "17:00"
 *               intervalos_superpuestos:
 *                 summary: Intervalos superpuestos
 *                 value:
 *                   error: "Datos de horarios inválidos"
 *                   details:
 *                     - field: "workingHours.0.intervals"
 *                       message: "Time intervals cannot overlap"
 *                   expectedFormat:
 *                     workingHours:
 *                       - day: "MONDAY"
 *                         intervals:
 *                           - start: "09:00"
 *                             end: "12:00"
 *                           - start: "14:00"
 *                             end: "17:00"
 *       404:
 *         description: Doctor no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Doctor no encontrado"
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error interno del servidor"
 * components:
 *   schemas:
 *     DoctorWorkingHours:
 *       type: object
 *       description: Formato nuevo para horarios de trabajo del doctor.
 *       properties:
 *         workingHours:
 *           type: array
 *           description: Lista de días de trabajo con sus intervalos.
 *           items:
 *             $ref: '#/components/schemas/DailyWorkingHours'
 *           minItems: 1
 *           maxItems: 7
 *       required:
 *         - workingHours
 *       example:
 *         workingHours:
 *           - day: "MONDAY"
 *             intervals:
 *               - start: "09:00"
 *                 end: "12:00"
 *               - start: "14:00"
 *                 end: "17:00"
 *           - day: "TUESDAY"
 *             intervals:
 *               - start: "09:00"
 *                 end: "17:00"
 *     DailyWorkingHours:
 *       type: object
 *       description: Horarios de trabajo para un día específico.
 *       properties:
 *         day:
 *           type: string
 *           enum: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
 *           description: Día de la semana en inglés.
 *           example: "MONDAY"
 *         intervals:
 *           type: array
 *           description: Intervalos de tiempo de trabajo para el día.
 *           items:
 *             $ref: '#/components/schemas/TimeInterval'
 *           minItems: 0
 *       required:
 *         - day
 *     TimeInterval:
 *       type: object
 *       description: Intervalo de tiempo con hora de inicio y fin.
 *       properties:
 *         start:
 *           type: string
 *           pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
 *           description: Hora de inicio en formato HH:mm (24 horas).
 *           example: "09:00"
 *         end:
 *           type: string
 *           pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
 *           description: Hora de fin en formato HH:mm (24 horas).
 *           example: "17:00"
 *       required:
 *         - start
 *         - end
 *     WorkingHours:
 *       type: object
 *       description: Formato legacy para horarios de trabajo del doctor.
 *       properties:
 *         monday:
 *           $ref: '#/components/schemas/DayWorkingHours'
 *         tuesday:
 *           $ref: '#/components/schemas/DayWorkingHours'
 *         wednesday:
 *           $ref: '#/components/schemas/DayWorkingHours'
 *         thursday:
 *           $ref: '#/components/schemas/DayWorkingHours'
 *         friday:
 *           $ref: '#/components/schemas/DayWorkingHours'
 *         saturday:
 *           $ref: '#/components/schemas/DayWorkingHours'
 *         sunday:
 *           $ref: '#/components/schemas/DayWorkingHours'
 *     DayWorkingHours:
 *       type: object
 *       description: Horarios de trabajo para un día específico (formato legacy).
 *       properties:
 *         isActive:
 *           type: boolean
 *           description: Indica si el doctor trabaja este día.
 *           example: true
 *         startTime:
 *           type: string
 *           format: time
 *           description: Hora de inicio en formato HH:mm.
 *           example: "09:00"
 *         endTime:
 *           type: string
 *           format: time
 *           description: Hora de fin en formato HH:mm.
 *           example: "17:00"
 *       required:
 *         - isActive
 *         - startTime
 *         - endTime
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
 * @description Obtiene los horarios de trabajo de un doctor por su ID.
 * @param {NextRequest} request - La solicitud HTTP.
 * @param {{ params: Promise<{ id: string }> }} context - El contexto de la ruta, contiene el ID del doctor.
 * @returns {Promise<NextResponse>} Una respuesta JSON con los horarios del doctor o un mensaje de error.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    
    // Validar el parámetro ID usando Zod
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
    
    const doctorId = parseInt(validationResult.data.id);

    // Consultar el doctor en la base de datos
    const doctor = await db
      .select({
        idDoctor: doctors.idDoctor,
        workingHours: doctors.working_hours
      })
      .from(doctors)
      .where(eq(doctors.idDoctor, doctorId))
      .limit(1);

    if (doctor.length === 0) {
      return NextResponse.json(
        { error: 'Doctor no encontrado' },
        { status: 404 }
      );
    }

    // Si no tiene horarios configurados, devolver los horarios por defecto
    const storedWorkingHours = doctor[0].workingHours;
    let workingHours;
    
    if (storedWorkingHours) {
      // Si hay horarios almacenados, intentar usar el nuevo formato
      try {
        const parsedHours = storedWorkingHours as DoctorWorkingHours;
        workingHours = parsedHours;
      } catch {
        // Si falla, usar el formato legacy
        workingHours = storedWorkingHours as WorkingHours || DEFAULT_WORKING_HOURS;
      }
    } else {
      // Si no hay horarios, usar los por defecto
      workingHours = DEFAULT_WORKING_HOURS;
    }

    return NextResponse.json({
      doctorId,
      workingHours,
    });
  } catch (error) {
    console.error('Error al obtener horarios del doctor:', error);
    
    // Manejo específico de errores de Zod
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
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * @description Actualiza los horarios de trabajo de un doctor por su ID.
 * @param {NextRequest} request - La solicitud HTTP, que debe contener los nuevos horarios en el cuerpo.
 * @param {{ params: Promise<{ id: string }> }} context - El contexto de la ruta, contiene el ID del doctor.
 * @returns {Promise<NextResponse>} Una respuesta JSON confirmando la actualización o un mensaje de error.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    
    // Validar el parámetro ID usando Zod
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
    
    const doctorId = parseInt(paramValidation.data.id);

    // Obtener y validar el cuerpo de la solicitud usando Zod
    const body = await request.json();
    const bodyValidation = updateWorkingHoursRequestSchema.safeParse(body);
    
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
    
    const { workingHours } = bodyValidation.data;

    // Verificar que el doctor existe antes de actualizar
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

    // Actualizar los horarios de trabajo en la base de datos
    const doctorWorkingHoursData: DoctorWorkingHours = { workingHours };
    await db
      .update(doctors)
      .set({ working_hours: doctorWorkingHoursData })
      .where(eq(doctors.idDoctor, doctorId));

    return NextResponse.json({
      message: 'Horarios actualizados exitosamente',
      doctorId,
      workingHours: doctorWorkingHoursData,
    });
  } catch (error) {
    console.error('Error al actualizar horarios del doctor:', error);
    
    // Manejo específico de errores de Zod
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
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}