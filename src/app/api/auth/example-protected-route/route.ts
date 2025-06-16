/**
 * Ejemplo de ruta protegida usando el middleware de autenticación.
 * @packageDocumentation
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateRequest, 
  requireDoctor, 
  requireCalendarAccess,
  canAccessDoctorAppointments,
  getDoctorInfo 
} from '@/lib/auth-middleware';
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from '@/types/api';

/**
 * GET /api/auth/example-protected-route
 * Ejemplo de ruta que requiere autenticación básica.
 */
export async function GET(request: NextRequest) {
  // Autenticación básica - cualquier usuario autenticado
  const authResult = await authenticateRequest(request, {
    allowedRoles: ['admin', 'doctor', 'assistant'],
  });

  if (!authResult.success) {
    return NextResponse.json(authResult.error!.body, { status: authResult.error!.status });
  }

  const user = authResult.user!;

  return NextResponse.json(
    createSuccessResponse(
      {
        message: 'Acceso autorizado',
        user: {
          uid: user.uid,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          permissions: user.permissions,
        },
      },
      'Usuario autenticado correctamente'
    ).body,
    { status: HTTP_STATUS.OK }
  );
}

/**
 * POST /api/auth/example-protected-route
 * Ejemplo de ruta que requiere permisos específicos.
 */
export async function POST(request: NextRequest) {
  // Requiere permisos específicos para gestionar pacientes
  const authResult = await authenticateRequest(request, {
    requiredPermissions: ['managePatients'],
    allowedRoles: ['admin', 'doctor', 'assistant'],
  });

  if (!authResult.success) {
    return NextResponse.json(authResult.error!.body, { status: authResult.error!.status });
  }

  const user = authResult.user!;

  return NextResponse.json(
    createSuccessResponse(
      {
        message: 'Operación autorizada',
        action: 'manage_patients',
        user: {
          uid: user.uid,
          role: user.role,
          organizationId: user.organizationId,
        },
      },
      'Permisos verificados correctamente'
    ).body,
    { status: HTTP_STATUS.OK }
  );
}

/**
 * PUT /api/auth/example-protected-route
 * Ejemplo de ruta que requiere ser doctor.
 */
export async function PUT(request: NextRequest) {
  // Solo doctores pueden acceder
  const authResult = await requireDoctor(request);

  if (!authResult.success) {
    return NextResponse.json(authResult.error!.body, { status: authResult.error!.status });
  }

  const user = authResult.user!;
  const doctorInfo = getDoctorInfo(user);

  return NextResponse.json(
    createSuccessResponse(
      {
        message: 'Acceso de doctor autorizado',
        doctor: {
          uid: user.uid,
          doctorId: doctorInfo?.doctorId,
          specialty: doctorInfo?.specialty,
          hasCalendarAccess: user.calendarAccess,
        },
      },
      'Doctor autenticado correctamente'
    ).body,
    { status: HTTP_STATUS.OK }
  );
}

/**
 * PATCH /api/auth/example-protected-route
 * Ejemplo de ruta que requiere acceso al calendario.
 */
export async function PATCH(request: NextRequest) {
  // Requiere acceso al calendario
  const authResult = await requireCalendarAccess(request);

  if (!authResult.success) {
    return NextResponse.json(authResult.error!.body, { status: authResult.error!.status });
  }

  const user = authResult.user!;

  return NextResponse.json(
    createSuccessResponse(
      {
        message: 'Acceso al calendario autorizado',
        calendarAccess: user.calendarAccess,
        role: user.role,
        organizationId: user.organizationId,
      },
      'Acceso al calendario verificado'
    ).body,
    { status: HTTP_STATUS.OK }
  );
}

/**
 * DELETE /api/auth/example-protected-route
 * Ejemplo de verificación de acceso a citas de doctor específico.
 */
export async function DELETE(request: NextRequest) {
  const authResult = await authenticateRequest(request, {
    allowedRoles: ['admin', 'doctor', 'assistant'],
  });

  if (!authResult.success) {
    return NextResponse.json(authResult.error!.body, { status: authResult.error!.status });
  }

  const user = authResult.user!;
  
  // Simular un doctorId desde query params
  const url = new URL(request.url);
  const doctorId = url.searchParams.get('doctorId');

  if (!doctorId) {
    return NextResponse.json(
      createErrorResponse(
        'INVALID_REQUEST',
        'doctorId es requerido',
        HTTP_STATUS.BAD_REQUEST
      ).body,
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  // Verificar si puede acceder a las citas de este doctor
  const canAccess = canAccessDoctorAppointments(user, doctorId);

  if (!canAccess) {
    return NextResponse.json(
      createErrorResponse(
        'FORBIDDEN',
        'No tienes permisos para acceder a las citas de este doctor',
        HTTP_STATUS.FORBIDDEN
      ).body,
      { status: HTTP_STATUS.FORBIDDEN }
    );
  }

  return NextResponse.json(
    createSuccessResponse(
      {
        message: 'Acceso a citas autorizado',
        doctorId,
        userRole: user.role,
        canAccess: true,
      },
      'Permisos de acceso a citas verificados'
    ).body,
    { status: HTTP_STATUS.OK }
  );
}