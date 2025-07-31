/**
 * @fileoverview API route for downloading media from Evolution API using authentication
 * @module api/patients/chats/media/base64
 * @author Santiago Prada
 * 
 * This module provides an endpoint for downloading media files (audio, images, etc.) from
 * Evolution API in Base64 format. It uses the user's authentication token to automatically
 * retrieve the instanceId from the organization data in the database.
 * 
 * ## Key Features
 * - **Token-based Authentication**: Uses JWT token to identify user and organization
 * - **Automatic Instance Resolution**: Retrieves instanceId from organization data
 * - **Media Download**: Downloads media files from Evolution API in Base64 format
 * - **Error Handling**: Comprehensive error handling for media download operations
 * - **Environment Configuration**: Uses environment variables for secure API configuration
 * 
 * ## Environment Variables
 * - `EVOLUTION_API_SERVER_URL`: Base URL of the Evolution API server
 * - `EVOLUTION_API_KEY`: API key for authenticating with Evolution API
 * 
 * ## API Flow
 * 1. Authenticate user using Firebase ID token
 * 2. Get organization data from database using user's organizationId
 * 3. Extract instanceId from organization data
 * 4. Download media from Evolution API using messageId
 * 5. Return the media data in Base64 format
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuthentication } from '@/app/lib/firebase/server/middleware/authMiddleware';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from '@/types/api';
import { validateUserRole, handleDatabaseError } from '@/lib/api-helpers';
import { getOrganizationInstance } from '@/lib/organization-utils';

// === Environment Configuration ===
const EVOLUTION_API_SERVER_URL = process.env.EVOLUTION_API_SERVER_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

/**
 * Downloads media from Evolution API in Base64 format for the authenticated user's organization.
 * 
 * This function implements the core business logic for downloading media files
 * with proper authentication and organization isolation.
 * 
 * ## Business Logic
 * - **Authentication Required**: User must provide valid JWT token
 * - **Organization-based**: Uses user's organization to find instanceId
 * - **Media Download**: Downloads media files using Evolution API
 * - **Base64 Format**: Returns media data in Base64 format for frontend consumption
 * 
 * ## Security Considerations
 * - JWT token validation ensures only authenticated users can access
 * - Organization isolation prevents cross-organization access
 * - All Evolution API responses are logged for debugging
 * 
 * ## Error Scenarios
 * - **401**: Missing or invalid authentication token
 * - **403**: User doesn't have required permissions
 * - **404**: Organization, instance, or media not found
 * - **500**: Missing environment configuration or Evolution API errors
 * 
 * @param {NextRequest} request - The incoming request with messageId in body
 * @param {DecodedIdToken} decodedToken - Decoded Firebase authentication token
 * @returns {Promise<NextResponse | Response>} Media download response
 * 
 * @throws {Error} When environment variables are not configured
 * @throws {Error} When Evolution API requests fail
 * 
 * @internal
 */
const getMediaBase64Handler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken
): Promise<NextResponse | Response> => {
  // Validate environment configuration
  if (!EVOLUTION_API_SERVER_URL || !EVOLUTION_API_KEY) {
    console.error('Evolution API configuration missing:', {
      hasServerUrl: !!EVOLUTION_API_SERVER_URL,
      hasApiKey: !!EVOLUTION_API_KEY
    });
    
    return createErrorResponse(
      'Evolution API server configuration is incomplete',
      'Server URL or API Key is not configured in environment variables',
      HTTP_STATUS.INTERNAL_ERROR
    );
  }

  try {
    // Get requesting user from database
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse('User not found', undefined, HTTP_STATUS.FORBIDDEN);
    }

    // Validate user role
    const roleValidationError = validateUserRole(requestingUser.role, ["admin", "medico", "asistente"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    console.log(`Downloading media for user: ${decodedToken.uid}, organization: ${requestingUser.organizationId}`);

    // Get organization instance information
    const orgResult = await getOrganizationInstance(requestingUser.organizationId);
    
    if (!orgResult.success || !orgResult.instanceId) {
      return createErrorResponse(
        'Instance not found',
        orgResult.error || 'No instanceId found for organization',
        HTTP_STATUS.NOT_FOUND
      );
    }

    const instanceId = orgResult.instanceId;
    console.log(`Using instanceId: ${instanceId} for organization: ${requestingUser.organizationId}`);

    // Get messageId from request body
    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return createErrorResponse(
        'Missing required parameter',
        'messageId is required in request body',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Make request to Evolution API getBase64FromMediaMessage endpoint
    const mediaUrl = `${EVOLUTION_API_SERVER_URL}/chat/getBase64FromMediaMessage/${instanceId}`;
    console.log(`Downloading media from: ${mediaUrl}`);
    
    const response = await fetch(mediaUrl, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messageId })
    });

    // Handle Evolution API response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: `HTTP ${response.status}: ${response.statusText}` 
      }));
      
      console.error(`Media download failed (${response.status}):`, errorData);
      
      return createErrorResponse(
        'Failed to download media from Evolution API',
        errorData.message || `HTTP ${response.status}`,
        response.status
      );
    }

    // Parse and return successful response
    const mediaData = await response.json();
    console.log(`Media downloaded successfully for messageId: ${messageId}`);

    return createSuccessResponse(
      mediaData,
      `Media downloaded successfully for messageId: ${messageId}`,
      HTTP_STATUS.OK
    );

  } catch (error) {
    return handleDatabaseError(error, "descargar media de Evolution API");
  }
};

/**
 * POST handler for downloading media from Evolution API.
 * 
 * Uses the standard authentication middleware and delegates to the main handler function.
 * 
 * @param {NextRequest} request - The incoming POST request
 * @param {DecodedIdToken} decodedToken - The authenticated user token
 * @returns {Promise<NextResponse | Response>} The API response
 */
export const POST = withAuthentication(async (request: NextRequest, decodedToken: DecodedIdToken) => {
  return getMediaBase64Handler(request, decodedToken);
});