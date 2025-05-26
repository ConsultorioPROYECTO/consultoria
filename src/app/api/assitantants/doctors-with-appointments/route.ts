import { NextRequest, NextResponse } from "next/server";
import { db } from "@rutas/db";
import { users, assistants, assistantDoctor, doctors } from "@rutas/db/schema";
import { withAuthentication } from "@rutas/app/lib/firebase/server/middleware/authMiddleware";
import type { DecodedIdToken } from "firebase-admin/auth";
import { eq, inArray } from "drizzle-orm";

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
      return NextResponse.json({ error: "Acceso denegado: Usuario no encontrado." }, { status: 403 });
    }
    if (requestingUser.role !== "asistente") {
      return NextResponse.json({ error: "Acceso denegado: Debes ser asistente." }, { status: 403 });
    }
    // Buscar el registro de assistant por userId usando el índice
    const assistant = await db.query.assistants.findFirst({
      where: eq(assistants.userId, requestingUser.id),
      columns: { idAssistant: true },
    });
    if (!assistant) {
      return NextResponse.json({ error: "Assistant not found" }, { status: 404 });
    }
    const assistantIdNum = assistant.idAssistant;
    // Obtener los doctores asociados y sus citas
    const assistantDoctors = await db.query.assistantDoctor.findMany({
      where: eq(assistantDoctor.assistantId, assistantIdNum),
      columns: { doctorId: true },
    });
    const doctorIds = assistantDoctors.map((ad) => ad.doctorId);
    if (doctorIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }
    const doctorsWithAppointments = await db.query.doctors.findMany({
      where: inArray(doctors.idDoctor, doctorIds),
      with: {
        appointments: true,
      },
    });
    return NextResponse.json(doctorsWithAppointments || [], { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: "Failed to process request.", details: errorMessage }, { status: 500 });
  }
};

export const GET = withAuthentication(getDoctorsWithAppointmentsHandler);