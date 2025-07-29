import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';

export default function AICareView() {
  const [greeting, setGreeting] = useState('');
  const [messageSent, setMessageSent] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [currentUserMessage, setCurrentUserMessage] = useState('');
  const [currentAIMessage, setCurrentAIMessage] = useState('');
  const [showAIResponse, setShowAIResponse] = useState(false);
  const [showUserMessage, setShowUserMessage] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      let timeOfDay = '';
      if (hour < 12) timeOfDay = 'Buenos días';
      else if (hour < 19) timeOfDay = 'Buenas tardes';
      else timeOfDay = 'Buenas noches';

      const userName = user?.displayName ? `, ${user.displayName.split(' ')[0]}` : '';
      return `${timeOfDay}${userName}`;
    };
    setGreeting(getGreeting());
  }, [user]);

  const generateAIResponse = (userMessage: string): string => {
    const responses = {
      greeting: [
        '¡Hola! Soy AI Care, tu asistente médico virtual. ¿En qué puedo ayudarte hoy?',
        'Bienvenido/a. Estoy aquí para asistirte con cualquier consulta médica o administrativa.',
        'Hola, soy AI Care. ¿Cómo puedo apoyarte en tu atención médica hoy?'
      ],
      symptoms: [
        'Entiendo tu preocupación. Para brindarte la mejor asistencia, ¿podrías describir más detalles sobre tus síntomas?',
        'Gracias por compartir esa información. Te recomiendo agendar una cita con uno de nuestros especialistas para una evaluación completa.',
        'Es importante que un profesional evalúe tus síntomas. ¿Te gustaría que te ayude a programar una consulta?'
      ],
      appointment: [
        'Por supuesto, puedo ayudarte a agendar una cita. ¿Tienes alguna preferencia de fecha o especialista?',
        'Perfecto, te ayudo con tu cita médica. ¿Qué tipo de consulta necesitas?',
        'Claro, vamos a programar tu cita. ¿Es para una consulta general o necesitas un especialista específico?'
      ],
      general: [
        'Gracias por tu consulta. Estoy aquí para ayudarte con cualquier pregunta sobre nuestros servicios médicos.',
        'Entiendo. ¿Hay algo específico en lo que pueda asistirte mejor?',
        'Perfecto. ¿Te gustaría que te proporcione más información sobre algún servicio en particular?'
      ]
    };

    const message = userMessage.toLowerCase();
    
    if (message.includes('hola') || message.includes('buenos') || message.includes('buenas')) {
      return responses.greeting[Math.floor(Math.random() * responses.greeting.length)];
    } else if (message.includes('dolor') || message.includes('síntoma') || message.includes('malestar') || message.includes('enferm')) {
      return responses.symptoms[Math.floor(Math.random() * responses.symptoms.length)];
    } else if (message.includes('cita') || message.includes('consulta') || message.includes('agendar') || message.includes('turno')) {
      return responses.appointment[Math.floor(Math.random() * responses.appointment.length)];
    } else {
      return responses.general[Math.floor(Math.random() * responses.general.length)];
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialMessage.trim()) {
      setCurrentUserMessage(initialMessage.trim());
      setMessageSent(true);
      setInitialMessage('');
      setShowAIResponse(false);
      
      // Mostrar mensaje del usuario con delay
      setTimeout(() => {
        setShowUserMessage(true);
      }, 200);
      
      // Simular respuesta de AI después de un breve delay
      setTimeout(() => {
        setCurrentAIMessage(generateAIResponse(initialMessage.trim()));
        setShowAIResponse(true);
      }, 1800);
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      const messageToSend = chatMessage.trim();
      
      // Fade out de mensajes anteriores
      setShowAIResponse(false);
      setShowUserMessage(false);
      
      // Esperar a que termine la animación de salida antes de actualizar el contenido
      setTimeout(() => {
        setCurrentUserMessage(messageToSend);
        setChatMessage('');
        
        // Fade in del nuevo mensaje del usuario
        setTimeout(() => {
          setShowUserMessage(true);
        }, 50);
        
        // Simular respuesta de AI después de un breve delay
        setTimeout(() => {
          setCurrentAIMessage(generateAIResponse(messageToSend));
          setShowAIResponse(true);
        }, 1400);
      }, 500);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-background p-4 md:p-8">
      <AnimatePresence mode="wait">
        {!messageSent ? (
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
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  placeholder="¿En qué puedo ayudarte hoy?"
                  className="min-h-[100px] text-2xl md:text-2xl p-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 border-none shadow-lg bg-transparent text-center placeholder:text-center"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-4 bottom-4 h-10 w-10 rounded-full"
                >
                  <Send className="h-5 w-5" />
                  <span className="sr-only">Enviar mensaje</span>
                </Button>
              </form>
            </motion.div>
          </div>
        ) : (
           <div className="flex flex-col flex-1 h-full justify-center">
             <div className="flex-1 flex flex-col justify-start p-4 space-y-4">
                {/* Mensaje del usuario */}
                <AnimatePresence>
                  {showUserMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="flex justify-end"
                    >
                      <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-md ml-auto shadow-lg">
                        <p className="text-sm">{currentUserMessage}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Respuesta de AI Care */}
                <AnimatePresence>
                  {showAIResponse && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-muted/50 text-muted-foreground rounded-lg p-3 max-w-md mr-auto shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <motion.div 
                            className="w-2 h-2 bg-green-500 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          ></motion.div>
                          <span className="text-xs font-medium">AI Care</span>
                        </div>
                        <motion.p 
                          className="text-sm"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                        >
                          {currentAIMessage}
                        </motion.p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
           </div>
         )}
      </AnimatePresence>

      {messageSent && (
         <motion.div
           key="chat-input"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.3, delay: 0.2 }}
           className="flex justify-center gap-4"
         >
           <form onSubmit={handleSendChatMessage} className="flex w-full gap-4">
             <Input
               value={chatMessage}
               onChange={(e) => setChatMessage(e.target.value)}
               placeholder="Escribe tu mensaje..."
               className="w-full h-12 text-sm rounded-full shadow-sm placeholder:text-center"
             />
             <Button
               type="submit"
               size="icon"
               className="h-12 w-12 rounded-full"
             >
               <Send className="h-4 w-4" />
               <span className="sr-only">Enviar mensaje</span>
             </Button>
           </form>
         </motion.div>
       )}
    </div>
  );
}