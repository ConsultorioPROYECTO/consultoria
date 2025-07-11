/**
 * @fileoverview API route for generating QR codes by reconnecting Evolution API instances using authentication
 * @module api/evolutionAPI/generateQR
 * @author Santiago Prada
 * 
 * This module provides an endpoint for generating new QR codes by disconnecting and
 * reconnecting Evolution API instances. It uses the user's authentication token to automatically
 * retrieve the instanceId from the organization data in the database.
 * 
 * ## Key Features
 * - **Token-based Authentication**: Uses JWT token to identify user and organization
 * - **Automatic Instance Resolution**: Retrieves instanceId from organization data
 * - **Instance Management**: Safely disconnects and reconnects Evolution API instances
 * - **Error Handling**: Comprehensive error handling for both disconnect and connect operations
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
 * 5. Reconnect the instance to generate new QR
 * 6. Return the connection response with QR data
 * 
 * @requires NextRequest from 'next/server'
 * @requires NextResponse from 'next/server'
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://doc.evolution-api.com/ | Evolution API Documentation}
 * 
 * @example
 * ```typescript
 * // Generate QR with authentication
 * const response = await fetch('/api/evolutionAPI/generateQR', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer token'
 *   }
 * });
 * const result = await response.json();
 * 
 * if (result.success) {
 *   console.log('QR Code:', result.data.qrcode);
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
 * Evolution API connection response containing QR code data.
 * 
 * @interface EvolutionConnectResponse
 * @property {string} [qrcode] - QR code as data URL
 * @property {string} [code] - Raw QR code string
 * @property {string} [base64] - QR code as base64 image
 * @property {string} [status] - Connection status
 */
interface EvolutionConnectResponse {
  qrcode?: string;
  code?: string;
  base64?: string;
  status?: string;
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
 * Generates a new QR code by reconnecting the authenticated user's Evolution API instance.
 * 
 * This function implements the core business logic for generating QR codes
 * with proper authentication and organization isolation.
 * 
 * ## Business Logic
 * - **Authentication Required**: User must provide valid JWT token
 * - **Organization-based**: Uses user's organization to find instanceId
 * - **Session Reset**: Disconnecting ensures any existing WhatsApp session is cleared
 * - **Fresh Authentication**: Reconnecting generates a new QR code for device pairing
 * - **Error Recovery**: If disconnect fails, the process continues to attempt reconnection
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
 * @returns {Promise<NextResponse | Response>} QR code generation response
 * 
 * @throws {Error} When environment variables are not configured
 * @throws {Error} When Evolution API requests fail
 * 
 * @internal
 */
const generateQRHandler = async (
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

    console.log(`Starting QR generation for user: ${decodedToken.uid}, organization: ${requestingUser.organizationId}`);

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

    // Step 1: Disconnect the instance to clear existing session
    const logoutUrl = `${EVOLUTION_API_SERVER_URL}/instance/logout/${instanceId}`;
    console.log(`Attempting to disconnect instance at: ${logoutUrl}`);
    
    const logoutResponse = await fetch(logoutUrl, {
      method: 'DELETE',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
    });

    // Log disconnect result (but don't fail if disconnect fails)
    if (!logoutResponse.ok) {
      const errorData = await logoutResponse.json().catch(() => ({ message: 'Unknown error' }));
      console.warn(`Instance disconnect failed (${logoutResponse.status}):`, errorData);
      console.log('Proceeding with reconnection despite disconnect failure...');
    } else {
      console.log(`Instance ${instanceId} disconnected successfully`);
    }

    // Step 2: Connect the instance to generate new QR code
    const connectUrl = `${EVOLUTION_API_SERVER_URL}/instance/connect/${instanceId}`;
    console.log(`Attempting to connect instance at: ${connectUrl}`);
    
    const connectResponse = await fetch(connectUrl, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
    });

    // Handle connect response
    if (!connectResponse.ok) {
      const errorData = await connectResponse.json().catch(() => ({ 
        message: `HTTP ${connectResponse.status}: ${connectResponse.statusText}` 
      }));
      
      console.error(`Instance connection failed (${connectResponse.status}):`, errorData);
      
      return createErrorResponse(
        'Failed to connect Evolution API instance',
        errorData.message || `HTTP ${connectResponse.status}`,
        connectResponse.status
      );
    }

    // Parse and return successful connection response
    const connectData: EvolutionConnectResponse = await connectResponse.json();
    console.log(`Instance ${instanceId} connected successfully:`, {
      hasQrCode: !!connectData.qrcode,
      hasBase64: !!connectData.base64,
      status: connectData.status
    });

    return createSuccessResponse(
      connectData,
      `QR code generated successfully for instance: ${instanceId}`,
      HTTP_STATUS.OK
    );

  } catch (error) {
    return handleDatabaseError(error, "generar código QR de Evolution API");
  }
};

/**
 * Handles POST requests to generate QR codes for Evolution API instances.
 * 
 * Authenticates the request and delegates to the appropriate handler function.
 * Uses Firebase authentication to identify the user and automatically
 * determines the Evolution API instance based on organization membership.
 * 
 * @param request - The incoming Next.js POST request
 * @returns Promise resolving to HTTP response with QR code data or error
 * 
 * @throws {Error} When authentication fails or handler execution encounters errors
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link generateQRHandler} for detailed implementation documentation
 * 
 * @example
 * ```typescript
 * // Generate QR code with authentication
 * const response = await fetch('/api/evolutionAPI/generateQR', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 *   }
 * });
 * const result = await response.json();
 * 
 * if (result.success && result.data.qrcode) {
 *   console.log('QR Code generated:', result.data.qrcode);
 * } else {
 *   console.log('QR generation failed');
 * }
 * ```
 * 
 * @public
 */
export async function POST(request: NextRequest) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return generateQRHandler(request, decodedToken);
}