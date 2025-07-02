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
 *                 workingHours:
 *                   $ref: '#/components/schemas/WorkingHours'
 *       400:
 *         description: El ID del doctor proporcionado es inválido.
 *       404:
 *         description: No se encontró un doctor con el ID proporcionado.
 *       500:
 *         description: Error interno del servidor.
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
 *                 $ref: '#/components/schemas/WorkingHours'
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
 *                 workingHours:
 *                   $ref: '#/components/schemas/WorkingHours'
 *       400:
 *         description: Datos de entrada inválidos (ID de doctor, formato de `workingHours`).
 *       404:
 *         description: Doctor no encontrado.
 *       500:
 *         description: Error interno del servidor.
 * components:
 *   schemas:
 *     WorkingHours:
 *       type: object
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
 *       properties:
 *         start:
 *           type: string
 *           format: time
 *           description: Hora de inicio en formato HH:mm.
 *           example: "09:00"
 *         end:
 *           type: string
 *           format: time
 *           description: Hora de fin en formato HH:mm.
 *           example: "17:00"
 *       required:
 *         - start
 *         - end
 */

import { NextRequest, NextResponse } from 'next/server';
import { doctorCalendarService } from '@/lib/doctor-calendar';
import { WorkingHours, validateWorkingHours } from '@/types/working-hours';

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
        // Extraer y validar el ID del doctor de los parámetros de la ruta.
    const doctorId = parseInt(resolvedParams.id);
    
        // Validar que el ID del doctor sea un número.
    if (isNaN(doctorId)) {
      return NextResponse.json(
        { error: 'ID de doctor inválido' },
        { status: 400 }
      );
    }

        const result = await doctorCalendarService.getWorkingHours(doctorId);

    if (!result.success) {
      if (result.error === 'Doctor not found') {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      doctorId,
      workingHours: result.workingHours,
    });
  } catch (error) {
    console.error('Error al obtener horarios del doctor:', error);
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
    const doctorId = parseInt(resolvedParams.id);
    
    if (isNaN(doctorId)) {
      return NextResponse.json(
        { error: 'ID de doctor inválido' },
        { status: 400 }
      );
    }

        // Obtener los horarios de trabajo del cuerpo de la solicitud.
    const body = await request.json();
    const { workingHours }: { workingHours: WorkingHours } = body;

    if (!workingHours) {
      return NextResponse.json(
        { error: 'Horarios de trabajo requeridos' },
        { status: 400 }
      );
    }

    // Validar horarios
        // Validar que el formato de los horarios de trabajo sea correcto.
    const validationErrors = validateWorkingHours(workingHours);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Horarios inválidos', details: validationErrors },
        { status: 400 }
      );
    }

    const result = await doctorCalendarService.updateWorkingHours(doctorId, workingHours);

    if (!result.success) {
      if (result.error?.includes('not found')) {
        return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
      }
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Horarios actualizados exitosamente',
      doctorId,
      workingHours,
    });
  } catch (error) {
    console.error('Error al actualizar horarios del doctor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}