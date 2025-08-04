/**
 * @fileoverview API route for marking appointments as attended
 * @module api/appointments/attend
 * @author Santiago Prada
 * 
 * This module provides a specialized endpoint for updating appointment status
 * to ATTENDED, including timestamp tracking and validation.
 * 
 * @requires NextRequest from 'next/server'
 * @requires NextResponse from 'next/server'
 * @requires db from '@/db'
 * @requires appointments from '@/db/schema'
 * @requires eq from 'drizzle-orm'
 * @requires withOptimizedAuthentication from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware'
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { db } from '@/db';
import { appointments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { APPOINTMENT_STATUS, AppointmentStatusType } from '@/types/appointment-status';
import { validateRequestBody, handleDatabaseError } from '@/lib/api-helpers';
import {
  createSuccessResponse,
  createErrorResponse,
  API_ERRORS,
  HTTP_STATUS
} from '@/types/api';
import { z } from 'zod';

// === Import Types ===
import {
  AttendAppointmentResponse,
  DEFAULT_ATTEND_CONFIG
} from '@/types/attend-appointment';

// === Request Validation Schema ===

const attendAppointmentSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  notes: z.string().max(DEFAULT_ATTEND_CONFIG.maxNotesLength, `Notes cannot exceed ${DEFAULT_ATTEND_CONFIG.maxNotesLength} characters`).optional()
});

// === Main Handler Function ===

/**
 * Handles PATCH requests to mark appointments as attended.
 * 
 * @param request - The incoming HTTP request
 * @param userInfo - Authenticated user information
 * @returns Promise<NextResponse> - JSON response with operation result
 * 
 * @throws {400} When request validation fails
 * @throws {403} When user lacks required permissions
 * @throws {404} When appointment is not found
 * @throws {409} When appointment is already attended or in invalid state
 * @throws {500} When database operation fails
 */
