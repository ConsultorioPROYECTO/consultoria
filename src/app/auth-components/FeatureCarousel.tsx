'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, FileText, MessageSquare, BarChart2 } from 'lucide-react';

const features = [
  {
    icon: CalendarDays,
    title: "Gestión Integral de Citas",
    description: "Organiza y visualiza tu agenda con facilidad, gestionando citas, reprogramaciones y cancelaciones en tiempo real.",
  },
  {
    icon: FileText,
    title: "Historial Clínico Inteligente",
    description: "Accede al historial médico completo de tus pacientes y registra notas de consulta detalladas con asistencia de IA.",
  },
  {
    icon: MessageSquare,
    title: "Comunicación Unificada",
    description: "Comunícate directamente con pacientes y personal a través de un chat integrado y plantillas personalizables.",
  },
  {
    icon: BarChart2,
    title: "Análisis y Rendimiento",
    description: "Obtén una visión clara del rendimiento de tu clínica con métricas clave y sugerencias para optimizar la atención.",
  },
];

export function FeatureCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % features.length);
    }, 5000); // Cambia cada 5 segundos

    return () => clearInterval(interval);
  }, []);

  const currentFeature = features[index];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-muted/30 p-12 text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full text-primary">
            <currentFeature.icon className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {currentFeature.title}
          </h2>
          <p className="mt-2 max-w-md text-base text-muted-foreground">
            {currentFeature.description}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
