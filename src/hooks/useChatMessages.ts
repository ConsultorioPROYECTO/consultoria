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
    try {
      setIsLoading(true);
      setError(null);
      const fetchedMessages = await chatApiClient.getMessages(targetChatId);
      
      // Solo actualizar si seguimos en el mismo chat
      if (currentChatId.current === targetChatId) {
        setMessages(fetchedMessages);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      if (currentChatId.current === targetChatId) {
        setError(errorMessage);
      }
      console.error('Error fetching messages:', err);
    } finally {
      if (currentChatId.current === targetChatId) {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * Envía un mensaje al chat actual
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!chatId || !content.trim()) {
      return;
    }

    try {
      setIsSending(true);
      setError(null);
      
      const request: SendMessageRequest = {
        chatId,
        message: content.trim(),
      };
      
      const newMessage = await chatApiClient.sendMessage(request);
      
      // Agregar el mensaje enviado a la lista local
      setMessages(prev => [...prev, newMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error enviando mensaje';
      setError(errorMessage);
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
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
    currentChatId.current = chatId;
    
    if (chatId) {
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