import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patients, users } from "@/db/schema";
import { auth } from "@/app/lib/firebase/server/adminConfig";
import type { DecodedIdToken } from "firebase-admin/auth";
import { eq, and } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse, API_ERRORS, HTTP_STATUS } from "@/types/api";
import { validateUserRole, handleDatabaseError } from "@/lib/api-helpers";
import type { NewPatient } from "@/db/schema";

// GET - Obtener todos los pacientes de la organización del usuario
const getPatientsHandler = async (
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

    // Validar que el usuario tenga permisos para ver pacientes
    const roleValidationError = validateUserRole(requestingUser.role, ["admin", "medico", "asistente"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    // Obtener pacientes de la misma organización
    const organizationPatients = await db.query.patients.findMany({
      where: eq(patients.organizationId, requestingUser.organizationId),
      with: {
        user: {
          columns: { email: true, displayName: true }
        },
        appointments: {
          columns: { id: true, date: true, time: true, status: true },
          where: eq(patients.isActive, true),
          limit: 5,
          orderBy: (appointments, { desc }) => [desc(appointments.date)]
        }
      },
      orderBy: (patients, { desc }) => [desc(patients.createdAt)]
    });

    return createSuccessResponse(organizationPatients, `${organizationPatients.length} pacientes encontrados`);
  } catch (error) {
    return handleDatabaseError(error, "obtener pacientes");
  }
};

// POST - Crear nuevo paciente
const createPatientHandler = async (
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

    // Solo admins y asistentes pueden crear pacientes
    const roleValidationError = validateUserRole(requestingUser.role, ["admin", "asistente"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    const body = await request.json();
    
    // Validar campos requeridos
    const requiredFields = ['firstName', 'lastName', 'identificationType', 'identificationNumber', 'gender'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return createErrorResponse(`Campo requerido: ${field}`, undefined, HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Generar código único de paciente
    const patientCode = `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Verificar que no exista un paciente con la misma identificación en la organización
    const existingPatient = await db.query.patients.findFirst({
      where: and(
        eq(patients.organizationId, requestingUser.organizationId),
        eq(patients.identificationType, body.identificationType),
        eq(patients.identificationNumber, body.identificationNumber),
        eq(patients.isActive, true)
      )
    });

    if (existingPatient) {
      return createErrorResponse(
        "Ya existe un paciente con esta identificación en la organización", 
        undefined, 
        HTTP_STATUS.CONFLICT
      );
    }

    const newPatientData: NewPatient = {
      patientCode,
      firstName: body.firstName,
      lastName: body.lastName,
      identificationType: body.identificationType,
      identificationNumber: body.identificationNumber,
      birthDate: body.birthDate || null,
      gender: body.gender,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      emergencyContactName: body.emergencyContactName || null,
      emergencyContactPhone: body.emergencyContactPhone || null,
      emergencyContactRelation: body.emergencyContactRelation || null,
      medicalHistory: body.medicalHistory || null,
      allergies: body.allergies || null,
      currentMedications: body.currentMedications || null,
      bloodType: body.bloodType || null,
      organizationId: requestingUser.organizationId,
      userId: body.userId || null, // Opcional: vincular con usuario existente
    };

    const [createdPatient] = await db.insert(patients).values(newPatientData);

    return createSuccessResponse(
      { id: createdPatient.insertId, patientCode },
      "Paciente creado exitosamente",
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    return handleDatabaseError(error, "crear paciente");
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

  return getPatientsHandler(request, decodedToken);
}

export async function POST(request: NextRequest) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return createPatientHandler(request, decodedToken);
}