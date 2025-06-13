// src/app/dashboard/2/compo/DirectMessagingPanel.tsx
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@rutas/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@rutas/components/ui/avatar";
import { Button } from "@rutas/components/ui/button";
import { Input } from "@rutas/components/ui/input";
import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { Paperclip, SendHorizonal, SearchIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@rutas/components/ui/badge";

interface Message {
  id: string;
  sender: 'doctor' | 'patient';
  text: string;
  timestamp: string;
  avatar?: string;
}

interface Conversation {
  id: string;
  patientName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  avatar: string;
  messages: Message[];
}

// Mock data
const mockConversations: Conversation[] = [
  {
    id: "conv1",
    patientName: "Elena García",
    lastMessage: "Gracias, doctor. ¿Debo tomar alguna precaución adicional?",
    timestamp: "10:30 AM",
    unreadCount: 2,
    avatar: "https://i.pravatar.cc/150?u=elena",
    messages: [
      { id: "m1", sender: "doctor", text: "Hola Elena, tus resultados están listos.", timestamp: "10:00 AM" },
      { id: "m2", sender: "patient", text: "¡Perfecto! ¿Todo bien?", timestamp: "10:05 AM", avatar: "https://i.pravatar.cc/150?u=elena" },
      { id: "m3", sender: "doctor", text: "Sí, todo en orden. Te los envío adjuntos.", timestamp: "10:10 AM" },
      { id: "m4", sender: "patient", text: "Gracias, doctor. ¿Debo tomar alguna precaución adicional?", timestamp: "10:30 AM", avatar: "https://i.pravatar.cc/150?u=elena" },
    ],
  },
  {
    id: "conv2",
    patientName: "Roberto Fernández",
    lastMessage: "Entendido, nos vemos entonces.",
    timestamp: "Ayer",
    unreadCount: 0,
    avatar: "https://i.pravatar.cc/150?u=roberto",
    messages: [
      { id: "m5", sender: "doctor", text: "Roberto, recordatorio de tu cita mañana a las 9:30 AM.", timestamp: "Ayer 03:00 PM" },
      { id: "m6", sender: "patient", text: "Confirmado, doctor. Allí estaré.", timestamp: "Ayer 03:05 PM", avatar: "https://i.pravatar.cc/150?u=roberto" },
      { id: "m7", sender: "patient", text: "Entendido, nos vemos entonces.", timestamp: "Ayer 03:06 PM", avatar: "https://i.pravatar.cc/150?u=roberto" },
    ],
  },
];

export function DirectMessagingPanel() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(mockConversations[0]?.id || null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const newMsgObject: Message = {
      id: `msg-${Date.now()}`,
      sender: 'doctor',
      text: newMessage,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedConversations = conversations.map(conv => {
      if (conv.id === selectedConversationId) {
        return {
          ...conv,
          messages: [...conv.messages, newMsgObject],
          lastMessage: newMsgObject.text,
          timestamp: newMsgObject.timestamp,
        };
      }
      return conv;
    });
    setConversations(updatedConversations);
    setNewMessage("");
  };

  const filteredConversations = conversations.filter(conv => 
    conv.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="h-[600px] flex flex-col md:flex-row"> {/* Altura ajustable */}
      {/* Lista de Conversaciones */}
      <div className="w-full md:w-1/3 border-r flex flex-col">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Mensajes Directos</h3>
          <div className="relative mt-2">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar paciente..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-grow">
          {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${selectedConversationId === conv.id ? 'bg-muted' : ''}`}
              onClick={() => setSelectedConversationId(conv.id)}
            >
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={conv.avatar} alt={conv.patientName} />
                  <AvatarFallback>{conv.patientName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="font-medium truncate text-sm">{conv.patientName}</p>
                    <span className="text-xs text-muted-foreground">{conv.timestamp}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground truncate pr-2">{conv.lastMessage}</p>
                    {conv.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0.5">{conv.unreadCount}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Panel de Chat Activo */}
      <div className="w-full md:w-2/3 flex flex-col bg-background">
        {selectedConversation ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedConversation.avatar} alt={selectedConversation.patientName} />
                  <AvatarFallback>{selectedConversation.patientName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{selectedConversation.patientName}</CardTitle>
                  <CardDescription>Integración WhatsApp (simulada)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <ScrollArea className="flex-grow p-4 space-y-4 bg-muted/20">
              {selectedConversation.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'doctor' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-end space-x-2 max-w-[75%]`}>
                    {msg.sender === 'patient' && (
                      <Avatar className="h-8 w-8 self-end mb-1">
                        <AvatarImage src={msg.avatar} />
                        <AvatarFallback>{selectedConversation.patientName.substring(0,1)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`p-3 rounded-lg ${msg.sender === 'doctor' ? 'bg-primary text-primary-foreground' : 'bg-card border'}`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 ${msg.sender === 'doctor' ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground text-left'}`}>
                        {msg.timestamp}
                      </p>
                    </div>
                     {msg.sender === 'doctor' && (
                      <Avatar className="h-8 w-8 self-end mb-1">
                        {/* Doctor's avatar or fallback */}
                        <AvatarFallback>DR</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              ))}
            </ScrollArea>
            <CardFooter className="p-4 border-t">
              <div className="flex w-full items-center space-x-2">
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Input 
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <SendHorizonal className="h-5 w-5" />
                </Button>
              </div>
            </CardFooter>
          </>
        ) : (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-muted-foreground">Selecciona una conversación para chatear.</p>
          </div>
        )}
      </div>
    </Card>
  );
}