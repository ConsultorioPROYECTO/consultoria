import { NextRequest, NextResponse } from "next/server";
import { db } from "@rutas/db";
import { users, assistants, assistantDoctor, doctors } from "@rutas/db/schema";
import { withAuthentication } from "@rutas/app/lib/firebase/server/middleware/authMiddleware";
import type { DecodedIdToken } from "firebase-admin/auth";
import { eq, inArray } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse, API_ERRORS, HTTP_STATUS, type DoctorsWithAppointmentsResponse } from "@/types/api";
import { validateUserRole, handleDatabaseError } from "@/lib/api-helpers";
// Tipos inferidos para mayor robustez y autocompletado
// type Doctor = InferSelectModel<typeof doctors>;

const getDoctorsWithAppointmentsHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken
): Promise<NextResponse | Response> => {
  try {
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true },
    });
    if (!requestingUser) {
      return createErrorResponse(API_ERRORS.USER_NOT_FOUND, undefined, HTTP_STATUS.FORBIDDEN);
    }
    const roleValidationError = validateUserRole(requestingUser.role, ["asistente","medico"]);
    if (roleValidationError) {
      return roleValidationError;
    }
    // Buscar el registro de assistant por userId usando el índice
    const assistant = await db.query.assistants.findFirst({
      where: eq(assistants.userId, requestingUser.id),
      columns: { idAssistant: true },
    });
    if (!assistant) {
      return createErrorResponse("Assistant not found", undefined, HTTP_STATUS.NOT_FOUND);
    }
    const assistantIdNum = assistant.idAssistant;
    // Obtener los doctores asociados y sus citas
    const assistantDoctors = await db.query.assistantDoctor.findMany({
      where: eq(assistantDoctor.assistantId, assistantIdNum),
      columns: { doctorId: true },
    });
    const doctorIds = assistantDoctors.map((ad) => ad.doctorId);
    if (doctorIds.length === 0) {
      return createSuccessResponse([] as DoctorsWithAppointmentsResponse, "No doctors found for this assistant");
    }
    const doctorsWithAppointments = await db.query.doctors.findMany({
      where: inArray(doctors.idDoctor, doctorIds),
      with: {
        appointments: {
          with: {
            patient: true, // Trae el paciente relacionado en cada cita
          },
        },
      },
    });

    console.log("Doctors with appointments:", doctorsWithAppointments);

    return createSuccessResponse(doctorsWithAppointments  as DoctorsWithAppointmentsResponse, "Doctors with appointments retrieved successfully");
  } catch (error) {
    return handleDatabaseError(error, "retrieve doctors with appointments");
  }
};

export const GET = withAuthentication(getDoctorsWithAppointmentsHandler);