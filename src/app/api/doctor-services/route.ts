// @app/api/doctor-services/route.ts

/**
 *  @fileoverview doctor-services/route.ts
 *  @description API para manejar relaciones entre doctores y servicios médicos.
 *  Permite obtener, crear y eliminar asignaciones de servicios a doctores.
 *  @author Santiago Prada - Backend Developer
 *  @version 1.0.0
 *  @date 2025-05-26
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { doctorServices, users, doctors, medicalServices } from "@/db/schema";
import { auth } from "@/app/lib/firebase/server/adminConfig";
import type { DecodedIdToken } from "firebase-admin/auth";
import { eq, and } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from "@/types/api";
import { validateUserRole, handleDatabaseError } from "@/lib/api-helpers";
import type {  NewDoctorService } from "@/db/schema";

/**
 * @description Autentica la solicitud verificando el token de Firebase.
 * Si el token es válido, devuelve el token decodificado; de lo contrario, devuelve null.
 * @author Santiago Prada - Backend Developer
 * @version 1.0.0
 * @date 2025-05-26
 * @throws {Error} Si ocurre un error al verificar el token.
 * @see https://firebase.google.com/docs/auth/admin/verify-id-tokens
 * @param {NextRequest} request - La solicitud entrante de Next.js.
 * @returns {Promise<DecodedIdToken | null>} El token decodificado si la autenticación es exitosa, o null si falla.
 * @returns 
 */
async function authenticateRequest(request: NextRequest): Promise<DecodedIdToken | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * @description Manejador para obtener servicios médicos asignados a doctores en la organización del usuario autenticado.
 * Permite filtrar por doctor, servicio y disponibilidad.
 * @author Santiago Prada - Backend Developer
 * @version 1.0.0
 * @date 2025-05-26
 * @throws {Error} Si ocurre un error al consultar la base de datos.
 * @param {NextRequest} request - La solicitud entrante de Next.js.
 * @param {DecodedIdToken} decodedToken - El token decodificado del usuario autenticado.
 * @URLParams 'doctorId' (opcional) - Filtra por ID del doctor.
 * @URLParams 'serviceId' (opcional) - Filtra por ID del servicio médico.
 * @URLParams 'available' (opcional) - Filtra por servicios disponibles (true por defecto).
 * @returns {Promise<NextResponse | Response>} Respuesta con los servicios médicos asignados o error.
 */
const getDoctorServicesHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken
): Promise<NextResponse | Response> => {
  try {
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse('User not found', undefined, HTTP_STATUS.FORBIDDEN);
    }

    const roleValidationError = validateUserRole(requestingUser.role, ["admin", "medico", "asistente"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    // Obtener parámetros de query
    const url = new URL(request.url);
    const doctorId = url.searchParams.get('doctorId');
    const serviceId = url.searchParams.get('serviceId');
    const availableOnly = url.searchParams.get('available') !== 'false'; // Por defecto true

    // Para médicos, solo pueden ver sus propios servicios
    let targetDoctorId: number | null = null;
    if (requestingUser.role === 'medico') {
      const doctorRecord = await db.query.doctors.findFirst({
        where: eq(doctors.userId, requestingUser.id),
        columns: { idDoctor: true }
      });
      
      if (!doctorRecord) {
        return createErrorResponse("Registro de doctor no encontrado", undefined, HTTP_STATUS.FORBIDDEN);
      }
      targetDoctorId = doctorRecord.idDoctor;
    } else if (doctorId) {
      targetDoctorId = parseInt(doctorId);
    }

    // Construir query para obtener doctor-services de la organización
    const organizationDoctorServices = await db.query.doctorServices.findMany({
      where: and(
        targetDoctorId ? eq(doctorServices.doctorId, targetDoctorId) : undefined,
        serviceId ? eq(doctorServices.serviceId, parseInt(serviceId)) : undefined,
        availableOnly ? eq(doctorServices.isAvailable, true) : undefined
      ),
      with: {
        doctor: {
          columns: { idDoctor: true, speciality: true, userId: true },
          with: {
            user: {
              columns: { displayName: true, organizationId: true }
            }
          }
        },
        service: {
          columns: { id: true, name: true, code: true, category: true, basePrice: true, durationMinutes: true }
        }
      }
    });

    // Filtrar resultados que pertenezcan a la organización (doble verificación)
    const filteredResults = organizationDoctorServices.filter(
      ds => ds.doctor?.user?.organizationId === requestingUser.organizationId
    );

    return createSuccessResponse({
      doctorServices: filteredResults,
      total: filteredResults.length
    }, `${filteredResults.length} relaciones doctor-servicio encontradas`);
  } catch (error) {
    return handleDatabaseError(error, "obtener relaciones doctor-servicio");
  }
};

/**
 * @description Manejador para crear una nueva relación entre un doctor y un servicio médico.
 * Permite asignar un servicio a un doctor en la organización del usuario autenticado.
 * @author Santiago Prada - Backend Developer
 * @version 1.0.0
 * @date 2025-05-26
 * @throws {Error} Si ocurre un error al consultar la base de datos o al insertar el nuevo registro.
 * @param {NextRequest} request - La solicitud entrante de Next.js.
 * @param {DecodedIdToken} decodedToken - El token decodificado del usuario autenticado.
 * @returns {Promise<NextResponse | Response>} Respuesta con el nuevo servicio asignado al doctor o error.
 * @see https://firebase.google.com/docs/auth/admin/verify-id-tokens
 */
const createDoctorServiceHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken
): Promise<NextResponse | Response> => {
  try {
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse('User not found', undefined, HTTP_STATUS.FORBIDDEN);
    }

    // Solo admins pueden asignar servicios a doctores
    const roleValidationError = validateUserRole(requestingUser.role, "admin");
    if (roleValidationError) {
      return roleValidationError;
    }

    const body = await request.json();
    
    // Validar campos requeridos
    if (!body.doctorId || !body.serviceId) {
      return createErrorResponse("doctorId y serviceId son requeridos", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    const doctorId = parseInt(body.doctorId);
    const serviceId = parseInt(body.serviceId);

    // Verificar que el doctor existe y pertenece a la organización
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, doctorId),
      with: {
        user: {
          columns: { organizationId: true }
        }
      }
    });

    if (!doctor || doctor.user?.organizationId !== requestingUser.organizationId) {
      return createErrorResponse("Doctor no encontrado o no pertenece a la organización", undefined, HTTP_STATUS.NOT_FOUND);
    }

    // Verificar que el servicio existe y pertenece a la organización
    const service = await db.query.medicalServices.findFirst({
      where: and(
        eq(medicalServices.id, serviceId),
        eq(medicalServices.organizationId, requestingUser.organizationId),
        eq(medicalServices.isActive, true)
      )
    });

    if (!service) {
      return createErrorResponse("Servicio médico no encontrado", undefined, HTTP_STATUS.NOT_FOUND);
    }

    // Verificar que no exista ya esta relación
    const existingRelation = await db.query.doctorServices.findFirst({
      where: and(
        eq(doctorServices.doctorId, doctorId),
        eq(doctorServices.serviceId, serviceId)
      )
    });

    if (existingRelation) {
      return createErrorResponse(
        "El doctor ya tiene asignado este servicio", 
        undefined, 
        HTTP_STATUS.CONFLICT
      );
    }

    const newDoctorServiceData: NewDoctorService = {
      doctorId,
      serviceId,
      customPrice: body.customPrice ? body.customPrice.toString() : null,
      isAvailable: body.isAvailable !== undefined ? body.isAvailable : true,
    };

    await db.insert(doctorServices).values(newDoctorServiceData);

    return createSuccessResponse(
      { doctorId, serviceId },
      "Servicio asignado al doctor exitosamente",
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    return handleDatabaseError(error, "asignar servicio a doctor");
  }
};

/**
 * @description Manejador para las solicitudes GET.
 *  Permite obtener servicios médicos asignados a doctores.
 * @author Santiago Prada - Backend Developer
 * @version 1.0.0
 * @date 2025-05-26
 * @throws {Error} Si ocurre un error al autenticar la solicitud o al obtener los servicios.
 * @param {NextRequest} request - La solicitud entrante de Next.js.
 * @returns {Promise<NextResponse | Response>} Respuesta con los servicios médicos asignados o error.
 * @see https://firebase.google.com/docs/auth/admin/verify-id-tokens
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */
export async function GET(request: NextRequest) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return getDoctorServicesHandler(request, decodedToken);
}

/**
 * @description Manejador para las solicitudes POST.
 *  Permite crear una nueva relación entre un doctor y un servicio médico.
 * @author Santiago Prada - Backend Developer
 * @version 1.0.0
 * @date 2025-05-26
 * @throws {Error} Si ocurre un error al autenticar la solicitud o al crear la relación.
 * @param {NextRequest} request - La solicitud entrante de Next.js.
 * @returns {Promise<NextResponse | Response>} Respuesta con el nuevo servicio asignado al doctor o error.
 * @see https://firebase.google.com/docs/auth/admin/verify-id-tokens
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */
export async function POST(request: NextRequest) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return createDoctorServiceHandler(request, decodedToken);
}