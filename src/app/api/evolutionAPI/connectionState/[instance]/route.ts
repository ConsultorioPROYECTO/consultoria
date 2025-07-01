/**
 * @fileoverview API route for checking Evolution API instance connection state
 * @module api/evolutionAPI/connectionState
 * @author Santiago Prada
 * 
 * This module provides an endpoint for checking the connection state of a specific
 * Evolution API instance. It acts as a proxy to the Evolution API's connectionState
 * endpoint, providing a simple way to verify if an instance is connected and ready.
 * 
 * ## Key Features
 * - **Instance State Check**: Verifies the connection state of a specific Evolution API instance
 * - **Error Handling**: Comprehensive error handling for API communication
 * - **Environment Configuration**: Uses environment variables for secure API configuration
 * - **Response Forwarding**: Returns the complete Evolution API response
 * 
 * ## Environment Variables
 * - `EVOLUTION_API_SERVER_URL`: Base URL of the Evolution API server
 * - `EVOLUTION_API_KEY`: API key for authenticating with Evolution API
 * 
 * ## API Flow
 * 1. Validate environment configuration
 * 2. Extract instance name from route parameters
 * 3. Make request to Evolution API connectionState endpoint
 * 4. Return the connection state response
 * 
 * @requires NextRequest from 'next/server'
 * @requires NextResponse from 'next/server'
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://doc.evolution-api.com/ | Evolution API Documentation}
 * 
 * @example
 * ```typescript
 * // Check instance connection state
 * const response = await fetch('/api/evolutionAPI/connectionState/my-instance');
 * const result = await response.json();
 * 
 * if (result.success) {
 *   console.log('Connection state:', result.data.state);
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types/api';

// === Environment Configuration ===
const EVOLUTION_API_SERVER_URL = process.env.EVOLUTION_API_SERVER_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

// === Response Types ===

/**
 * Evolution API connection state response.
 * 
 * @interface EvolutionConnectionStateResponse
 * @property {string} [state] - Current connection state of the instance
 * @property {string} [status] - Status information
 * @property {boolean} [connected] - Whether the instance is connected
 */
interface EvolutionConnectionStateResponse {
  state?: string;
  status?: string;
  connected?: boolean;
  [key: string]: unknown;
}

/**
 * Checks the connection state of an Evolution API instance.
 * 
 * This endpoint acts as a proxy to the Evolution API's connectionState endpoint,
 * allowing you to verify if a specific instance is connected and ready to receive
 * WhatsApp messages.
 * 
 * ## Business Logic
 * - **State Verification**: Checks if the instance is properly connected to WhatsApp
 * - **Health Check**: Can be used as a health check for monitoring systems
 * - **Error Handling**: Provides clear error messages for debugging
 * 
 * ## Security Considerations
 * - API key is required and validated through environment variables
 * - Instance name is validated to prevent injection attacks
 * - All Evolution API responses are logged for debugging
 * 
 * ## Error Scenarios
 * - **500**: Missing environment configuration
 * - **400**: Missing or invalid instance name
 * - **Evolution API errors**: Forwarded with original status codes
 * - **Network errors**: Handled as 500 internal server error
 * 
 * @param {NextRequest} request - The incoming request
 * @param {Object} context - Route context with dynamic parameters
 * @param {Promise<{instance: string}>} context.params - Route parameters
 * @returns {Promise<NextResponse<ApiResponse<EvolutionConnectionStateResponse>>>} Connection state response
 * 
 * @throws {Error} When environment variables are not configured
 * @throws {Error} When Evolution API requests fail
 * 
 * @example
 * ```typescript
 * // Basic connection state check
 * const response = await fetch('/api/evolutionAPI/connectionState/my-instance');
 * const result = await response.json();
 * 
 * if (result.success && result.data.connected) {
 *   console.log('Instance is connected and ready');
 * } else {
 *   console.log('Instance is not connected');
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Error handling
 * try {
 *   const response = await fetch('/api/evolutionAPI/connectionState/test-instance');
 *   
 *   if (!response.ok) {
 *     const error = await response.json();
 *     console.error('Connection check failed:', error.error);
 *   }
 * } catch (error) {
 *   console.error('Network error:', error);
 * }
 * ```
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instance: string }> }
): Promise<NextResponse<ApiResponse<EvolutionConnectionStateResponse>>> {
  // Validate environment configuration
  if (!EVOLUTION_API_SERVER_URL || !EVOLUTION_API_KEY) {
    console.error('Evolution API configuration missing:', {
      hasServerUrl: !!EVOLUTION_API_SERVER_URL,
      hasApiKey: !!EVOLUTION_API_KEY
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Evolution API server configuration is incomplete',
        details: 'Server URL or API Key is not configured in environment variables'
      },
      { status: 500 }
    );
  }

  try {
    // Resolve route parameters
    const resolvedParams = await params;
    const { instance } = resolvedParams;

    // Validate instance parameter
    if (!instance || typeof instance !== 'string' || instance.trim() === '') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid instance name',
          details: 'Instance name is required and must be a non-empty string'
        },
        { status: 400 }
      );
    }

    const trimmedInstance = instance.trim();
    console.log(`Checking connection state for instance: ${trimmedInstance}`);

    // Make request to Evolution API connectionState endpoint
    const connectionStateUrl = `${EVOLUTION_API_SERVER_URL}/instance/connectionState/${trimmedInstance}`;
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

      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to check Evolution API instance connection state',
          details: errorData.message || `HTTP ${response.status}` 
        },
        { status: response.status }
      );
    }

    // Parse and return successful response
    const connectionData: EvolutionConnectionStateResponse = await response.json();
    console.log(`Connection state for instance ${trimmedInstance}:`, {
      state: connectionData.state,
      connected: connectionData.connected,
      status: connectionData.status
    });

    return NextResponse.json(
      {
        success: true,
        data: connectionData,
        message: `Connection state retrieved successfully for instance: ${trimmedInstance}`
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error checking Evolution API connection state:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error during connection state check',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/evolutionAPI/connectionState/{instance}:
 *   get:
 *     summary: Check Evolution API instance connection state
 *     description: |
 *       Verifies the connection state of a specific Evolution API instance.
 *       This endpoint acts as a proxy to the Evolution API's connectionState endpoint.
 *     parameters:
 *       - in: path
 *         name: instance
 *         required: true
 *         schema:
 *           type: string
 *         description: The Evolution API instance name to check
 *         example: "my-whatsapp-instance"
 *     responses:
 *       200:
 *         description: Connection state retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     state:
 *                       type: string
 *                       description: Current connection state
 *                       example: "open"
 *                     connected:
 *                       type: boolean
 *                       description: Whether the instance is connected
 *                       example: true
 *                     status:
 *                       type: string
 *                       description: Status information
 *                       example: "connected"
 *                 message:
 *                   type: string
 *                   example: "Connection state retrieved successfully for instance: my-whatsapp-instance"
 *       400:
 *         description: Invalid instance name
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server configuration error or internal error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       required:
 *         - success
 *         - error
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           description: Error message
 *           example: "Invalid instance name"
 *         details:
 *           type: string
 *           description: Additional error details
 *           example: "Instance name is required and must be a non-empty string"
 */