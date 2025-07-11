/**
 * @fileoverview API route for checking Evolution API instance connection state using authentication
 * @module api/evolutionAPI/connectionState
 * @author Santiago Prada
 * 
 * This module provides an endpoint for checking the connection state of the authenticated
 * user's Evolution API instance. It uses the user's authentication token to automatically
 * retrieve the instanceId from the organization data in the database.
 * 
 * ## Key Features
 * - **Token-based Authentication**: Uses JWT token to identify user and organization
 * - **Automatic Instance Resolution**: Retrieves instanceId from organization data
 * - **Error Handling**: Comprehensive error handling for API communication
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
 * 4. Make request to Evolution API connectionState endpoint
 * 5. Return the connection state response
 * 
 * @requires NextRequest from 'next/server'
 * @requires NextResponse from 'next/server'
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://doc.evolution-api.com/ | Evolution API Documentation}
 * 
 * @example
 * ```typescript
 * // Check instance connection state with authentication
 * const response = await fetch('/api/evolutionAPI/connectionState', {
 *   headers: {
 *     'Authorization': 'Bearer token'
 *   }
 * });
 * const result = await response.json();
 * 
 * if (result.success) {
 *   console.log('Instance name:', result.data.instance.instanceName);
 *   console.log('Connection state:', result.data.instance.state);
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';

import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/app/lib/firebase/server/adminConfig";
import type { DecodedIdToken } from "firebase-admin/auth";
import { eq } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from "@/types/api";
import { validateUserRole, handleDatabaseError } from "@/lib/api-helpers";
import { getOrganizationInstance } from '@/lib/organization-utils';

// === Environment Configuration ===
const EVOLUTION_API_SERVER_URL = process.env.EVOLUTION_API_SERVER_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

// === Response Types ===

/**
 * Evolution API connection state response.
 * 
 * @interface EvolutionConnectionStateResponse
 * @property {Object} instance - Instance information object
 * @property {string} instance.instanceName - Name of the instance
 * @property {string} instance.state - Current connection state of the instance (e.g., 'open', 'close')
 */
interface EvolutionConnectionStateResponse {
  instance: {
    instanceName: string;
    state: string;
  };
  [key: string]: unknown;
}

/**
 * Authenticates incoming requests by verifying Firebase ID tokens.
 * 
 * Extracts the Bearer token from the Authorization header and validates it
 * using Firebase Admin SDK. Returns the decoded token if valid, null otherwise.
 * 
 * @param request - The incoming Next.js request object
 * @returns Promise resolving to decoded token on success, null on failure
 * 
 * @throws {Error} When token verification fails due to network or Firebase errors
 * 
 * @see {@link https://firebase.google.com/docs/auth/admin/verify-id-tokens | Firebase ID Token Verification}
 * 
 * @internal
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
 * Checks the connection state of the authenticated user's Evolution API instance.
 * 
 * This function implements the core business logic for checking Evolution API
 * connection state with proper authentication and organization isolation.
 * 
 * ## Business Logic
 * - **Authentication Required**: User must provide valid JWT token
 * - **Organization-based**: Uses user's organization to find instanceId
 * - **State Verification**: Checks if the instance is properly connected to WhatsApp
 * - **Error Handling**: Provides clear error messages for debugging
 * 
 * ## Security Considerations
 * - JWT token validation ensures only authenticated users can access
 * - Organization isolation prevents cross-organization access
 * - All Evolution API responses are logged for debugging
 * 
 * ## Error Scenarios
 * - **401**: Missing or invalid authentication token
 * - **403**: User doesn't have required permissions
 * - **404**: Organization or instance not found
 * - **500**: Missing environment configuration or Evolution API errors
 * 
 * @param {NextRequest} request - The incoming request with Authorization header
 * @param {DecodedIdToken} decodedToken - Decoded Firebase authentication token
 * @returns {Promise<NextResponse | Response>} Connection state response
 * 
 * @throws {Error} When environment variables are not configured
 * @throws {Error} When Evolution API requests fail
 * 
 * @internal
 */
const getConnectionStateHandler = async (
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

    console.log(`Checking connection state for user: ${decodedToken.uid}, organization: ${requestingUser.organizationId}`);

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

    // Make request to Evolution API connectionState endpoint
    const connectionStateUrl = `${EVOLUTION_API_SERVER_URL}/instance/connectionState/${instanceId}`;
    console.log(`Requesting connection state from: ${connectionStateUrl}`);
    
    const response = await fetch(connectionStateUrl, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
    });

    // Handle Evolution API response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: `HTTP ${response.status}: ${response.statusText}` 
      }));
      
      console.error(`Connection state check failed (${response.status}):`, errorData);

      return createErrorResponse(
        'Failed to check Evolution API instance connection state',
        errorData.message || `HTTP ${response.status}`,
        response.status
      );
    }

    // Parse and return successful response
    const connectionData: EvolutionConnectionStateResponse = await response.json();
    console.log(`Connection state for instance ${instanceId}:`, {
      instanceName: connectionData.instance?.instanceName,
      state: connectionData.instance?.state
    });

    return createSuccessResponse(
      connectionData,
      `Connection state retrieved successfully for instance: ${instanceId}`,
      HTTP_STATUS.OK
    );

  } catch (error) {
    return handleDatabaseError(error, "verificar estado de conexión de Evolution API");
  }
};

/**
 * Handles GET requests to check Evolution API connection state.
 * 
 * Authenticates the request and delegates to the appropriate handler function.
 * Uses Firebase authentication to identify the user and automatically
 * determines the Evolution API instance based on organization membership.
 * 
 * @param request - The incoming Next.js GET request
 * @returns Promise resolving to HTTP response with connection state data or error
 * 
 * @throws {Error} When authentication fails or handler execution encounters errors
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link getConnectionStateHandler} for detailed implementation documentation
 * 
 * @example
 * ```typescript
 * // Basic connection state check with authentication
 * const response = await fetch('/api/evolutionAPI/connectionState', {
 *   headers: {
 *     'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 *   }
 * });
 * const result = await response.json();
 * 
 * if (result.success && result.data.instance.state === 'open') {
 *   console.log('Instance is connected and ready');
 * } else {
 *   console.log('Instance is not connected');
 * }
 * ```
 * 
 * @public
 */
export async function GET(request: NextRequest) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return getConnectionStateHandler(request, decodedToken);
}