import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patients, users } from "@/db/schema";
import { auth } from "@/app/lib/firebase/server/adminConfig";
import type { DecodedIdToken } from "firebase-admin/auth";
import { eq, and, not } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse, API_ERRORS, HTTP_STATUS } from "@/types/api";
import { validateUserRole, handleDatabaseError } from "@/lib/api-helpers";
import type { NewPatient } from "@/db/schema";

// GET - Obtener paciente específico por ID
const getPatientByIdHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken,
  { params }: { params: { id: string } }
): Promise<NextResponse | Response> => {
  try {
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse(API_ERRORS.USER_NOT_FOUND, undefined, HTTP_STATUS.FORBIDDEN);
    }

    const roleValidationError = validateUserRole(requestingUser.role, ["admin", "medico", "asistente"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    const patientId = parseInt(params.id);
    if (isNaN(patientId)) {
      return createErrorResponse("ID de paciente inválido", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    const patient = await db.query.patients.findFirst({
      where: and(
        eq(patients.id, patientId),
        eq(patients.organizationId, requestingUser.organizationId),
        eq(patients.isActive, true)
      ),
      with: {
        user: {
          columns: { email: true, displayName: true, phoneNumber: true }
        },
        appointments: {
          with: {
            doctor: {
              columns: { speciality: true }
            },
            service: {
              columns: { name: true, category: true }
            }
          },
          orderBy: (appointments, { desc }) => [desc(appointments.date)]
        }
      }
    });

    if (!patient) {
      return createErrorResponse("Paciente no encontrado", undefined, HTTP_STATUS.NOT_FOUND);
    }

    return createSuccessResponse(patient, "Paciente encontrado");
  } catch (error) {
    return handleDatabaseError(error, "obtener paciente");
  }
};

// PUT - Actualizar paciente
const updatePatientHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken,
  { params }: { params: { id: string } }
): Promise<NextResponse | Response> => {
  try {
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse(API_ERRORS.USER_NOT_FOUND, undefined, HTTP_STATUS.FORBIDDEN);
    }

    // Solo admins y asistentes pueden actualizar pacientes
    const roleValidationError = validateUserRole(requestingUser.role, ["admin", "asistente"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    const patientId = parseInt(params.id);
    if (isNaN(patientId)) {
      return createErrorResponse("ID de paciente inválido", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    // Verificar que el paciente existe y pertenece a la organización
    const existingPatient = await db.query.patients.findFirst({
      where: and(
        eq(patients.id, patientId),
        eq(patients.organizationId, requestingUser.organizationId),
        eq(patients.isActive, true)
      )
    });

    if (!existingPatient) {
      return createErrorResponse("Paciente no encontrado", undefined, HTTP_STATUS.NOT_FOUND);
    }

    const body = await request.json();

    // Si se está actualizando la identificación, verificar que no exista otro paciente con la misma
    if (body.identificationType && body.identificationNumber) {
      const duplicatePatient = await db.query.patients.findFirst({
        where: and(
          eq(patients.organizationId, requestingUser.organizationId),
          eq(patients.identificationType, body.identificationType),
          eq(patients.identificationNumber, body.identificationNumber),
          eq(patients.isActive, true),
          // Excluir el paciente actual de la búsqueda
          not(eq(patients.id, patientId))
        )
      });

      if (duplicatePatient) {
        return createErrorResponse(
          "Ya existe otro paciente con esta identificación", 
          undefined, 
          HTTP_STATUS.CONFLICT
        );
      }
    }

    // Preparar datos de actualización (solo campos que se envían)
    const updateData: Partial<NewPatient> = {};
    
    // Mapear campos específicos con validación de tipos
    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.identificationType !== undefined) updateData.identificationType = body.identificationType;
    if (body.identificationNumber !== undefined) updateData.identificationNumber = body.identificationNumber;
    if (body.birthDate !== undefined) updateData.birthDate = new Date(body.birthDate);
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.emergencyContactName !== undefined) updateData.emergencyContactName = body.emergencyContactName;
    if (body.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = body.emergencyContactPhone;
    if (body.emergencyContactRelation !== undefined) updateData.emergencyContactRelation = body.emergencyContactRelation;
    if (body.medicalHistory !== undefined) updateData.medicalHistory = body.medicalHistory;
    if (body.allergies !== undefined) updateData.allergies = body.allergies;
    if (body.currentMedications !== undefined) updateData.currentMedications = body.currentMedications;
    if (body.bloodType !== undefined) updateData.bloodType = body.bloodType;

    if (Object.keys(updateData).length === 0) {
      return createErrorResponse("No hay campos para actualizar", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    await db.update(patients)
      .set(updateData)
      .where(eq(patients.id, patientId));

    return createSuccessResponse(
      { id: patientId, updated: Object.keys(updateData) },
      "Paciente actualizado exitosamente"
    );
  } catch (error) {
    return handleDatabaseError(error, "actualizar paciente");
  }
};

// DELETE - Desactivar paciente (soft delete)
const deletePatientHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken,
  { params }: { params: { id: string } }
): Promise<NextResponse | Response> => {
  try {
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse(API_ERRORS.USER_NOT_FOUND, undefined, HTTP_STATUS.FORBIDDEN);
    }

    // Solo admins pueden eliminar pacientes
    const roleValidationError = validateUserRole(requestingUser.role, ["admin"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    const patientId = parseInt(params.id);
    if (isNaN(patientId)) {
      return createErrorResponse("ID de paciente inválido", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    // Verificar que el paciente existe y pertenece a la organización
    const existingPatient = await db.query.patients.findFirst({
      where: and(
        eq(patients.id, patientId),
        eq(patients.organizationId, requestingUser.organizationId),
        eq(patients.isActive, true)
      )
    });

    if (!existingPatient) {
      return createErrorResponse("Paciente no encontrado", undefined, HTTP_STATUS.NOT_FOUND);
    }

    // Soft delete - marcar como inactivo
    await db.update(patients)
      .set({ isActive: false })
      .where(eq(patients.id, patientId));

    return createSuccessResponse(
      { id: patientId },
      "Paciente desactivado exitosamente"
    );
  } catch (error) {
    return handleDatabaseError(error, "eliminar paciente");
  }
};

async function authenticateRequest(request: NextRequest): Promise<DecodedIdToken | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    return await auth().verifyIdToken(token);
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  const resolvedParams = await params;
  return getPatientByIdHandler(request, decodedToken, { params: resolvedParams });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  const resolvedParams = await params;
  return updatePatientHandler(request, decodedToken, { params: resolvedParams });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  const resolvedParams = await params;
  return deletePatientHandler(request, decodedToken, { params: resolvedParams });
}