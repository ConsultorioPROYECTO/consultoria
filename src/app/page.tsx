
'use client';

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
import { ArrowDown, CalendarDays, User, MessageSquare, FileText, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { geistFont } from './fonts'; // Usando la fuente de Vercel para consistencia
import { motion } from 'framer-motion';

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
          <motion.button
            onClick={() => {
              document.getElementById('producto')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Más información
            <ArrowDown className="h-4 w-4 animate-bounce" />
          </motion.button>
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

      {/* Sección 2.5: Características Detalladas */}
      <section
        id="caracteristicas"
        className="py-20 md:py-32 px-4 md:px-6 bg-background"
      >
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Funcionalidades que Impulsan tu Práctica
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground md:text-lg">
            Irina está diseñada con herramientas potentes y fáciles de usar para cada aspecto de tu clínica.
          </p>
        </div>

        <div className="mt-12 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {[ /* Placeholder para tus mockups */
            {
              icon: CalendarDays,
              title: "Gestión Integral de Citas",
              description: "Organiza y visualiza tu agenda diaria, semanal y mensual. Gestiona citas, reprogramaciones, cancelaciones y listas de espera con facilidad, y recibe notificaciones en tiempo real sobre cambios.",
            },
            {
              icon: FileText,
              title: "Historial Clínico y AI-Care",
              description: "Accede al historial médico completo de tus pacientes, registra notas de consulta detalladas (incluyendo voz a texto con AI-Care) y adjunta documentos de forma segura.",
            },
            {
              icon: MessageSquare,
              title: "Comunicación Unificada",
              description: "Comunícate directamente con pacientes y personal vía chat, gestiona mensajes automatizados, utiliza plantillas personalizables y centraliza las solicitudes que requieren intervención humana.",
            },
            {
              icon: BarChart2,
              title: "Análisis y Rendimiento de Clínica",
              description: "Obtén una visión clara del rendimiento de tu clínica con métricas financieras, análisis de carga de trabajo, seguimiento de la IA, y sugerencias inteligentes para optimizar la atención al paciente.",
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              className="flex flex-col items-center text-center p-4 shadow-sm"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                <feature.icon className="w-8 h-8" />
              </div>
              <div className="flex-grow flex flex-col justify-start">
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="mt-2 text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
              {/* Aquí puedes agregar tu mockup */}
              <div className="mt-4 w-full aspect-video bg-muted/50 rounded-lg flex items-center justify-center text-muted-foreground text-xs">
                [Mockup con relación de aspecto 16:9]
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Sección 3: Beneficios Clave */}
      <section id="beneficios" className="py-20 md:py-32 px-4 md:px-6 bg-secondary/50">
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

      {/* Sección 4: Call to Action Final */}
      <section
        id="cta"
        className="py-20 md:py-32 px-4 md:px-6 bg-primary text-primary-foreground text-center"
      >
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.2,
              },
            },
          }}
        >
          <motion.h2
            className="text-3xl md:text-4xl font-bold tracking-tight"
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
          >
            ¿Listo para transformar tu clínica?
          </motion.h2>
          <motion.p
            className="mt-4 max-w-2xl mx-auto text-lg"
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
          >
            Solicita acceso a la beta de Irina y descubre cómo podemos simplificar tu día a día con una gestión inteligente y eficiente.
          </motion.p>
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
          >
            <Button asChild size="lg" className="mt-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              <Link href="/signup">Solicitar Acceso Beta</Link>
            </Button>
          </motion.div>
        </motion.div>
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