import React from 'react';
import { cn } from '@/lib/utils';

interface WaveformLoaderProps {
  className?: string;
}

const WaveformLoader: React.FC<WaveformLoaderProps> = ({ className }) => {
  return (
    
    <svg
      className={cn("animate-subtle-fade-in text-foreground", className)} // Aplicamos la animación de entrada y color del tema
      width="100"
      height="30"
      viewBox="0 0 100 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 0 15 Q 25 5 50 15 T 100 15"
        stroke="currentColor" // Usa el color del texto actual
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="100" // Intentamos un valor diferente
        strokeDashoffset="0" // Desplazamiento inicial del guion
        className="animate-[wave-animation_2s_linear_infinite]" // Aplicamos la animación
      />
    </svg>
  );
};

export default WaveformLoader;