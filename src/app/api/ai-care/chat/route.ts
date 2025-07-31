/**
 * @fileoverview API endpoint para el chat con AI-Care (administrador)
 * @module api/ai-care/chat
 * @author Santiago Prada
 * 
 * Este módulo proporciona el endpoint POST para enviar mensajes al chat de AI-Care.
 * Por ahora maneja un chat temporal con session_id generado aleatoriamente.
 * 
 * @requires NextRequest from 'next/server'
 * @requires NextResponse from 'next/server'
 * @requires withAuthentication from '@/app/lib/firebase/server/middleware/authMiddleware'
 * @requires DecodedIdToken from 'firebase-admin/auth'
 * @requires createSuccessResponse, createErrorResponse, API_ERRORS, HTTP_STATUS from '@/types/api'
 * @requires validateUserRole, handleDatabaseError from '@/lib/api-helpers'
 * @requires z from 'zod'
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuthentication } from '@/app/lib/firebase/server/middleware/authMiddleware';
import type { DecodedIdToken } from 'firebase-admin/auth';
import {
  createSuccessResponse,
  createErrorResponse,
  API_ERRORS,
  HTTP_STATUS
} from '@/types/api';
import { handleDatabaseError } from '@/lib/api-helpers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// === Configuración de la API externa ===
const AI_CARE_API_URL = 'https://n8n.srv828784.hstgr.cloud/webhook/da33f4ed-2439-47a6-bff4-4714e9582e2c';

// === Schemas de validación ===
const sendMessageSchema = z.object({
  message: z.string().min(1, 'El mensaje no puede estar vacío').max(1000, 'El mensaje no puede exceder 1000 caracteres'),
  sessionId: z.string().optional() // Session ID opcional para continuar conversación existente
});

const getHistorySchema = z.object({
  session_id: z.string().min(1, 'Session ID es requerido')
});

// === Tipos ===
interface SendMessageRequest {
  message: string;
  sessionId?: string;
}

interface AICareApiResponse {
  response: {
    status: number;
    message: string;
  };
}

interface AICareHistoryResponse {
  response: Array<{
    id: number;
    session_id: string;
    message: {
      type: 'human' | 'ai';
      content: string;
      additional_kwargs?: Record<string, unknown>;
      response_metadata?: Record<string, unknown>;
      tool_calls?: Record<string, unknown>[];
      invalid_tool_calls?: Record<string, unknown>[];
    };
  }>;
}

interface SendMessageResponse {
  sessionId: string;
  message: string;
  response: string;
  timestamp: string;
}

interface GetHistoryResponse {
  sessionId: string;
  messages: Array<{
    id: number;
    type: 'human' | 'ai';
    content: string;
    timestamp?: string;
  }>;
}

/**
 * Genera un session_id aleatorio temporal
 * @returns {string} Session ID generado aleatoriamente
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString();
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}_${randomPart}`;
}

/**
 * Manejador para enviar mensajes al chat de AI-Care.
 * 
 * @description
 * Este endpoint permite a los administradores enviar mensajes al chat de AI-Care.
 * Genera un session_id temporal y envía el mensaje a la API externa de n8n.
 * 
 * @param request - Request de Next.js con el mensaje en el body
 * @param decodedToken - Token decodificado de Firebase Auth
 * @returns Promise<NextResponse> - Respuesta del chat de AI-Care
 * 
 * @throws {401} Cuando el usuario no está autenticado
 * @throws {403} Cuando el usuario no tiene rol de administrador
 * @throws {400} Cuando los datos de entrada son inválidos
 * @throws {500} Cuando ocurre un error interno del servidor o en la API externa
 * 
 * @example
 * ```typescript
 * // POST /api/ai-care/chat
 * // Headers: { Authorization: 'Bearer <firebase-token>' }
 * // Body: { "message": "¿Cuáles son los servicios médicos disponibles?" }
 * 
 * // Success response
 * {
 *   "message": "Mensaje enviado exitosamente",
 *   "data": {
 *     "sessionId": "1704067200000_abc123def456",
 *     "message": "¿Cuáles son los servicios médicos disponibles?",
 *     "response": "Los servicios médicos disponibles son...",
 *     "timestamp": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 * ```
 */
