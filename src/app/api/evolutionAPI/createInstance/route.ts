/**
 * @fileoverview API route for creating Evolution API instances using authentication
 * @module api/evolutionAPI/createInstance
 * @author Santiago Prada
 * 
 * This module provides an endpoint for creating new Evolution API instances with
 * proper authentication and organization-based configuration. It uses the user's
 * authentication token to automatically retrieve the instanceId and apiKey from
 * the organization data in the database.
 * 
 * ## Key Features
 * - **Token-based Authentication**: Uses JWT token to identify user and organization
 * - **Automatic Configuration**: Retrieves instanceId and apiKey from organization data
 * - **Webhook Integration**: Configures webhook for message events
 * - **Error Handling**: Comprehensive error handling for instance creation
 * - **Environment Configuration**: Uses environment variables for secure API configuration
 * 
 * ## Environment Variables
 * - `EVOLUTION_API_SERVER_URL`: Base URL of the Evolution API server
 * - `EVOLUTION_API_KEY`: API key for authenticating with Evolution API
 * 
 * ## API Flow
 * 1. Authenticate user using Firebase ID token
 * 2. Get organization data from database using user's organizationId
 * 3. Extract instanceId and apiKey from organization data
 * 4. Create Evolution API instance with webhook configuration
 * 5. Return the creation response
 * 
 * @requires NextRequest from 'next/server'
 * @requires NextResponse from 'next/server'
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://doc.evolution-api.com/ | Evolution API Documentation}
 * 
 * @example
 * ```typescript
 * // Create instance with authentication
 * const response = await fetch('/api/evolutionAPI/createInstance', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer token'
 *   }
 * });
 * const result = await response.json();
 * 
 * if (result.success) {
 *   console.log('Instance created:', result.data);
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
 * Evolution API instance creation response.
 * 
 * @interface EvolutionCreateInstanceResponse
 * @property {string} [instanceName] - Name of the created instance
 * @property {string} [status] - Creation status
 * @property {Object} [instance] - Instance details
 */
interface EvolutionCreateInstanceResponse {
  instanceName?: string;
  status?: string;
  instance?: {
    instanceName: string;
    state: string;
  };
  [key: string]: unknown;
}



/**
 * Creates a new Evolution API instance for the authenticated user's organization.
 * 
 * This function implements the core business logic for creating Evolution API
 * instances with proper authentication and organization isolation.
 * 
 * ## Business Logic
 * - **Authentication Required**: User must provide valid JWT token
 * - **Organization-based**: Uses user's organization to find instanceId and apiKey
 * - **Webhook Configuration**: Sets up webhook for message events
 * - **WhatsApp Integration**: Configures WHATSAPP-BAILEYS integration
 * - **Event Filtering**: Only listens to MESSAGES_UPSERT events
 * 
 * ## Security Considerations
 * - JWT token validation ensures only authenticated users can access
 * - Organization isolation prevents cross-organization access
 * - All Evolution API responses are logged for debugging
 * 
 * ## Error Scenarios
 * - **401**: Missing or invalid authentication token
 * - **403**: User doesn't have required permissions
 * - **404**: Organization or instance configuration not found
 * - **500**: Missing environment configuration or Evolution API errors
 * 
 * @param {NextRequest} request - The incoming request with Authorization header
 * @param {DecodedIdToken} decodedToken - Decoded Firebase authentication token
 * @returns {Promise<NextResponse | Response>} Instance creation response
 * 
 * @throws {Error} When environment variables are not configured
 * @throws {Error} When Evolution API requests fail
 * 
 * @internal
 */
const createInstanceHandler = async (
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
    
    if (!requestingUser.organizationId) {
      return createErrorResponse('User not found', 'User does not belong to any organization', HTTP_STATUS.FORBIDDEN);
    }
    
    console.log(`Creating instance for user: ${requestingUser.firebaseUid}, organization: ${requestingUser.organizationId}`);

    // Get organization instance information
    const orgResult = await getOrganizationInstance(requestingUser.organizationId);
    
    if (!orgResult.success || !orgResult.instanceId || !orgResult.apiKey) {
      return createErrorResponse(
        'Organization configuration incomplete',
        orgResult.error || 'No instanceId or apiKey found for organization',
        HTTP_STATUS.NOT_FOUND
      );
    }

    const { instanceId, apiKey } = orgResult;
    console.log(`Using instanceId: ${instanceId} for organization: ${requestingUser.organizationId}`);

    // Prepare instance creation payload
    const instancePayload = {
      instanceName: instanceId,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      groupsIgnore: true,
      syncFullHistory: false,
      webhook: {
        url: "http://n8n:5678/webhook/75372571-9d48-47fb-8e3b-a982ce2e798e",
        byEvents: false,
        base64: true,
        headers: {
          autorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        events: [
          "MESSAGES_UPSERT"
        ]
      }
    };

    // Make request to Evolution API instance creation endpoint
    const createInstanceUrl = `${EVOLUTION_API_SERVER_URL}/instance/create`;
    console.log(`Creating instance at: ${createInstanceUrl}`);
    
    const response = await fetch(createInstanceUrl, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(instancePayload)
    });

    // Handle Evolution API response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: `HTTP ${response.status}: ${response.statusText}` 
      }));
      
      console.error(`Instance creation failed (${response.status}):`, errorData);

      return createErrorResponse(
        'Failed to create Evolution API instance',
        errorData.message || `HTTP ${response.status}`,
        response.status
      );
    }

    // Parse and return successful response
    const instanceData: EvolutionCreateInstanceResponse = await response.json();

    console.log(`Instance ${instanceId} created successfully:`, {
      instanceName: instanceData.instanceName,
      status: instanceData.status
    });

    return createSuccessResponse(
      instanceData,
      `Evolution API instance created successfully: ${instanceId}`,
      HTTP_STATUS.CREATED
    );

  } catch (error) {
    return handleDatabaseError(error, "crear instancia de Evolution API");
  }
};

/**
 * POST handler for creating Evolution API instances.
 * 
 * Uses the standard authentication middleware and delegates to the main handler function.
 * 
 * @param {NextRequest} request - The incoming POST request
 * @param {DecodedIdToken} decodedToken - The authenticated user token
 * @returns {Promise<NextResponse | Response>} The API response
 */
export const POST = withOptimizedAuthentication(createInstanceHandler, {
  requiredRoles: ['admin', 'medico', 'asistente'],
  requireOrganization: true
});