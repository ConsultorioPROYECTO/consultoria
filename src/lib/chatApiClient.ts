/**
 * Cliente API para manejar las operaciones de chat con WhatsApp
 * Incluye autenticación automática con Firebase y manejo de errores
 */

import { getAuth } from 'firebase/auth';
import type { TransformedChat, TransformedMessage } from '@/types/evolution-api';

// Tipos para las respuestas de la API (re-exportados desde evolution-api)
export type Chat = TransformedChat;
export type Message = TransformedMessage;

export interface SendMessageRequest {
  chatId: string;
  message: string;
}

class ChatApiClient {
  private baseUrl = '/api/patients/chats';

  /**
   * Obtiene el token de autenticación de Firebase
   */
  private async getAuthToken(): Promise<string> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    return await user.getIdToken();
  }

  /**
   * Realiza una petición HTTP con autenticación automática
   */
  private async authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    console.log('[CHAT_API_CLIENT] Realizando petición autenticada:', { url, method: options.method || 'GET' });
    
    try {
      const token = await this.getAuthToken();
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log('[CHAT_API_CLIENT] Respuesta recibida:', {
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Error de red'
        }));
        console.error('[CHAT_API_CLIENT] Error en respuesta:', {
          url,
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error('[CHAT_API_CLIENT] Error en petición autenticada:', { url, error });
      throw error;
    }
  }

  /**
   * Obtiene la lista de chats
   */
  async getChats(): Promise<Chat[]> {
    console.log('[CHAT_API_CLIENT] Obteniendo lista de chats...');
    try {
      const response = await this.authenticatedFetch(this.baseUrl);
      const data = await response.json();
      console.log('[CHAT_API_CLIENT] Chats obtenidos exitosamente:', {
        count: Array.isArray(data) ? data.length : 'N/A',
        sample: Array.isArray(data) ? data.slice(0, 2) : data
      });
      return data;
    } catch (error) {
      console.error('[CHAT_API_CLIENT] Error al obtener chats:', error);
      throw error;
    }
  }

  /**
   * Obtiene los mensajes de un chat específico
   */
  async getMessages(chatId: string): Promise<Message[]> {
    console.log('[CHAT_API_CLIENT] Obteniendo mensajes para chat:', { chatId });
    try {
      const url = `${this.baseUrl}/messages?chatId=${encodeURIComponent(chatId)}`;
      const response = await this.authenticatedFetch(url);
      const data = await response.json();
      console.log('[CHAT_API_CLIENT] Mensajes obtenidos exitosamente:', {
        chatId,
        count: Array.isArray(data) ? data.length : 'N/A',
        sample: Array.isArray(data) ? data.slice(0, 2) : data
      });
      return data;
    } catch (error) {
      console.error('[CHAT_API_CLIENT] Error al obtener mensajes:', { chatId, error });
      throw error;
    }
  }

  /**
   * Envía un mensaje a un chat específico
   */
  async sendMessage(request: SendMessageRequest): Promise<Message> {
    console.log('[CHAT_API_CLIENT] Enviando mensaje:', { chatId: request.chatId, content: request.message.substring(0, 50) + '...' });
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      const data = await response.json();
      console.log('[CHAT_API_CLIENT] Mensaje enviado exitosamente:', { chatId: request.chatId });
      return data;
    } catch (error) {
      console.error('[CHAT_API_CLIENT] Error al enviar mensaje:', { chatId: request.chatId, error });
      throw error;
    }
  }

  /**
   * Marca un chat como leído (funcionalidad futura)
   */
  async markAsRead(chatId: string): Promise<void> {
    // Implementación futura cuando se agregue el endpoint
    console.log(`Marcando chat ${chatId} como leído`);
  }
}

// Instancia singleton del cliente
export const chatApiClient = new ChatApiClient();

// Export por defecto para compatibilidad
export default chatApiClient;