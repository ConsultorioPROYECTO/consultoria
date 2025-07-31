'use client'

import { ChatList } from './_components/ChatList'
import { ChatWindow } from './_components/ChatWindow'
import { useChat } from '@/hooks/useChat'
import { useChatMessages } from '@/hooks/useChatMessages'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

// Los tipos ahora se importan desde el cliente API

export default function ChatsView() {
  // Usar hooks personalizados para manejar estado
  const { chats, selectedChatId, isLoading: chatsLoading, error: chatsError, selectChat } = useChat();
  const { messages, error: messagesError, sendMessage } = useChatMessages(selectedChatId);

  // Encontrar el chat seleccionado
  const selectedChat = chats.find(chat => chat.id === selectedChatId);
  const selectedPatient = selectedChat ? {
    id: selectedChat.id,
    name: selectedChat.patientName,
    avatar: selectedChat.patientAvatar,
    isOnline: selectedChat.isOnline,
    lastSeen: selectedChat.isOnline ? undefined : 'hace 2 horas'
  } : undefined;

  const handleChatSelect = (chatId: string) => {
    selectChat(chatId);
  };

  const handleSendMessage = async (message: string) => {
    await sendMessage(message);
  };

  // Mostrar estado de carga inicial
  if (chatsLoading) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center bg-background border rounded-lg">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Cargando chats...</span>
        </div>
      </div>
    );
  }

  // Mostrar error si hay problemas
  if (chatsError) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center bg-background border rounded-lg p-4">
        <Alert className="max-w-md">
          <AlertDescription>
            Error cargando chats: {chatsError}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] flex bg-background border rounded-lg overflow-hidden">
      {/* Chat List Sidebar */}
      <div className="w-80 border-r bg-background">
        <ChatList 
          chats={chats}
           selectedChatId={selectedChatId || undefined}
          onChatSelect={handleChatSelect}
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
               onSendMessage={handleSendMessage}
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