/**
 * Hook personalizado para manejar los mensajes de un chat específico
 * Proporciona funcionalidades para obtener mensajes, enviar mensajes y manejar estados
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { chatApiClient, Message, SendMessageRequest } from '../lib/chatApiClient';

export interface UseChatMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  refreshMessages: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook para manejar los mensajes de un chat específico
 */
export function useChatMessages(chatId: string | null): UseChatMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentChatId = useRef<string | null>(null);

  /**
   * Obtiene los mensajes del chat actual
   */
  const fetchMessages = useCallback(async (targetChatId: string) => {
    console.log('[USE_CHAT_MESSAGES] Iniciando carga de mensajes para chat:', { chatId: targetChatId });
    try {
      setIsLoading(true);
      setError(null);
      const fetchedMessages = await chatApiClient.getMessages(targetChatId);
      
      // Solo actualizar si seguimos en el mismo chat
      if (currentChatId.current === targetChatId) {
        console.log('[USE_CHAT_MESSAGES] Mensajes cargados exitosamente:', {
          chatId: targetChatId,
          count: fetchedMessages.length,
          sample: fetchedMessages.slice(0, 2).map(msg => ({ id: msg.id, content: msg.content.substring(0, 50) + '...' }))
        });
        setMessages(fetchedMessages);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      if (currentChatId.current === targetChatId) {
        console.error('[USE_CHAT_MESSAGES] Error al cargar mensajes:', { chatId: targetChatId, error: err, errorMessage });
        setError(errorMessage);
      }
      console.error('Error fetching messages:', err);
    } finally {
      if (currentChatId.current === targetChatId) {
        setIsLoading(false);
        console.log('[USE_CHAT_MESSAGES] Carga de mensajes finalizada para chat:', { chatId: targetChatId });
      }
    }
  }, []);

  /**
   * Envía un mensaje al chat actual
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!chatId || !content.trim()) {
      console.log('[USE_CHAT_MESSAGES] No se puede enviar mensaje:', { chatId, hasContent: !!content.trim() });
      return;
    }

    console.log('[USE_CHAT_MESSAGES] Enviando mensaje:', { chatId, content: content.substring(0, 50) + '...' });
    try {
      setIsSending(true);
      setError(null);
      
      const request: SendMessageRequest = {
        chatId,
        message: content.trim(),
      };
      
      const newMessage = await chatApiClient.sendMessage(request);
      console.log('[USE_CHAT_MESSAGES] Mensaje enviado exitosamente');
      
      // Agregar el mensaje enviado a la lista local
      setMessages(prev => [...prev, newMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error enviando mensaje';
      console.error('[USE_CHAT_MESSAGES] Error al enviar mensaje:', { chatId, error: err, errorMessage });
      setError(errorMessage);
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
      console.log('[USE_CHAT_MESSAGES] Envío de mensaje finalizado para chat:', { chatId });
    }
  }, [chatId]);

  /**
   * Refresca los mensajes del chat actual
   */
  const refreshMessages = useCallback(async () => {
    if (chatId) {
      await fetchMessages(chatId);
    }
  }, [chatId, fetchMessages]);

  /**
   * Limpia el error actual
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Efecto para cargar mensajes cuando cambia el chatId
  useEffect(() => {
    console.log('[USE_CHAT_MESSAGES] Hook inicializado o chatId cambió:', { chatId });
    currentChatId.current = chatId;
    
    if (chatId) {
      console.log('[USE_CHAT_MESSAGES] No hay chatId, saltando carga de mensajes');
      setMessages([]); // Limpiar mensajes anteriores
      fetchMessages(chatId);
    } else {
      setMessages([]);
      setIsLoading(false);
    }
  }, [chatId, fetchMessages]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    refreshMessages,
    clearError,
  };
}

export default useChatMessages;