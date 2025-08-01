/**
 * @fileoverview API route for disconnecting Evolution API instances using authentication
 * @module api/evolutionAPI/disconnect
 * @author Santiago Prada
 * 
 * This module provides an endpoint for disconnecting Evolution API instances.
 * It uses the user's authentication token to automatically retrieve the instanceId
 * from the organization data in the database.
 * 
 * ## Key Features
 * - **Token-based Authentication**: Uses JWT token to identify user and organization
 * - **Automatic Instance Resolution**: Retrieves instanceId from organization data
 * - **Instance Management**: Safely disconnects Evolution API instances
 * - **Error Handling**: Comprehensive error handling for disconnect operations
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
 * 4. Disconnect the specified instance
 * 5. Return the disconnect response
 * 
 * @requires NextRequest from 'next/server'
 * @requires NextResponse from 'next/server'
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://doc.evolution-api.com/ | Evolution API Documentation}
 * 
 * @example
 * ```typescript
 * // Disconnect instance with authentication
 * const response = await fetch('/api/evolutionAPI/disconnect', {
 *   method: 'DELETE',
 *   headers: {
 *     'Authorization': 'Bearer token'
 *   }
 * });
 * const result = await response.json();
 * 
 * if (result.success) {
 *   console.log('Instance disconnected:', result.data);
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';

import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from "@/types/api";
import { handleDatabaseError } from "@/lib/api-helpers";
import { getOrganizationInstance } from '@/lib/organization-utils';
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';

// === Environment Configuration ===
const EVOLUTION_API_SERVER_URL = process.env.EVOLUTION_API_SERVER_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

// === Response Types ===

/**
 * Evolution API disconnect response.
 * 
 * @interface EvolutionDisconnectResponse
 * @property {string} [message] - Disconnect status message
 * @property {string} [status] - Disconnect status
 * @property {Object} [instance] - Instance information
 */
interface EvolutionDisconnectResponse {
  message?: string;
  status?: string;
  instance?: {
    instanceName: string;
    state: string;
  };
  [key: string]: unknown;
}

// Autenticación ahora manejada por withOptimizedAuthentication

/**
 * Disconnects the authenticated user's Evolution API instance.
 * 
 * This function implements the core business logic for disconnecting Evolution API
 * instances with proper authentication and organization isolation.
 * 
 * ## Business Logic
 * - **Authentication Required**: User must provide valid JWT token
 * - **Organization-based**: Uses user's organization to find instanceId
 * - **Session Termination**: Safely disconnects the WhatsApp session
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
 * @returns {Promise<NextResponse | Response>} Disconnect response
 * 
 * @throws {Error} When environment variables are not configured
 * @throws {Error} When Evolution API requests fail
 * 
 * @internal
 */
const disconnectInstanceHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo
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
    // El middleware optimizado ya valida autenticación, rol y organización
    const { user: requestingUser } = userInfo;

    console.log(`Disconnecting instance for user: ${requestingUser.firebaseUid}, organization: ${requestingUser.organizationId}`);

    // Get organization instance information
    const orgResult = await getOrganizationInstance(requestingUser.organizationId!);
    
    if (!orgResult.success || !orgResult.instanceId) {
      return createErrorResponse(
        'Instance not found',
        orgResult.error || 'No instanceId found for organization',
        HTTP_STATUS.NOT_FOUND
      );
    }

    const instanceId = orgResult.instanceId;
    console.log(`Using instanceId: ${instanceId} for organization: ${requestingUser.organizationId}`);

    // Make request to Evolution API logout endpoint
    const logoutUrl = `${EVOLUTION_API_SERVER_URL}/instance/logout/${instanceId}`;
    console.log(`Disconnecting instance at: ${logoutUrl}`);
    
    const response = await fetch(logoutUrl, {
      method: 'DELETE',
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
      
      console.error(`Instance disconnect failed (${response.status}):`, errorData);
      
      return createErrorResponse(
        'Failed to disconnect Evolution API instance',
        errorData.message || `HTTP ${response.status}`,
        response.status
      );
    }

    // Parse and return successful response
    const disconnectData: EvolutionDisconnectResponse = await response.json();
    console.log(`Instance ${instanceId} disconnected successfully:`, {
      message: disconnectData.message,
      status: disconnectData.status
    });

    return createSuccessResponse(
      disconnectData,
      `Instance disconnected successfully: ${instanceId}`,
      HTTP_STATUS.OK
    );

  } catch (error) {
    return handleDatabaseError(error, "desconectar instancia de Evolution API");
  }
};

export const DELETE = withOptimizedAuthentication(disconnectInstanceHandler, {
  requiredRoles: ['admin'],
  requireOrganization: true
});