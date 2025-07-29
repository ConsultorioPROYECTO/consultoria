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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setMessageSent(true);
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-background p-4 md:p-8">
      <div className="flex flex-col gap-4 items-center justify-center w-full flex-1 h-full">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-4xl font-bold text-foreground text-center "
        >
          {greeting}
        </motion.h1>
        <AnimatePresence mode="wait">
          {!messageSent && (
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
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {messageSent && (
          <motion.div
            key="chat-input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center gap-4"
          >
            <Input
              placeholder="Escribe tu mensaje..."
              className="w-full h-14 text-lg rounded-full shadow-lg placeholder:text-center"
            />
            <Button
              type="submit"
              size="icon"
              className="p-4 rounded-full"
            >
              <Send className="h-10 w-10" />
              <span className="sr-only">Enviar mensaje</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}