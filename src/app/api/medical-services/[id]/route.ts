import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { medicalServices, users } from "@/db/schema";
import { auth } from "@/app/lib/firebase/server/adminConfig";
import type { DecodedIdToken } from "firebase-admin/auth";
import { eq, and, not } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse, API_ERRORS, HTTP_STATUS } from "@/types/api";
import { validateUserRole, handleDatabaseError } from "@/lib/api-helpers";
import type { NewMedicalService } from "@/db/schema";

// GET - Obtener servicio médico específico por ID
const getMedicalServiceByIdHandler = async (
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

    const serviceId = parseInt(params.id);
    if (isNaN(serviceId)) {
      return createErrorResponse("ID de servicio inválido", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    const service = await db.query.medicalServices.findFirst({
      where: and(
        eq(medicalServices.id, serviceId),
        eq(medicalServices.organizationId, requestingUser.organizationId),
        eq(medicalServices.isActive, true)
      ),
      with: {
        doctorServices: {
          with: {
            doctor: {
              columns: { idDoctor: true, speciality: true },
              with: {
                user: {
                  columns: { displayName: true }
                }
              }
            }
          },
          where: eq(medicalServices.isActive, true)
        },
        appointments: {
          columns: { id: true, date: true, time: true, status: true },
          with: {
            patient: {
              columns: { firstName: true, lastName: true, patientCode: true }
            }
          },
          limit: 10,
          orderBy: (appointments, { desc }) => [desc(appointments.date)]
        }
      }
    });

    if (!service) {
      return createErrorResponse("Servicio médico no encontrado", undefined, HTTP_STATUS.NOT_FOUND);
    }

    return createSuccessResponse(service, "Servicio médico encontrado");
  } catch (error) {
    return handleDatabaseError(error, "obtener servicio médico");
  }
};

// PUT - Actualizar servicio médico
const updateMedicalServiceHandler = async (
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

    // Solo admins pueden actualizar servicios médicos
    const roleValidationError = validateUserRole(requestingUser.role, ["admin"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    const serviceId = parseInt(params.id);
    if (isNaN(serviceId)) {
      return createErrorResponse("ID de servicio inválido", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    // Verificar que el servicio existe y pertenece a la organización
    const existingService = await db.query.medicalServices.findFirst({
      where: and(
        eq(medicalServices.id, serviceId),
        eq(medicalServices.organizationId, requestingUser.organizationId),
        eq(medicalServices.isActive, true)
      )
    });

    if (!existingService) {
      return createErrorResponse("Servicio médico no encontrado", undefined, HTTP_STATUS.NOT_FOUND);
    }

    const body = await request.json();

    // Si se está actualizando el código, verificar que no exista otro servicio con el mismo
    if (body.code) {
      const duplicateService = await db.query.medicalServices.findFirst({
        where: and(
          eq(medicalServices.organizationId, requestingUser.organizationId),
          eq(medicalServices.code, body.code.toUpperCase()),
          eq(medicalServices.isActive, true),
          not(eq(medicalServices.id, serviceId))
        )
      });

      if (duplicateService) {
        return createErrorResponse(
          "Ya existe otro servicio con este código", 
          undefined, 
          HTTP_STATUS.CONFLICT
        );
      }
    }

    // Preparar datos de actualización
    const updateData: Partial<NewMedicalService> = {};
    
    // Mapear campos específicos con validación de tipos
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.code !== undefined) updateData.code = body.code.toUpperCase();
    if (body.durationMinutes !== undefined) updateData.durationMinutes = parseInt(body.durationMinutes);
    if (body.basePrice !== undefined) updateData.basePrice = body.basePrice.toString();
    if (body.category !== undefined) updateData.category = body.category;
    if (body.requiresPreparation !== undefined) updateData.requiresPreparation = body.requiresPreparation;
    if (body.preparationInstructions !== undefined) updateData.preparationInstructions = body.preparationInstructions;

    if (Object.keys(updateData).length === 0) {
      return createErrorResponse("No hay campos para actualizar", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    await db.update(medicalServices)
      .set(updateData)
      .where(eq(medicalServices.id, serviceId));

    return createSuccessResponse(
      { id: serviceId, updated: Object.keys(updateData) },
      "Servicio médico actualizado exitosamente"
    );
  } catch (error) {
    return handleDatabaseError(error, "actualizar servicio médico");
  }
};

// DELETE - Desactivar servicio médico (soft delete)
const deleteMedicalServiceHandler = async (
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

    // Solo admins pueden eliminar servicios médicos
    const roleValidationError = validateUserRole(requestingUser.role, ["admin"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    const serviceId = parseInt(params.id);
    if (isNaN(serviceId)) {
      return createErrorResponse("ID de servicio inválido", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    // Verificar que el servicio existe y pertenece a la organización
    const existingService = await db.query.medicalServices.findFirst({
      where: and(
        eq(medicalServices.id, serviceId),
        eq(medicalServices.organizationId, requestingUser.organizationId),
        eq(medicalServices.isActive, true)
      )
    });

    if (!existingService) {
      return createErrorResponse("Servicio médico no encontrado", undefined, HTTP_STATUS.NOT_FOUND);
    }

    // Verificar si hay citas futuras con este servicio
    const futureAppointments = await db.query.appointments.findFirst({
      where: and(
        eq(medicalServices.id, serviceId),
        // Aquí podrías agregar condición para citas futuras si es necesario
      )
    });

    // Soft delete - marcar como inactivo
    await db.update(medicalServices)
      .set({ isActive: false })
      .where(eq(medicalServices.id, serviceId));

    return createSuccessResponse(
      { 
        id: serviceId,
        warning: futureAppointments ? "El servicio tenía citas asociadas que podrían verse afectadas" : null
      },
      "Servicio médico desactivado exitosamente"
    );
  } catch (error) {
    return handleDatabaseError(error, "eliminar servicio médico");
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
  return getMedicalServiceByIdHandler(request, decodedToken, { params: resolvedParams });
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
  return updateMedicalServiceHandler(request, decodedToken, { params: resolvedParams });
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
  return deleteMedicalServiceHandler(request, decodedToken, { params: resolvedParams });
}