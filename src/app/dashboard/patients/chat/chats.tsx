'use client'

import { useState } from 'react'
import { ChatList } from './_components/ChatList'
import { ChatWindow } from './_components/ChatWindow'

// Mock data for demonstration
const mockChats = [
  {
    id: '1',
    patientName: 'María González',
    patientAvatar: undefined,
    lastMessage: 'Gracias doctor, me siento mucho mejor',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    unreadCount: 2,
    isOnline: true,
    messageStatus: 'read' as const
  },
  {
    id: '2',
    patientName: 'Carlos Rodríguez',
    patientAvatar: undefined,
    lastMessage: '¿Cuándo es mi próxima cita?',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    unreadCount: 0,
    isOnline: false,
    messageStatus: 'delivered' as const
  },
  {
    id: '3',
    patientName: 'Ana Martínez',
    patientAvatar: undefined,
    lastMessage: 'Buenos días doctor',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    unreadCount: 1,
    isOnline: false,
    messageStatus: 'sent' as const
  }
]

type MessageStatus = 'sent' | 'delivered' | 'read'

type Message = {
  id: string
  content: string
  timestamp: string
  isFromDoctor: boolean
  status: MessageStatus
}

const mockMessages: Message[] = [
  {
    id: '1',
    content: 'Hola doctor, ¿cómo está?',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    isFromDoctor: false,
    status: 'read'
  },
  {
    id: '2',
    content: 'Hola María, muy bien gracias. ¿Cómo te sientes después del tratamiento?',
    timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    isFromDoctor: true,
    status: 'read'
  },
  {
    id: '3',
    content: 'Mucho mejor, el dolor ha disminuido considerablemente',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isFromDoctor: false,
    status: 'read'
  },
  {
    id: '4',
    content: 'Gracias doctor, me siento mucho mejor',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isFromDoctor: false,
    status: 'read'
  }
]

export default function ChatsView() {
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>('1')
  const [messages, setMessages] = useState(mockMessages)

  const selectedChat = mockChats.find(chat => chat.id === selectedChatId)
  const selectedPatient = selectedChat ? {
    id: selectedChat.id,
    name: selectedChat.patientName,
    avatar: selectedChat.patientAvatar,
    isOnline: selectedChat.isOnline,
    lastSeen: selectedChat.isOnline ? undefined : 'hace 2 horas'
  } : undefined

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId)
  }

  const handleSendMessage = (message: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content: message,
      timestamp: new Date().toISOString(),
      isFromDoctor: true,
      status: 'sent'
    }
    setMessages(prev => [...prev, newMessage])
  }

  return (
    <div className="h-[calc(100vh-200px)] flex bg-background border rounded-lg overflow-hidden">
      {/* Chat List Sidebar */}
       <div className="w-80 border-r bg-background">
         <ChatList 
           chats={mockChats}
           selectedChatId={selectedChatId}
           onChatSelect={handleChatSelect}
         />
       </div>

      {/* Chat Window */}
      <div className="flex-1">
        {selectedPatient ? (
          <ChatWindow
            patient={selectedPatient}
            messages={messages}
            onSendMessage={handleSendMessage}
          />
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
  )
}