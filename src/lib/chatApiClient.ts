/**
 * Cliente API para manejar las operaciones de chat con WhatsApp
 * Incluye autenticación automática con Firebase y manejo de errores
 */

import { getAuth } from 'firebase/auth';

// Tipos para las respuestas de la API
export interface Chat {
  id: string;
  patientName: string;
  patientAvatar?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  messageStatus: 'sent' | 'delivered' | 'read';
}

export interface Message {
  id: string;
  content: string;
  timestamp: string;
  isFromDoctor: boolean;
  status: 'sent' | 'delivered' | 'read';
}

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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Error de red'
      }));
      throw new Error(errorData.error || `Error HTTP: ${response.status}`);
    }

    return response;
  }

  /**
   * Obtiene la lista de chats
   */
  async getChats(): Promise<Chat[]> {
    const response = await this.authenticatedFetch(this.baseUrl);
    return await response.json();
  }

  /**
   * Obtiene los mensajes de un chat específico
   */
  async getMessages(chatId: string): Promise<Message[]> {
    const url = `${this.baseUrl}/messages?chatId=${encodeURIComponent(chatId)}`;
    const response = await this.authenticatedFetch(url);
    return await response.json();
  }

  /**
   * Envía un mensaje a un chat específico
   */
  async sendMessage(request: SendMessageRequest): Promise<Message> {
    const response = await this.authenticatedFetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return await response.json();
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