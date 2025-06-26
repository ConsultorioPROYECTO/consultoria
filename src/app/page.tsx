
/**
 * @fileoverview Landing Page principal para Irina.
 * @version 2.1.0
 * @author Gemini, como diseñador de Vercel
 * @date 2025-06-25
 *
 * @description
 * Página principal minimalista y moderna diseñada con un enfoque mobile-first.
 * Utiliza un diseño de pantalla completa (hero section) para un impacto visual inmediato
 * y un desplazamiento suave hacia las secciones de producto y beneficios.
 * Construido con las mejores prácticas de Next.js y Tailwind CSS.
 */

import Link from 'next/link';
import { ArrowDown, CalendarDays, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { geistFont } from './fonts'; // Usando la fuente de Vercel para consistencia

// Datos para la sección de beneficios
const benefits = [
  {
    icon: CalendarDays,
    title: "Agenda Inteligente",
    description: "Visualiza tu día completo, reduce los huecos y gestiona las citas con un solo clic.",
  },
  {
    icon: User,
    title: "Expedientes Centralizados",
    description: "Accede al historial completo del paciente al instante, desde cualquier dispositivo.",
  },
  {
    icon: MessageSquare,
    title: "Comunicación Fluida",
    description: "Centraliza la comunicación con pacientes y personal, sin perder el contexto.",
  },
];

/**
 * Componente HomePage.
 * Renderiza la landing page principal de la aplicación.
 * @returns {JSX.Element} El elemento JSX de la página de inicio.
 */
export default function HomePage() {
  return (
    <main className={`bg-background text-foreground ${geistFont.className}`}>
      {/* Sección 1: Hero de Pantalla Completa */}
      <section 
        id="hero"
        className="h-dvh min-h-[600px] w-full grid grid-rows-[auto_1fr_auto] p-4 md:p-6"
      >
        {/* Navegación Superior */}
        <nav className="flex justify-end items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Login
          </Link>
          <Button asChild size="sm">
            <Link href="/signup">Registro</Link>
          </Button>
        </nav>

        {/* Contenido Principal del Hero */}
        <div className="flex flex-col items-center justify-center text-center p-4">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter">
            Irina
          </h1>
          <p className="mt-4 max-w-md md:max-w-xl text-muted-foreground md:text-lg">
            Tu asistente inteligente para la gestión de clínicas. Simplifica la agenda, centraliza expedientes y optimiza la comunicación.
          </p>
        </div>

        {/* Botón para Bajar */}
        <div className="flex justify-end items-end">
          <Link 
            href="#producto"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Más información
            <ArrowDown className="h-4 w-4 animate-bounce" />
          </Link>
        </div>
      </section>

      {/* Sección 2: Muestra del Producto */}
      <section 
        id="producto"
        className="py-20 md:py-32 px-4 md:px-6 bg-secondary/50"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Un vistazo a la simplicidad</h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground md:text-lg">
            Diseñamos una interfaz que se siente familiar desde el primer día. Menos clics, más cuidado del paciente.
          </p>
        </div>

        {/* Representación visual de la UI */}
        <div className="mt-12 max-w-4xl mx-auto h-[400px] md:h-[500px] rounded-xl border bg-card p-4 shadow-sm">
          <div className="w-full h-full rounded-md bg-background/50 flex flex-col">
            {/* Header Falso */}
            <div className="h-12 flex-shrink-0 border-b flex items-center px-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted"></div>
                <div className="w-3 h-3 rounded-full bg-muted"></div>
                <div className="w-3 h-3 rounded-full bg-muted"></div>
              </div>
            </div>
            {/* Contenido Falso */}
            <div className="flex-grow p-4 grid grid-cols-3 gap-4">
              <div className="col-span-1 bg-muted/60 rounded-lg"></div>
              <div className="col-span-2 bg-muted/60 rounded-lg"></div>
              <div className="col-span-3 bg-muted/60 rounded-lg"></div>
              <div className="col-span-2 bg-muted/60 rounded-lg"></div>
              <div className="col-span-1 bg-muted/60 rounded-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección 3: Beneficios Clave */}
      <section id="beneficios" className="py-20 md:py-32 px-4 md:px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Diseñado para devolverte el tiempo
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground md:text-lg">
            Nos enfocamos en tres pilares que eliminan la fricción de tu día a día, permitiéndote concentrarte en tus pacientes.
          </p>
        </div>

        <div className="mt-12 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="flex flex-col items-center text-center p-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                <benefit.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold">{benefit.title}</h3>
              <p className="mt-2 text-muted-foreground text-sm">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 md:px-6 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Irina. Todos los derechos reservados.
        </p>
      </footer>
    </main>
  );
}