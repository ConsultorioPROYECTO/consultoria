import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Tipos para la API
interface Message {
  id: number;
  type: 'human' | 'ai';
  content: string;
  timestamp?: string;
}



export default function AICareView() {
  const [greeting, setGreeting] = useState<string>('');
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { user } = useAuth();

  // Cargar historial de conversación desde la API
  const loadChatHistory = useCallback(async (sessionId: string) => {
    setIsLoadingHistory(true);
    setError(null);
    
    try {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      const response = await fetch(`/api/ai-care/chat?session_id=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al cargar el historial');
      }

      const data = await response.json();
      setMessages(data.data.messages || []);
    } catch (error) {
      console.error('Error cargando historial:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar el historial');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      const userName = user?.displayName?.split(' ') || [];
      const formattedNames = userName.slice(0, 2).map(name => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  });

      const displayGreetingName = formattedNames.length > 0 ? formattedNames.join(' ') : 'usuario';
      
      if (hour < 12) {
        return `¡Buenos días, ${displayGreetingName}!`;
      } else if (hour < 18) {
        return `¡Buenas tardes, ${displayGreetingName}!`;
      } else {
        return `¡Buenas noches, ${displayGreetingName}!`;
      }
    };
    setGreeting(getGreeting());

    // Cargar session_id desde localStorage si existe
    const savedSessionId = localStorage.getItem('ai-care-session-id');
    if (savedSessionId) {
      setSessionId(savedSessionId);
      loadChatHistory(savedSessionId);
    }
  }, [user, loadChatHistory]);

  // Enviar mensaje a la API
  const sendMessage = async (message: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      const payload: { message: string; sessionId?: string } = { message };
      if (sessionId) {
        payload.sessionId = sessionId;
      }

      const response = await fetch('/api/ai-care/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al enviar el mensaje');
      }

      const data = await response.json();
      const newSessionId = data.data.sessionId;
      
      // Guardar session_id si es nuevo
      if (!sessionId && newSessionId) {
        setSessionId(newSessionId);
        localStorage.setItem('ai-care-session-id', newSessionId);
      }

      // Agregar mensaje del usuario y respuesta de AI a la lista
      const userMessage: Message = {
        id: Date.now(),
        type: 'human',
        content: message,
        timestamp: new Date().toISOString()
      };

      const aiMessage: Message = {
        id: Date.now() + 1,
        type: 'ai',
        content: data.data.response,
        timestamp: data.data.timestamp
      };

      setMessages(prev => [...prev, userMessage, aiMessage]);
      
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      setError(error instanceof Error ? error.message : 'Error al enviar el mensaje');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMessage.trim() && !isLoading) {
      const messageToSend = currentMessage.trim();
      setCurrentMessage('');
      await sendMessage(messageToSend);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem('ai-care-session-id');
    setError(null);
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-background">
      {/* Error Alert */}
      {error && (
        <Alert className="mb-4 border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AnimatePresence mode="wait">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-4 items-center justify-center w-full flex-1 h-full">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-4xl font-bold text-foreground text-center"
            >
              {greeting}
            </motion.h1>
            <motion.div
              key="initial-input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-2xl"
            >
              <form onSubmit={handleSendMessage} className="relative flex w-full items-center">
                <Textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="¿En qué puedo ayudarte hoy?"
                  disabled={isLoading}
                  className="min-h-[100px] text-2xl md:text-2xl p-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-lg bg-transparent text-center placeholder:text-center"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !currentMessage.trim()}
                  className="absolute right-4 bottom-4 h-10 w-10 rounded-full"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  <span className="sr-only">Enviar mensaje</span>
                </Button>
              </form>
            </motion.div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 h-full">
            {/* Loading History */}
            {isLoadingHistory && (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Cargando historial...</span>
              </div>
            )}
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`flex ${message.type === 'human' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`rounded-lg p-3 max-w-md shadow-lg ${
                      message.type === 'human' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted/50 text-muted-foreground'
                    }`}>
                      {message.type === 'ai' && (
                        <div className="flex items-center gap-2 mb-2">
                          <motion.div 
                            className="w-2 h-2 bg-green-500 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                          <span className="text-xs font-medium">AI Care</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Loading indicator for new messages */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-muted/50 text-muted-foreground rounded-lg p-3 max-w-md shadow-lg">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">AI Care está escribiendo...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Input - Always visible when there are messages */}
      {messages.length > 0 && (
        <motion.div
          key="chat-input"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="p-4 border-t"
        >
          <form onSubmit={handleSendMessage} className="flex w-full gap-4">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Escribe tu mensaje..."
              disabled={isLoading}
              className="flex-1 h-12 text-sm rounded-full shadow-sm"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !currentMessage.trim()}
              className="h-12 w-12 rounded-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="sr-only">Enviar mensaje</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={clearChat}
              className="h-12 px-4 rounded-full"
            >
              Nuevo Chat
            </Button>
          </form>
        </motion.div>
      )}
    </div>
  );
}