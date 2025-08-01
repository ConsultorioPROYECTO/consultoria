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
import { eq, and } from 'drizzle-orm';

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

    // Optimización: Una sola consulta con JOINs para obtener toda la información necesaria
    const userWithOrgAndRoleInfo = await db
      .select({
        // Información del usuario
        userId: users.id,
        firebaseUid: users.firebaseUid,
        email: users.email,
        role: users.role,
        organizationId: users.organizationId,
        
        // Información de la organización
        organizationName: organization.name,
        
        // Información del doctor (si aplica)
        doctorId: doctors.idDoctor,
        doctorSpeciality: doctors.speciality,
        doctorCalendarId: doctors.calendar_id,
        doctorMedicalLicense: doctors.nitId,
        
        // Información del asistente (si aplica)
        assistantId: assistants.idAssistant,
      })
      .from(users)
      .leftJoin(organization, eq(users.organizationId, organization.id))
      .leftJoin(doctors, eq(users.id, doctors.userId))
      .leftJoin(assistants, eq(users.id, assistants.userId))
      .where(
        and(
          eq(users.firebaseUid, uid),
          eq(users.organizationId, parseInt(organizationId))
        )
      )
      .limit(1);

    if (userWithOrgAndRoleInfo.length === 0) {
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.USER_NOT_FOUND,
          'Usuario no encontrado o no pertenece a la organización solicitada',
          HTTP_STATUS.NOT_FOUND
        ),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const userInfo = userWithOrgAndRoleInfo[0];
    
    if (!userInfo.organizationName) {
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.NOT_FOUND,
          'Organización no encontrada',
          HTTP_STATUS.NOT_FOUND
        ),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

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
      role: userInfo.role as 'admin' | 'doctor' | 'assistant' | 'patient',
      organizationId,
      organizationName: userInfo.organizationName,
      tokenVersion: 1,
    };

    // Obtener información específica según el rol
    if (userInfo.role === 'medico') {
      if (userInfo.doctorId) {
        tokenData.doctorInfo = {
           doctorId: userInfo.doctorId.toString(),
           specialty: userInfo.doctorSpeciality || '',
           googleCalendarId: userInfo.doctorCalendarId || undefined,
           medicalLicense: userInfo.doctorMedicalLicense || undefined,
         };
      }
    }

    if (userInfo.role === 'asistente') {
      if (userInfo.assistantId) {
        // Obtener doctores asignados (esto podría requerir una tabla de relación)
        // Por ahora, usamos un array vacío como placeholder
        tokenData.assistantInfo = {
          assistantId: userInfo.assistantId.toString(),
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
            uid: userInfo.firebaseUid,
            email: userInfo.email,
            role: userInfo.role,
            organizationId: userInfo.organizationId,
            organizationName: userInfo.organizationName,
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