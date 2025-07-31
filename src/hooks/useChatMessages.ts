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
export function useChatMessages(remoteJid: string | null): UseChatMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentRemoteJid = useRef<string | null>(null);

  /**
   * Obtiene los mensajes del chat actual
   */
  const fetchMessages = useCallback(async (targetRemoteJid: string) => {
    console.log('[USE_CHAT_MESSAGES] Iniciando carga de mensajes para chat:', { remoteJid: targetRemoteJid });
    try {
      setIsLoading(true);
      setError(null);
      const fetchedMessages = await chatApiClient.getMessages(targetRemoteJid);
      
      // Solo actualizar si seguimos en el mismo chat
      if (currentRemoteJid.current === targetRemoteJid) {
        console.log('[USE_CHAT_MESSAGES] Mensajes cargados exitosamente:', {
          remoteJid: targetRemoteJid,
          count: fetchedMessages.length,
          sample: fetchedMessages.slice(0, 2).map(msg => ({ id: msg.id, content: msg.content.substring(0, 50) + '...' }))
        });
        setMessages(fetchedMessages);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      if (currentRemoteJid.current === targetRemoteJid) {
        console.error('[USE_CHAT_MESSAGES] Error al cargar mensajes:', { remoteJid: targetRemoteJid, error: err, errorMessage });
        setError(errorMessage);
      }
      console.error('Error fetching messages:', err);
    } finally {
      if (currentRemoteJid.current === targetRemoteJid) {
        setIsLoading(false);
        console.log('[USE_CHAT_MESSAGES] Carga de mensajes finalizada para chat:', { remoteJid: targetRemoteJid });
      }
    }
  }, []);

  /**
   * Envía un mensaje al chat actual
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!remoteJid || !content.trim()) {
      console.warn('[USE_CHAT_MESSAGES] No se puede enviar mensaje: remoteJid o contenido vacío');
      return;
    }

    console.log('[USE_CHAT_MESSAGES] Enviando mensaje:', { remoteJid, content: content.substring(0, 50) + '...' });
    try {
      setIsSending(true);
      setError(null);
      
      const request: SendMessageRequest = {
        remoteJid,
        message: content.trim(),
      };
      
      const newMessage = await chatApiClient.sendMessage(request);
      console.log('[USE_CHAT_MESSAGES] Mensaje enviado exitosamente');
      
      // Agregar el mensaje enviado a la lista local
      setMessages(prev => [...prev, newMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error enviando mensaje';
      console.error('[USE_CHAT_MESSAGES] Error al enviar mensaje:', { remoteJid, error: err, errorMessage });
      setError(errorMessage);
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
      console.log('[USE_CHAT_MESSAGES] Envío de mensaje finalizado para chat:', { remoteJid });
    }
  }, [remoteJid]);

  /**
   * Refresca los mensajes del chat actual
   */
  const refreshMessages = useCallback(async () => {
    if (remoteJid) {
      await fetchMessages(remoteJid);
    }
  }, [remoteJid, fetchMessages]);

  /**
   * Limpia el error actual
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Efecto para cargar mensajes cuando cambia el remoteJid
  useEffect(() => {
    console.log('[USE_CHAT_MESSAGES] Hook inicializado o remoteJid cambió:', { remoteJid });
    currentRemoteJid.current = remoteJid;
    
    if (remoteJid) {
      setMessages([]); // Limpiar mensajes anteriores
      fetchMessages(remoteJid);
    } else {
      console.log('[USE_CHAT_MESSAGES] No hay remoteJid, saltando carga de mensajes');
      setMessages([]);
      setIsLoading(false);
    }
  }, [remoteJid, fetchMessages]);

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