async function sendMessageHandler(
  request: NextRequest,
  decodedToken: DecodedIdToken
): Promise<NextResponse> {
  try {
    // Obtener información del usuario autenticado con su organización
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
      with: {
        organization: {
          columns: { apiKey: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.USER_NOT_FOUND,
          'Usuario no encontrado en la base de datos'
        ),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Validar que el usuario sea administrador
    if (user.role !== 'admin') {
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.ADMIN_ONLY,
          'No tienes permisos para acceder al chat de AI-Care'
        ),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // Validar el body de la request
    let body: SendMessageRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.BAD_REQUEST,
          'El cuerpo de la solicitud debe ser un JSON válido'
        ),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Validar los datos con Zod
    const validation = sendMessageSchema.safeParse(body);
    if (!validation.success) {
      const errorMessages = validation.error.errors.map(err => err.message).join(', ');
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.VALIDATION_ERROR,
          `Datos inválidos: ${errorMessages}`
        ),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const { message, sessionId: providedSessionId } = validation.data;

    // Verificar que la organización tenga API key configurada
    const aiCareApiKey = user.organization?.apiKey;
    if (!aiCareApiKey) {
      console.error('[AI_CARE_CHAT] API Key no configurada para la organización');
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.INTERNAL_ERROR,
          'API Key de AI-Care no configurada para su organización'
        ),
        { status: HTTP_STATUS.INTERNAL_ERROR }
      );
    }

    // Usar session_id proporcionado o generar uno nuevo
    const sessionId = providedSessionId || generateSessionId();

    // Preparar el payload para la API externa
    const payload = {
      session_id: sessionId,
      message: message
    };

    console.log(`[AI_CARE_CHAT] Enviando mensaje a AI-Care API:`, {
      sessionId,
      messageLength: message.length,
      userId: decodedToken.uid
    });

    // Enviar mensaje a la API externa de AI-Care
    let aiCareResponse: AICareApiResponse;
    try {
      const response = await fetch(AI_CARE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': aiCareApiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(`[AI_CARE_CHAT] Error en API externa: ${response.status} ${response.statusText}`);
        return NextResponse.json(
          createErrorResponse(
            API_ERRORS.INTERNAL_ERROR,
            'Error al comunicarse con el servicio AI-Care'
          ),
          { status: HTTP_STATUS.INTERNAL_ERROR }
        );
      }

      aiCareResponse = await response.json();
    } catch (error) {
      console.error('[AI_CARE_CHAT] Error al conectar con AI-Care API:', error);
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.INTERNAL_ERROR,
          'Error de conexión con el servicio AI-Care'
        ),
        { status: HTTP_STATUS.INTERNAL_ERROR }
      );
    }

    // Preparar la respuesta
    const responseData: SendMessageResponse = {
      sessionId,
      message,
      response: aiCareResponse.response.message,
      timestamp: new Date().toISOString()
    };

    console.log(`[AI_CARE_CHAT] Mensaje procesado exitosamente:`, {
      sessionId,
      responseLength: aiCareResponse.response.message.length,
      status: aiCareResponse.response.status
    });

    return createSuccessResponse(
      responseData,
      'Mensaje enviado exitosamente'
    );

  } catch (error) {
    console.error('[AI_CARE_CHAT] Error inesperado:', error);
    return handleDatabaseError(error, 'Error al procesar el mensaje de AI-Care');
  }
}

/**
 * Manejador para obtener el historial de conversaciones de AI-Care.
 * 
 * @description
 * Este endpoint permite a los administradores obtener el historial de mensajes
 * de una conversación específica usando el session_id.
 * 
 * @param request - Request de Next.js con session_id en query params
 * @param decodedToken - Token decodificado de Firebase Auth
 * @returns Promise<NextResponse> - Historial de la conversación
 */
