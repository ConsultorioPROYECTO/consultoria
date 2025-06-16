/**
 * Ruta de API para crear tokens personalizados de Firebase.
 * @packageDocumentation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createMedicalCustomToken } from '@/app/lib/firebase/server/adminConfig';
import { validateRequestBody } from '@/lib/api-helpers';
import { createErrorResponse, createSuccessResponse, HTTP_STATUS, API_ERRORS } from '@/types/api';
import { db } from '@/db';
import { users, doctors, assistants, organization } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Esquema de validación para la solicitud de token personalizado.
 */
const CreateTokenRequestSchema = z.object({
  uid: z.string().min(1, 'UID de Firebase es requerido'),
  email: z.string().email('Email válido es requerido'),
  organizationId: z.string().min(1, 'ID de organización es requerido'),
});

/**
 * POST /api/auth/create-custom-token
 * Crea un token personalizado para un usuario basado en su información en la base de datos.
 */
export async function POST(request: NextRequest) {
  try {
    // Validar el cuerpo de la solicitud
    const validation = await validateRequestBody(request, CreateTokenRequestSchema);
    
    if (!validation.success) {
      return NextResponse.json(validation.error.body, { status: validation.error.status });
    }

    const { uid, organizationId } = validation.data;

    // Buscar el usuario en la base de datos
    const userResult = await db
      .select({
        id: users.id,
        firebaseUid: users.firebaseUid,
        email: users.email,
        role: users.role,
        organizationId: users.organizationId,
      })
      .from(users)
      .where(eq(users.firebaseUid, uid))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.USER_NOT_FOUND,
          'Usuario no encontrado en la base de datos',
          HTTP_STATUS.NOT_FOUND
        ),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const user = userResult[0];

    // Verificar que el usuario pertenezca a la organización solicitada
    if (user.organizationId?.toString() !== organizationId) {
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.FORBIDDEN,
          'Usuario no pertenece a la organización especificada',
          HTTP_STATUS.FORBIDDEN
        ).body,
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // Obtener información de la organización
    const orgResult = await db
      .select({
        id: organization.id,
        name: organization.name,
      })
      .from(organization)
      .where(eq(organization.id, parseInt(organizationId)))
      .limit(1);

    if (orgResult.length === 0) {
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.USER_NOT_FOUND,
          'Organización no encontrada',
          HTTP_STATUS.NOT_FOUND
        ),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const org = orgResult[0];

    // Preparar datos base para el token
    const tokenData: {
      uid: string;
      role: 'admin' | 'doctor' | 'assistant' | 'patient';
      organizationId: string;
      organizationName: string;
      tokenVersion: number;
      doctorInfo?: {
        doctorId: string;
        specialty: string;
        googleCalendarId?: string;
        medicalLicense?: string;
      };
      assistantInfo?: {
        assistantId: string;
        assignedDoctors: string[];
      };
    } = {
      uid,
      role: user.role as 'admin' | 'doctor' | 'assistant' | 'patient',
      organizationId,
      organizationName: org.name,
      tokenVersion: 1,
    };

    // Obtener información específica según el rol
    if (user.role === 'medico') {
      const doctorResult = await db
        .select({
          id: doctors.idDoctor,
          specialty: doctors.speciality,
          googleCalendarId: doctors.calendar_id,
          medicalLicense: doctors.nitId,
        })
        .from(doctors)
        .where(eq(doctors.userId, user.id))
        .limit(1);

      if (doctorResult.length > 0) {
        const doctor = doctorResult[0];
        tokenData.doctorInfo = {
          doctorId: doctor.id.toString(),
          specialty: doctor.specialty,
          googleCalendarId: doctor.googleCalendarId || undefined,
          medicalLicense: doctor.medicalLicense || undefined,
        };
      }
    }

    if (user.role === 'asistente') {
      const assistantResult = await db
        .select({
          id: assistants.idAssistant,
        })
        .from(assistants)
        .where(eq(assistants.userId, user.id))
        .limit(1);

      if (assistantResult.length > 0) {
        const assistant = assistantResult[0];
        
        // Obtener doctores asignados (esto podría requerir una tabla de relación)
        // Por ahora, usamos un array vacío como placeholder
        tokenData.assistantInfo = {
          assistantId: assistant.id.toString(),
          assignedDoctors: [], // TODO: Implementar lógica de doctores asignados
        };
      }
    }

    // Crear el token personalizado
    const customToken = await createMedicalCustomToken(tokenData);

    return NextResponse.json(
      createSuccessResponse(
        {
          customToken,
          user: {
            uid: user.firebaseUid,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            organizationName: org.name,
          },
        },
        'Token personalizado creado exitosamente'
      ),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('Error creando token personalizado:', error);
    
    return NextResponse.json(
      createErrorResponse(
        API_ERRORS.INTERNAL_ERROR,
        'Error interno del servidor al crear el token',
        HTTP_STATUS.INTERNAL_ERROR
      ),
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}

/**
 * GET /api/auth/create-custom-token
 * Endpoint de información sobre la creación de tokens.
 */
export async function GET() {
  return NextResponse.json(
    {
      message: 'Endpoint para crear tokens personalizados de Firebase',
      method: 'POST',
      requiredFields: {
        uid: 'string - UID de Firebase del usuario',
        email: 'string - Email del usuario',
        organizationId: 'string - ID de la organización',
      },
      response: {
        customToken: 'string - Token personalizado de Firebase',
        user: 'object - Información del usuario',
      },
    },
    { status: HTTP_STATUS.OK }
  );
}