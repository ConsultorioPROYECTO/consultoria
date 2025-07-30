'use client'

import { useState, useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Send, Paperclip, Smile, Check, CheckCheck } from "lucide-react"

interface Message {
  id: string
  content: string
  timestamp: string
  isFromDoctor: boolean
  status: 'sent' | 'delivered' | 'read'
}

interface Patient {
  id: string
  name: string
  avatar?: string
  isOnline: boolean
  lastSeen?: string
}

interface ChatWindowProps {
  patient: Patient
  messages: Message[]
  onSendMessage: (message: string) => void
}

export function ChatWindow({ patient, messages, onSendMessage }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim())
      setNewMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={patient.avatar} alt={patient.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials(patient.name)}
              </AvatarFallback>
            </Avatar>
            {patient.isOnline && (
              <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-foreground">{patient.name}</h3>
            <p className="text-xs text-muted-foreground">
              {patient.isOnline ? 'En línea' : `Última vez: ${patient.lastSeen}`}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-4">
            <div className="flex flex-col gap-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.isFromDoctor ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                      message.isFromDoctor
                        ? "bg-secondary text-secondary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                    )}
                  >
                    <p className="break-words">{message.content}</p>
                    <div className="flex items-center justify-end gap-1">
                      <span className={cn(
                        "text-xs",
                        message.isFromDoctor ? "text-muted-foreground" : "text-muted-foreground"
                      )}>
                        {formatMessageTime(message.timestamp)}
                      </span>
                      {message.isFromDoctor && (
                        <div className="flex">
                          {message.status === 'read' && (
                            <CheckCheck className="h-4 w-4 text-blue-200" />
                          )}
                          {message.status === 'delivered' && (
                            <CheckCheck className="h-3 w-3 text-blue-200" />
                          )}
                          {message.status === 'sent' && (
                            <Check className="h-3 w-3 text-blue-200" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </ScrollArea>
      </div>

      {/* Message Input */}
      <div className="p-4 border-t bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              className="pr-10"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-green-500 hover:bg-green-600 text-white"
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}