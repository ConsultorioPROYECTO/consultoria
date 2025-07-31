/**
 * Hook personalizado para manejar el estado de los chats
 * Proporciona funcionalidades para obtener chats, seleccionar chat activo y manejar estados de carga
 */

import { useState, useEffect, useCallback } from 'react';
import { chatApiClient, Chat } from '@/lib/chatApiClient';

export interface UseChatReturn {
  chats: Chat[];
  selectedChatId: string | null;
  isLoading: boolean;
  error: string | null;
  selectChat: (chatId: string) => void;
  refreshChats: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook para manejar el estado de los chats
 */
export function useChat(): UseChatReturn {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Obtiene la lista de chats desde la API
   */
  const fetchChats = useCallback(async () => {
    console.log('[USE_CHAT] Iniciando carga de chats...');
    try {
      setIsLoading(true);
      setError(null);
      const fetchedChats = await chatApiClient.getChats();
      console.log('[USE_CHAT] Chats cargados exitosamente:', {
         count: fetchedChats.length,
         chats: fetchedChats.map(chat => ({ id: chat.id, patientName: chat.patientName }))
       });
      setChats(fetchedChats);
      
      // Si no hay chat seleccionado y hay chats disponibles, seleccionar el primero
      if (!selectedChatId && fetchedChats.length > 0) {
        setSelectedChatId(fetchedChats[0].id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[USE_CHAT] Error al cargar chats:', { error: err, errorMessage });
      setError(errorMessage);
      console.error('Error fetching chats:', err);
    } finally {
      setIsLoading(false);
      console.log('[USE_CHAT] Carga de chats finalizada');
    }
  }, [selectedChatId]);

  /**
   * Selecciona un chat específico
   */
  const selectChat = useCallback((chatId: string) => {
    console.log('[USE_CHAT] Seleccionando chat:', { chatId });
    setSelectedChatId(chatId);
  }, []);

  /**
   * Refresca la lista de chats
   */
  const refreshChats = useCallback(async () => {
    await fetchChats();
  }, [fetchChats]);

  /**
   * Limpia el error actual
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cargar chats al montar el componente
  useEffect(() => {
    console.log('[USE_CHAT] Hook inicializado, cargando chats...');
    fetchChats();
  }, [fetchChats]);

  return {
    chats,
    selectedChatId,
    isLoading,
    error,
    selectChat,
    refreshChats,
    clearError,
  };
}

export default useChat;