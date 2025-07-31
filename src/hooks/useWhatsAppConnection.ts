/**
 * Hook personalizado para manejar el estado de conexión de WhatsApp
 * Proporciona funcionalidades para verificar el estado de conexión de la instancia de Evolution API
 */

import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/app/lib/firebase/firebaseConfig';

export interface WhatsAppConnectionState {
  instanceName?: string;
  state?: string;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastChecked: Date | null;
}

export interface UseWhatsAppConnectionReturn {
  connectionState: WhatsAppConnectionState;
  checkConnection: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook para manejar el estado de conexión de WhatsApp
 */
export function useWhatsAppConnection(): UseWhatsAppConnectionReturn {
  const [connectionState, setConnectionState] = useState<WhatsAppConnectionState>({
    isConnected: false,
    isLoading: true,
    error: null,
    lastChecked: null,
  });

  /**
   * Verifica el estado de conexión de WhatsApp
   */
  const checkConnection = useCallback(async () => {
    console.log('[USE_WHATSAPP_CONNECTION] Verificando estado de conexión...');
    
    try {
      setConnectionState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const token = await user.getIdToken();
      
      const response = await fetch('/api/evolutionAPI/connectionState', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: `HTTP ${response.status}: ${response.statusText}` 
        }));
        throw new Error(errorData.message || 'Error al verificar conexión');
      }

      const result = await response.json();
      
      if (result.success && result.data?.instance) {
        const { instanceName, state } = result.data.instance;
        const isConnected = state === 'open';
        
        console.log('[USE_WHATSAPP_CONNECTION] Estado de conexión obtenido:', {
          instanceName,
          state,
          isConnected
        });
        
        setConnectionState({
          instanceName,
          state,
          isConnected,
          isLoading: false,
          error: null,
          lastChecked: new Date(),
        });
      } else if (result.success && result.data?.state) {
        // Caso donde tenemos información de estado pero no instancia completa
        const state = result.data.state;
        const isConnected = state === 'open';
        
        console.log('[USE_WHATSAPP_CONNECTION] Estado de conexión obtenido (sin instancia):', {
          state,
          isConnected
        });
        
        setConnectionState({
          instanceName: undefined,
          state,
          isConnected,
          isLoading: false,
          error: null,
          lastChecked: new Date(),
        });
      } else {
        // No hay datos de instancia - esto es un estado normal cuando WhatsApp no está configurado
        console.log('[USE_WHATSAPP_CONNECTION] WhatsApp no configurado o no conectado');
        
        setConnectionState({
          instanceName: undefined,
          state: undefined,
          isConnected: false,
          isLoading: false,
          error: null,
          lastChecked: new Date(),
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      
      // Solo loggear como error si es un error real de red/servidor, no de configuración
      const isConfigurationError = errorMessage.includes('WhatsApp') || 
                                   errorMessage.includes('instancia') || 
                                   errorMessage.includes('configuración') ||
                                   errorMessage.includes('no encontrada');
      
      if (isConfigurationError) {
        console.log('[USE_WHATSAPP_CONNECTION] WhatsApp no configurado:', errorMessage);
      } else {
        console.error('[USE_WHATSAPP_CONNECTION] Error al verificar conexión:', { error: err, errorMessage });
      }
      
      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        error: isConfigurationError ? null : errorMessage,
        lastChecked: new Date(),
      }));
    }
  }, []);

  /**
   * Limpia el error actual
   */
  const clearError = useCallback(() => {
    setConnectionState(prev => ({ ...prev, error: null }));
  }, []);

  // Verificar conexión al montar el componente
  useEffect(() => {
    console.log('[USE_WHATSAPP_CONNECTION] Hook inicializado, verificando conexión...');
    checkConnection();
  }, [checkConnection]);

  return {
    connectionState,
    checkConnection,
    clearError,
  };
}

export default useWhatsAppConnection;