'use client'

import { useState, useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Send, Paperclip, Smile, Check, CheckCheck, Play, Pause, Volume2 } from "lucide-react"
import { useAuth } from "@/app/context/AuthContext"

interface Message {
  id: string
  content: string
  timestamp: string
  isFromDoctor: boolean
  status: 'sent' | 'delivered' | 'read'
  messageType?: 'text' | 'audio' | 'image' | 'document'
  audioData?: {
    messageId: string
    duration?: number
    isPtt?: boolean
    mimetype?: string
    waveform?: string
  }
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

// Componente para renderizar mensajes de audio
function AudioMessage({ audioData }: { audioData: Message['audioData'] }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [audioSrc, setAudioSrc] = useState<string>('')
  const [error, setError] = useState<string>('')
  const audioRef = useRef<HTMLAudioElement>(null)
  const { user } = useAuth()

  // Obtener el audio en base64 cuando el componente se monta
  useEffect(() => {
    const fetchAudioBase64 = async () => {
      if (!audioData?.messageId || !user) return
      
      try {
        setIsLoading(true)
        setError('')
        
        // Obtener el token de autenticación
        const token = await user.getIdToken()
        
        const response = await fetch('/api/patients/chats/media/base64', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            messageId: audioData.messageId
          }),
        })

        if (!response.ok) {
          throw new Error(`Error al obtener el audio: ${response.status}`)
        }

        const data = await response.json()
        
        if (data.success && data.data?.base64 && audioData.mimetype) {
          // Crear una URL de datos con el base64
          const audioUrl = `data:${audioData.mimetype};base64,${data.data.base64}`
          setAudioSrc(audioUrl)
        } else {
          throw new Error('No se pudo obtener el audio')
        }
      } catch (err) {
        console.error('Error al cargar el audio:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAudioBase64()
  }, [audioData?.messageId, audioData?.mimetype, user])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch(err => {
          console.error('Error al reproducir audio:', err)
          setError('No se pudo reproducir el audio')
        })
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleAudioEnd = () => {
    setIsPlaying(false)
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Volume2 className="h-4 w-4" />
        <span className="text-sm">Error: {error}</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Volume2 className="h-4 w-4" />
        <span className="text-sm">Cargando audio...</span>
      </div>
    )
  }

  if (!audioSrc) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Volume2 className="h-4 w-4" />
        <span className="text-sm">Audio no disponible</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg max-w-xs">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={togglePlay}
        disabled={isLoading || !audioSrc}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Volume2 className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {audioData?.duration ? `${audioData.duration}s` : 'Audio'}
            {audioData?.isPtt && ' • Nota de voz'}
          </span>
        </div>
        <div className="w-full h-1 bg-muted rounded-full mt-1">
          <div className="h-full bg-primary rounded-full w-0" />
        </div>
      </div>
      <audio
        ref={audioRef}
        src={audioSrc}
        onEnded={handleAudioEnd}
        preload="metadata"
      />
    </div>
  )
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
                      "max-w-[70%] rounded-lg text-sm",
                      message.messageType === 'audio' ? "" : "px-3 py-2",
                      message.isFromDoctor
                        ? "bg-secondary text-secondary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                    )}
                  >
                    {message.messageType === 'audio' ? (
                      <div className="p-2">
                        <AudioMessage audioData={message.audioData} />
                        <div className="flex items-center justify-end gap-1 mt-2">
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
                    ) : (
                      <>
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
                      </>
                    )}
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