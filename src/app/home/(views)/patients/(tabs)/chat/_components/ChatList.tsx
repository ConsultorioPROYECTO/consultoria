'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Check, CheckCheck } from "lucide-react"

interface Chat {
  id: string
  remoteJid: string
  patientName: string
  patientAvatar?: string
  lastMessage: string
  timestamp: string
  unreadCount: number
  isOnline: boolean
  messageStatus: 'sent' | 'delivered' | 'read'
}

interface ChatListProps {
  chats: Chat[]
  selectedRemoteJid?: string
  onChatSelect: (remoteJid: string) => void
}

export function ChatList({ chats, selectedRemoteJid, onChatSelect }: ChatListProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('es-ES', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
    }
  }

  const renderMessageStatus = (status: Chat['messageStatus']) => {
    switch (status) {
      case 'sent':
        return <Check className="h-4 w-4 text-muted-foreground" />
      case 'delivered':
        return <CheckCheck className="h-4 w-4 text-muted-foreground" />
      case 'read':
        return <CheckCheck className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Chats</h2>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onChatSelect(chat.remoteJid)}
            className={cn(
              "flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/50",
              selectedRemoteJid === chat.remoteJid && "bg-muted"
            )}
          >
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={chat.patientAvatar} alt={chat.patientName} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getInitials(chat.patientName)}
                </AvatarFallback>
              </Avatar>
              {chat.isOnline && (
                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-background rounded-full" />
              )}
            </div>

            {/* Chat Info */}
            <div className="grid grid-cols-[1fr_auto] grid-rows-2 gap-x-2 gap-y-1 flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">
                {chat.patientName}
              </h3>
              <div className="flex items-center gap-1">
                {renderMessageStatus(chat.messageStatus)}
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(chat.timestamp)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {chat.lastMessage}
              </p>
              {chat.unreadCount > 0 && (
                <Badge 
                  variant="default" 
                  className="bg-green-500 hover:bg-green-600 text-white min-w-[20px] h-5 text-xs rounded-full flex items-center justify-center justify-self-end"
                >
                  {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}