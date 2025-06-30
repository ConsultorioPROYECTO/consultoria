/**
 * @fileoverview API route for generating QR codes by reconnecting Evolution API instances
 * @module api/evolutionAPI/generateQR
 * @author Santiago Prada
 * 
 * This module provides an endpoint for generating new QR codes by disconnecting and
 * reconnecting Evolution API instances. This is useful when a WhatsApp session needs
 * to be reset or when a new QR code is required for authentication.
 * 
 * ## Key Features
 * - **Instance Management**: Safely disconnects and reconnects Evolution API instances
 * - **Error Handling**: Comprehensive error handling for both disconnect and connect operations
 * - **Environment Configuration**: Uses environment variables for secure API configuration
 * - **Response Validation**: Validates responses from Evolution API before proceeding
 * 
 * ## Environment Variables
 * - `EVOLUTION_API_SERVER_URL`: Base URL of the Evolution API server
 * - `EVOLUTION_API_KEY`: API key for authenticating with Evolution API
 * 
 * ## API Flow
 * 1. Validate environment configuration
 * 2. Validate request body (instance ID)
 * 3. Disconnect the specified instance
 * 4. Validate disconnect response
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
 * // Request body
 * {
 *   "instance": "my-whatsapp-instance"
 * }
 * 
 * // Success response
 * {
 *   "success": true,
 *   "data": {
 *     "qrcode": "data:image/png;base64,...",
 *     "code": "2@...",
 *     "base64": "iVBORw0KGgoAAAANSUhEUgAA..."
 *   }
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types/api';

// === Environment Configuration ===
const EVOLUTION_API_SERVER_URL = process.env.EVOLUTION_API_SERVER_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

// === Request/Response Types ===

/**
 * Request body for generating QR code.
 * 
 * @interface GenerateQRRequest
 * @property {string} instance - The Evolution API instance identifier
 */
interface GenerateQRRequest {
  /** Evolution API instance identifier */
  instance: string;
}

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
 * Generates a new QR code by reconnecting an Evolution API instance.
 * 
 * This endpoint performs a two-step process:
 * 1. **Disconnect**: Logs out the specified instance to clear existing session
 * 2. **Reconnect**: Connects the instance again to generate a fresh QR code
 * 
 * ## Business Logic
 * - **Session Reset**: Disconnecting ensures any existing WhatsApp session is cleared
 * - **Fresh Authentication**: Reconnecting generates a new QR code for device pairing
 * - **Error Recovery**: If disconnect fails, the process continues to attempt reconnection
 * - **Response Forwarding**: Returns the complete Evolution API response
 * 
 * ## Security Considerations
 * - API key is required and validated through environment variables
 * - Instance ID is validated to prevent empty or malformed requests
 * - All Evolution API responses are logged for debugging
 * 
 * ## Error Scenarios
 * - **500**: Missing environment configuration
 * - **400**: Missing or invalid instance ID
 * - **Evolution API errors**: Forwarded with original status codes
 * - **Network errors**: Handled as 500 internal server error
 * 
 * @param {NextRequest} request - The incoming request with instance ID
 * @returns {Promise<NextResponse<ApiResponse<EvolutionConnectResponse>>>} QR code generation response
 * 
 * @throws {Error} When environment variables are not configured
 * @throws {Error} When Evolution API requests fail
 * 
 * @example
 * ```typescript
 * // Basic QR generation
 * const response = await fetch('/api/evolutionAPI/generateQR', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ instance: 'my-instance' })
 * });
 * 
 * const result = await response.json();
 * if (result.success) {
 *   console.log('QR Code:', result.data.qrcode);
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Error handling
 * try {
 *   const response = await fetch('/api/evolutionAPI/generateQR', {
 *     method: 'POST',
 *     body: JSON.stringify({ instance: 'test-instance' })
 *   });
 *   
 *   if (!response.ok) {
 *     const error = await response.json();
 *     console.error('QR generation failed:', error.error);
 *   }
 * } catch (error) {
 *   console.error('Network error:', error);
 * }
 * ```
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<EvolutionConnectResponse>>> {
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
    // Parse and validate request body
    const body: GenerateQRRequest = await request.json();
    const { instance } = body;

    if (!instance || typeof instance !== 'string' || instance.trim() === '') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid instance ID',
          details: 'Instance ID is required and must be a non-empty string'
        },
        { status: 400 }
      );
    }

    const trimmedInstance = instance.trim();
    console.log(`Starting QR generation for instance: ${trimmedInstance}`);

    // Step 1: Disconnect the instance to clear existing session
    const logoutUrl = `${EVOLUTION_API_SERVER_URL}/instance/logout/${trimmedInstance}`;
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
      console.log(`Instance ${trimmedInstance} disconnected successfully`);
    }

    // Step 2: Connect the instance to generate new QR code
    const connectUrl = `${EVOLUTION_API_SERVER_URL}/instance/connect/${trimmedInstance}`;
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
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to connect Evolution API instance',
          details: errorData.message || `HTTP ${connectResponse.status}` 
        },
        { status: connectResponse.status }
      );
    }

    // Parse and return successful connection response
    const connectData: EvolutionConnectResponse = await connectResponse.json();
    console.log(`Instance ${trimmedInstance} connected successfully:`, {
      hasQrCode: !!connectData.qrcode,
      hasBase64: !!connectData.base64,
      status: connectData.status
    });

    return NextResponse.json(
      {
        success: true,
        data: connectData,
        message: `QR code generated successfully for instance: ${trimmedInstance}`
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in generateQR API:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error during QR generation',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}