import { NextRequest } from 'next/server';
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { db } from '@/db';
import { doctors } from '@/db/schema/doctors';
import { eq } from 'drizzle-orm';
import { createSuccessResponse, createErrorResponse, HTTP_STATUS, API_ERRORS } from '@/types/api';
import { handleDatabaseError } from '@/lib/api-helpers';

import { z } from 'zod';

/**
 * @fileoverview API Route para modificar detalles de doctores mediante PATCH.
 * @version 1.0.0
 * @author Santiago Prada - Backend Developer
 * @date 16-07-2025
 * @module DoctorDetailsAPI
 *
 * @description
 * Esta API permite a los usuarios con rol "admin" modificar la especialidad, teléfono privado y zona horaria del calendario de un doctor.
 * Implementa validación de autenticación y autorización similar a otras APIs master.
 *
 * @example
 * // Ejemplo de uso desde el cliente
 * const response = await fetch('/api/master/doctor-details', {
 *   method: 'PATCH',
 *   headers: {
 *     'Authorization': 'Bearer <firebase-token>',
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({
 *     doctorId: 1,
 *     speciality: 'Cardiología',
 *     privatePhone: '123456789',
 *     calendar_timezone: 'America/Bogota'
 *   })
 * });
 */

const UpdateDoctorSchema = z.object({
  doctorId: z.number().int().positive(),
  speciality: z.string().optional(),
  privatePhone: z.string().optional(),
  calendar_timezone: z.string().optional(),
});

type UpdateDoctorRequest = z.infer<typeof UpdateDoctorSchema>;

async function handlePatchRequest(request: NextRequest, _userInfo: AuthenticatedUserInfo) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // _userInfo es requerido por la firma de AuthenticatedHandler pero la validación se hace en el middleware
  try {
    const body = await request.json();
    const parsedBody = UpdateDoctorSchema.safeParse(body);
    if (!parsedBody.success) {
      return createErrorResponse(API_ERRORS.INVALID_REQUEST, JSON.stringify(parsedBody.error.errors), HTTP_STATUS.BAD_REQUEST);
    }

    const { doctorId, speciality, privatePhone, calendar_timezone } = parsedBody.data;

    if (!speciality && !privatePhone && !calendar_timezone) {
      return createErrorResponse(API_ERRORS.INVALID_REQUEST, 'Al menos un campo debe ser proporcionado para actualizar.', HTTP_STATUS.BAD_REQUEST);
    }

    // El middleware optimizado ya validó que el usuario tiene rol 'admin'

    const updateData: Partial<UpdateDoctorRequest> = {};
    if (speciality) updateData.speciality = speciality;
    if (privatePhone) updateData.privatePhone = privatePhone;
    if (calendar_timezone) updateData.calendar_timezone = calendar_timezone;

    await db.update(doctors)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(doctors.idDoctor, doctorId));

    const [updatedDoctor] = await db.select().from(doctors).where(eq(doctors.idDoctor, doctorId));

    if (!updatedDoctor) {
      return createErrorResponse(API_ERRORS.DOCTOR_NOT_FOUND, undefined, HTTP_STATUS.NOT_FOUND);
    }

    return createSuccessResponse(updatedDoctor, 'Detalles del doctor actualizados exitosamente.', HTTP_STATUS.OK);
  } catch (error) {
    return handleDatabaseError(error, "modificacion de datos doctor.");
  }
}

export const PATCH = withOptimizedAuthentication(handlePatchRequest, {
  requiredRoles: 'admin',
  requireOrganization: false
});