async function handlePatchRequest(
  request: NextRequest,
  userInfo: AuthenticatedUserInfo
): Promise<NextResponse> {
  console.log('🔍 [ATTEND API] Starting handlePatchRequest');
  console.log('🔍 [ATTEND API] User info:', {
    userId: userInfo.user.firebaseUid,
    role: userInfo.user.role,
    organizationId: userInfo.user.organizationId
  });
  
  try {
    // Validate request body
    console.log('🔍 [ATTEND API] Validating request body...');
    const validation = await validateRequestBody(request, attendAppointmentSchema);
    if (!validation.success) {
      console.log('❌ [ATTEND API] Request validation failed:', validation.error);
      return NextResponse.json(validation.error, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const { eventId, notes } = validation.data;
    console.log('✅ [ATTEND API] Request validated successfully:', { eventId, notes: notes ? 'provided' : 'not provided' });

    // Check if appointment exists and get current status using google_event_id
    console.log('🔍 [ATTEND API] Searching for appointment with eventId:', eventId);
    const existingAppointment = await db
      .select({
        id: appointments.id,
        status: appointments.status,
        organizationId: appointments.organizationId,
        doctorId: appointments.doctorId,
        attendedAt: appointments.attendedAt,
        google_event_id: appointments.google_event_id
      })
      .from(appointments)
      .where(eq(appointments.google_event_id, eventId))
      .limit(1);

    console.log('🔍 [ATTEND API] Database query result:', {
      found: existingAppointment.length > 0,
      count: existingAppointment.length,
      appointment: existingAppointment.length > 0 ? existingAppointment[0] : null
    });

    if (existingAppointment.length === 0) {
      console.log('❌ [ATTEND API] Appointment not found for eventId:', eventId);
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.NOT_FOUND,
          'Appointment not found',
          HTTP_STATUS.NOT_FOUND
        ),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const appointment = existingAppointment[0];
    console.log('✅ [ATTEND API] Appointment found:', {
      id: appointment.id,
      status: appointment.status,
      organizationId: appointment.organizationId
    });

    // Verify user has access to this appointment's organization
    console.log('🔍 [ATTEND API] Checking organization access:', {
      userOrgId: userInfo.user.organizationId,
      appointmentOrgId: appointment.organizationId,
      hasAccess: userInfo.user.organizationId === appointment.organizationId
    });
    
    if (userInfo.user.organizationId !== appointment.organizationId) {
      console.log('❌ [ATTEND API] Organization access denied');
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.FORBIDDEN,
          'You do not have access to this appointment',
          HTTP_STATUS.FORBIDDEN
        ),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // Additional validation for assistants - they can only attend appointments for their assigned doctors
    if (userInfo.user.role === 'asistente') {
      // Here you would typically check if the assistant is assigned to this doctor
      // For now, we'll allow all assistants in the organization
    }

    // Check if appointment is already attended
    console.log('🔍 [ATTEND API] Checking appointment status:', {
      currentStatus: appointment.status,
      isAlreadyAttended: appointment.status === APPOINTMENT_STATUS.ATTENDED
    });
    
    if (appointment.status === APPOINTMENT_STATUS.ATTENDED) {
      console.log('❌ [ATTEND API] Appointment already attended');
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.CONFLICT,
          'Appointment is already marked as attended',
          HTTP_STATUS.CONFLICT
        ),
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    // Check if appointment is in a valid state to be marked as attended
    const validStatesForAttendance: AppointmentStatusType[] = [
      APPOINTMENT_STATUS.PENDING,
      APPOINTMENT_STATUS.ACCEPTED
    ];

    console.log('🔍 [ATTEND API] Validating appointment state:', {
      currentStatus: appointment.status,
      validStates: validStatesForAttendance,
      isValidState: validStatesForAttendance.includes(appointment.status as AppointmentStatusType)
    });

    if (!validStatesForAttendance.includes(appointment.status as AppointmentStatusType)) {
      console.log('❌ [ATTEND API] Invalid appointment state for attendance');
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.CONFLICT,
          `Cannot mark appointment as attended. Current status: ${appointment.status}`,
          HTTP_STATUS.CONFLICT
        ),
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    // Update appointment status to attended
    console.log('🔍 [ATTEND API] Preparing to update appointment...');
    const attendedAt = new Date();
    const updateData: Partial<typeof appointments.$inferSelect> = {
      status: APPOINTMENT_STATUS.ATTENDED,
      attendedAt: attendedAt,
      updatedAt: new Date()
    };

    // Add notes if provided
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    console.log('🔍 [ATTEND API] Update data:', updateData);
    
    const updateResult = await db
      .update(appointments)
      .set(updateData)
      .where(eq(appointments.google_event_id, eventId));

    console.log('✅ [ATTEND API] Database update completed:', updateResult);
    // The update operation completed successfully if no error was thrown

    // Prepare response data
    const responseData: AttendAppointmentResponse = {
      eventId: eventId,
      appointmentId: appointment.id,
      status: APPOINTMENT_STATUS.ATTENDED,
      attendedAt: attendedAt.toISOString(),
      ...(notes !== undefined && { notes })
    };

    console.log('🔍 [ATTEND API] Preparing success response:', responseData);
    
    const successResponse = createSuccessResponse(
      responseData,
      'Appointment successfully marked as attended'
    );
    
    console.log('✅ [ATTEND API] Sending success response:', successResponse);
    
    return NextResponse.json(
      successResponse,
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    console.error('❌ [ATTEND API] Error in attend appointment handler:', error);
    console.error('❌ [ATTEND API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    const errorResponse = handleDatabaseError(error, 'mark appointment as attended');
    console.error('❌ [ATTEND API] Sending error response:', errorResponse);
    
    return NextResponse.json(
      errorResponse,
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}

// === Export Route Handler ===

/**
 * PATCH endpoint for marking appointments as attended.
 * Requires authentication and appropriate user role.
 */
export const PATCH = withOptimizedAuthentication(async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo
) => {
  console.log(request)
  return handlePatchRequest(request, userInfo);
},{
  requiredRoles: DEFAULT_ATTEND_CONFIG.requiredRoles,
  requireOrganization: true
});