async function getHistoryHandler(
  request: NextRequest,
  decodedToken: DecodedIdToken
): Promise<NextResponse> {
  try {
    // Obtener información del usuario autenticado con su organización
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
      with: {
        organization: {
          columns: { apiKey: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.USER_NOT_FOUND,
          'Usuario no encontrado en la base de datos'
        ),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Validar que el usuario sea administrador
    if (user.role !== 'admin') {
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.ADMIN_ONLY,
          'No tienes permisos para acceder al chat de AI-Care'
        ),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // Obtener session_id de query params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.BAD_REQUEST,
          'Session ID es requerido como query parameter'
        ),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Validar session_id con Zod
    const validation = getHistorySchema.safeParse({ session_id: sessionId });
    if (!validation.success) {
      const errorMessages = validation.error.errors.map(err => err.message).join(', ');
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.VALIDATION_ERROR,
          `Datos inválidos: ${errorMessages}`
        ),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Verificar que la organización tenga API key configurada
    const aiCareApiKey = user.organization?.apiKey;
    if (!aiCareApiKey) {
      console.error('[AI_CARE_CHAT] API Key no configurada para la organización');
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.INTERNAL_ERROR,
          'API Key de AI-Care no configurada para su organización'
        ),
        { status: HTTP_STATUS.INTERNAL_ERROR }
      );
    }

    console.log(`[AI_CARE_CHAT] Obteniendo historial para session_id: ${sessionId}`);

    // Obtener historial de la API externa
    let historyResponse: AICareHistoryResponse;
    try {
      const response = await fetch(`${AI_CARE_API_URL}?session_id=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        headers: {
          'X-API-Key': aiCareApiKey
        }
      });

      if (!response.ok) {
        console.error(`[AI_CARE_CHAT] Error en API externa: ${response.status} ${response.statusText}`);
        return NextResponse.json(
          createErrorResponse(
            API_ERRORS.INTERNAL_ERROR,
            'Error al obtener historial del servicio AI-Care'
          ),
          { status: HTTP_STATUS.INTERNAL_ERROR }
        );
      }

      historyResponse = await response.json();
    } catch (error) {
      console.error('[AI_CARE_CHAT] Error al conectar con AI-Care API:', error);
      return NextResponse.json(
        createErrorResponse(
          API_ERRORS.INTERNAL_ERROR,
          'Error de conexión con el servicio AI-Care'
        ),
        { status: HTTP_STATUS.INTERNAL_ERROR }
      );
    }

    // Transformar la respuesta al formato esperado
    const transformedMessages = historyResponse.response.map(item => ({
      id: item.id,
      type: item.message.type,
      content: item.message.content
    }));

    const responseData: GetHistoryResponse = {
      sessionId,
      messages: transformedMessages
    };

    console.log(`[AI_CARE_CHAT] Historial obtenido exitosamente: ${transformedMessages.length} mensajes`);

    return createSuccessResponse(
      responseData,
      'Historial obtenido exitosamente'
    );

  } catch (error) {
    console.error('[AI_CARE_CHAT] Error inesperado al obtener historial:', error);
    return handleDatabaseError(error, 'Error al obtener historial de AI-Care');
  }
}

/**
 * GET endpoint para obtener historial de conversaciones de AI-Care.
 * POST endpoint para enviar mensajes al chat de AI-Care.
 * 
 * Estos endpoints manejan la comunicación con AI-Care con las siguientes características:
 * - **Autenticación**: Validación de token Firebase
 * - **Autorización**: Solo usuarios con rol de administrador
 * - **Validación**: Validación de datos de entrada con Zod
 * - **Integración externa**: Comunicación con API de n8n
 * - **Session management**: Manejo de session_id para conversaciones
 * - **Manejo de errores**: Respuestas de error estandarizadas
 * 
 * @route GET /api/ai-care/chat?session_id=<session_id>
 * @route POST /api/ai-care/chat
 * @access Protected - Requiere autenticación Firebase
 * @roles admin
 */
export const GET = withAuthentication(getHistoryHandler);
export const POST = withAuthentication(sendMessageHandler);