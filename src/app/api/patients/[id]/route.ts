// src/app/api/patients/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuthorizedUser } from '@/lib/api/auth';
import { getNumericParam } from '@/lib/api/request-helpers';
import { notFoundResponse, successResponse } from '@/lib/api/response-helpers';
import { findPatientById } from '@/lib/db/repositories/patients';
import { handleDatabaseError } from '@/lib/api-helpers';
import { db } from '@/db';
import { patients } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { NewPatient } from '@/db/schema';

const getPatientByIdHandler = withAuthorizedUser(async (request, user, { params }) => {
  const patientId = getNumericParam(params, 'id');
  if (patientId instanceof NextResponse) return patientId;

  try {
    const patient = await findPatientById(patientId, user.organizationId as number);

    if (!patient) {
      return notFoundResponse('Patient');
    }

    return successResponse(patient, 'Patient found successfully');
  } catch (error) {
    return handleDatabaseError(error, 'get patient');
  }
}, ['admin', 'medico', 'asistente']);

const updatePatientHandler = withAuthorizedUser(async (request: NextRequest, user, { params }) => {
  const patientId = getNumericParam(params, 'id');
  if (patientId instanceof NextResponse) return patientId;

  try {
    const body: Partial<NewPatient> = await request.json();

    // Aquí se podría añadir validación con Zod

      await db.update(patients)
        .set(body)
        .where(and(eq(patients.id, patientId), eq(patients.organizationId, user.organizationId as number)));

    const updatedPatient = await findPatientById(patientId, user.organizationId as number);

    if (!updatedPatient) {
        return notFoundResponse('Patient');
    }

    return successResponse(updatedPatient, 'Patient updated successfully');
  } catch (error) {
    return handleDatabaseError(error, 'update patient');
  }
}, ['admin', 'asistente']);

const deletePatientHandler = withAuthorizedUser(async (request: NextRequest, user, { params }) => {
  const patientId = getNumericParam(params, 'id');
  if (patientId instanceof NextResponse) return patientId;

  try {
    await db.update(patients)
      .set({ isActive: false })
      .where(and(eq(patients.id, patientId), eq(patients.organizationId, user.organizationId as number)));

    return successResponse({ id: patientId }, 'Patient deactivated successfully');
  } catch (error) {
    return handleDatabaseError(error, 'delete patient');
  }
}, ['admin']);

export {
  getPatientByIdHandler as GET,
  updatePatientHandler as PUT,
  deletePatientHandler as DELETE,
};