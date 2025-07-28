import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';

export default function AICareView() {
  const [greeting, setGreeting] = useState('');
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

  return (
    <div className="relative flex h-[100dvh] flex-col items-center justify-between overflow-hidden bg-background p-4 md:p-8">
      <div className="flex flex-1 flex-col items-center justify-center w-full">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-4xl font-bold text-foreground mb-8"
        >
          {greeting}
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          <div className="relative flex w-full items-center">
            <Textarea
              placeholder="¿En qué puedo ayudarte hoy?"
              className="min-h-[100px] text-2xl p-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 border-none shadow-lg bg-transparent text-start placeholder:text-start pr-12"
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-4 bottom-4 h-10 w-10 rounded-full"
            >
              <Send className="h-5 w-5" />
              <span className="sr-only">Enviar mensaje</span>
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Placeholder for future chat messages or controls */}
      <div className="h-16"></div>
    </div>
  );
}