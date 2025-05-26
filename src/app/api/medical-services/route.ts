import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { medicalServices, users } from "@/db/schema";
import { auth } from "@/app/lib/firebase/server/adminConfig";
import type { DecodedIdToken } from "firebase-admin/auth";
import { eq, and } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse, API_ERRORS, HTTP_STATUS } from "@/types/api";
import { validateUserRole, handleDatabaseError } from "@/lib/api-helpers";
import type { NewMedicalService } from "@/db/schema";

// GET - Obtener todos los servicios médicos de la organización
const getMedicalServicesHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken
): Promise<NextResponse | Response> => {
  try {
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse(API_ERRORS.USER_NOT_FOUND, undefined, HTTP_STATUS.FORBIDDEN);
    }

    // Todos los roles pueden ver servicios médicos
    const roleValidationError = validateUserRole(requestingUser.role, ["admin", "medico", "asistente"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    // Obtener parámetros de query
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const activeOnly = url.searchParams.get('active') !== 'false'; // Por defecto true

    // Construir condiciones de filtro
    let whereConditions = and(
      eq(medicalServices.organizationId, requestingUser.organizationId)
    );

    if (activeOnly) {
      whereConditions = and(whereConditions, eq(medicalServices.isActive, true));
    }

    if (category) {
      whereConditions = and(whereConditions, eq(medicalServices.category, category));
    }

    const organizationServices = await db.query.medicalServices.findMany({
      where: whereConditions,
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
          where: eq(medicalServices.isActive, true) // Solo doctores activos
        }
      },
      orderBy: (medicalServices, { asc }) => [asc(medicalServices.category), asc(medicalServices.name)]
    });

    // Obtener categorías disponibles para filtros
    const categories = await db.selectDistinct({ category: medicalServices.category })
      .from(medicalServices)
      .where(and(
        eq(medicalServices.organizationId, requestingUser.organizationId),
        eq(medicalServices.isActive, true)
      ));

    return createSuccessResponse({
      services: organizationServices,
      categories: categories.map(c => c.category),
      total: organizationServices.length
    }, `${organizationServices.length} servicios encontrados`);
  } catch (error) {
    return handleDatabaseError(error, "obtener servicios médicos");
  }
};

// POST - Crear nuevo servicio médico
const createMedicalServiceHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken
): Promise<NextResponse | Response> => {
  try {
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse(API_ERRORS.USER_NOT_FOUND, undefined, HTTP_STATUS.FORBIDDEN);
    }

    // Solo admins pueden crear servicios médicos
    const roleValidationError = validateUserRole(requestingUser.role, ["admin"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    const body = await request.json();
    
    // Validar campos requeridos
    const requiredFields = ['name', 'code', 'category', 'durationMinutes', 'basePrice'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return createErrorResponse(`Campo requerido: ${field}`, undefined, HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Verificar que no exista un servicio con el mismo código en la organización
    const existingService = await db.query.medicalServices.findFirst({
      where: and(
        eq(medicalServices.organizationId, requestingUser.organizationId),
        eq(medicalServices.code, body.code),
        eq(medicalServices.isActive, true)
      )
    });

    if (existingService) {
      return createErrorResponse(
        "Ya existe un servicio con este código en la organización", 
        undefined, 
        HTTP_STATUS.CONFLICT
      );
    }

    const newServiceData: NewMedicalService = {
      name: body.name,
      description: body.description || null,
      code: body.code.toUpperCase(), // Normalizar código a mayúsculas
      durationMinutes: parseInt(body.durationMinutes),
      basePrice: body.basePrice.toString(), // Convertir a string para decimal
      category: body.category,
      requiresPreparation: body.requiresPreparation || false,
      preparationInstructions: body.preparationInstructions || null,
      organizationId: requestingUser.organizationId,
    };

    const [createdService] = await db.insert(medicalServices).values(newServiceData);

    return createSuccessResponse(
      { id: createdService.insertId, code: newServiceData.code },
      "Servicio médico creado exitosamente",
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    return handleDatabaseError(error, "crear servicio médico");
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

export async function GET(request: NextRequest) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return getMedicalServicesHandler(request, decodedToken);
}

export async function POST(request: NextRequest) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return createMedicalServiceHandler(request, decodedToken);
}