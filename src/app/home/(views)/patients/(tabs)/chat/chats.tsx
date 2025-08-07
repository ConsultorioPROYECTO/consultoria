'use client'

import { ChatList } from './_components/ChatList'
import { ChatWindow } from './_components/ChatWindow'
import { useChat } from '@/hooks/useChat'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import WaveformLoader from '@/components/custom/WaveformLoader';
import { WifiOff, RefreshCw, AlertTriangle, MessageCircle } from 'lucide-react'

// Los tipos ahora se importan desde el cliente API

export default function ChatsView() {
  console.log('[CHATS_VIEW] Componente renderizado');
  
  // Usar hooks personalizados para manejar estado
  const { chats, selectedRemoteJid, isLoading: chatsLoading, error: chatsError, selectChat } = useChat();
  const { messages, error: messagesError, sendMessage } = useChatMessages(selectedRemoteJid);
  const { connectionState, checkConnection } = useWhatsAppConnection();
  
  console.log('[CHATS_VIEW] Estado actual:', {
    chatsCount: chats.length,
    selectedRemoteJid,
    messagesCount: messages.length,
    loading: chatsLoading,
    hasError: !!chatsError
  });

  // Encontrar el chat seleccionado
  const selectedChat = chats.find(chat => chat.remoteJid === selectedRemoteJid);
  const selectedPatient = selectedChat ? {
    id: selectedChat.id,
    name: selectedChat.patientName,
    avatar: selectedChat.patientAvatar,
    isOnline: selectedChat.isOnline,
    lastSeen: selectedChat.isOnline ? undefined : 'hace 2 horas'
  } : undefined;

  const handleChatSelect = (remoteJid: string) => {
    selectChat(remoteJid);
  };

  const handleSendMessage = async (message: string) => {
    await sendMessage(message);
  };

  // Mostrar estado de carga inicial
  if (chatsLoading || connectionState.isLoading) {
    console.log('[CHATS_VIEW] Mostrando estado de carga');
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center bg-background border rounded-xl">
        <div className="flex h-screen flex-col items-center justify-center">
    <WaveformLoader className="w-24 h-auto text-muted-foreground" />
  </div>
      </div>
    );
  }

  // Si no hay chats y la conexión no está activa, mostrar pantalla de conexión
  if (chats.length === 0 && !connectionState.isConnected && !connectionState.isLoading) {
    console.log('[CHATS_VIEW] WhatsApp no está conectado:', connectionState);
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center bg-background border rounded-xl p-6">
        <div className="text-center max-w-md flex flex-col gap-6">
          {/* Icono de WhatsApp desconectado */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* Título y descripción */}
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-foreground">
              WhatsApp no está conectado
            </h3>
            <p className="text-sm text-muted-foreground">
              Para usar el chat, necesitas conectar tu WhatsApp. Ve a configuración e integraciones para conectar WhatsApp.
            </p>
            {connectionState.state && (
              <p className="text-xs text-muted-foreground">
                Estado actual: <span className="font-mono">{connectionState.state}</span>
              </p>
            )}
          </div>



          {/* Botón de acción */}
          <div className="flex justify-center">
            <Button 
              onClick={checkConnection} 
              variant="default"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Verificar conexión
            </Button>
          </div>

          {/* Información adicional */}
          <div className="text-xs text-muted-foreground flex flex-col gap-1">
            <p>• Ve a Configuración → Integraciones</p>
            <p>• Conecta tu WhatsApp escaneando el código QR</p>
            <p>• Asegúrate de mantener WhatsApp activo en tu dispositivo</p>
          </div>
        </div>
      </div>
    );
  }

  // Determinar el tipo de error para mostrar la pantalla apropiada
  const getErrorType = (error: string) => {
    const lowerError = error.toLowerCase();
    if (lowerError.includes('whatsapp') || lowerError.includes('evolution') || 
        lowerError.includes('configuración') || lowerError.includes('instanceid') ||
        lowerError.includes('api externa') || lowerError.includes('conexión')) {
      return 'whatsapp';
    }
    if (lowerError.includes('red') || lowerError.includes('network') || 
        lowerError.includes('fetch') || lowerError.includes('timeout')) {
      return 'network';
    }
    return 'general';
  };

  // Mostrar error si hay problemas
  if (chatsError) {
    console.error('[CHATS_VIEW] Mostrando error:', chatsError);
    const errorType = getErrorType(chatsError);
    
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center bg-background border rounded-xl p-6">
        <div className="text-center max-w-md flex flex-col gap-6">
          {/* Icono según el tipo de error */}
          <div className="flex justify-center">
            {errorType === 'whatsapp' && (
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            )}
            {errorType === 'network' && (
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <WifiOff className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            )}
            {errorType === 'general' && (
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            )}
          </div>

          {/* Título y descripción según el tipo de error */}
          <div className="flex flex-col gap-2">
            {errorType === 'whatsapp' && (
              <>
                <h3 className="text-lg font-semibold text-foreground">
                  WhatsApp no está conectado
                </h3>
                <p className="text-sm text-muted-foreground">
                  No se pudo establecer conexión con WhatsApp. Verifica que la instancia esté configurada correctamente y activa.
                </p>
              </>
            )}
            {errorType === 'network' && (
              <>
                <h3 className="text-lg font-semibold text-foreground">
                  Problema de conexión
                </h3>
                <p className="text-sm text-muted-foreground">
                  No se pudo conectar al servidor. Verifica tu conexión a internet e intenta nuevamente.
                </p>
              </>
            )}
            {errorType === 'general' && (
              <>
                <h3 className="text-lg font-semibold text-foreground">
                  Error inesperado
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ocurrió un error inesperado. Por favor, intenta nuevamente.
                </p>
              </>
            )}
          </div>

          {/* Mensaje de error técnico */}
          <Alert className="text-left">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Detalles técnicos:</strong> {chatsError}
            </AlertDescription>
          </Alert>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => window.location.reload()} 
              variant="default"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </Button>
            

          </div>

          {/* Información adicional para errores de WhatsApp */}
          {errorType === 'whatsapp' && (
            <div className="text-xs text-muted-foreground flex flex-col gap-1">
              <p>• Asegúrate de que WhatsApp esté escaneado y conectado</p>
              <p>• Verifica que la instancia no haya expirado</p>
              <p>• Contacta al administrador si el problema persiste</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] flex bg-background border rounded-xl overflow-hidden">
      {/* Chat List Sidebar */}
      <div className="w-80 border-r bg-background">
        <ChatList 
          chats={chats}
           selectedRemoteJid={selectedRemoteJid || undefined}
          onChatSelect={(remoteJid) => {
            console.log('[CHATS_VIEW] Chat seleccionado desde ChatList:', { remoteJid });
            handleChatSelect(remoteJid);
          }}
        />
      </div>

      {/* Chat Window */}
      <div className="flex-1">
        {selectedPatient ? (
          <>
            {messagesError && (
              <Alert className="m-4">
                <AlertDescription>
                  Error cargando mensajes: {messagesError}
                </AlertDescription>
              </Alert>
            )}
            <ChatWindow
               patient={selectedPatient}
               messages={messages}
               onSendMessage={(message) => {
                 console.log('[CHATS_VIEW] Enviando mensaje desde ChatWindow:', { content: message.substring(0, 50) + '...' });
                 handleSendMessage(message);
               }}
             />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <p className="text-lg font-medium mb-2">Selecciona un chat</p>
              <p className="text-sm">Elige una conversación para comenzar a chatear</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}