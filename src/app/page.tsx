
'use client';

/**
 * @fileoverview Landing Page principal para Irina.
 * @version 2.1.0
 * @author 
 * @date 2025-06-25
 *
 * @description
 * Página principal minimalista y moderna diseñada con un enfoque mobile-first.
 * Utiliza un diseño de pantalla completa (hero section) para un impacto visual inmediato
 * y un desplazamiento suave hacia las secciones de producto y beneficios.
 * Construido con las mejores prácticas de Next.js y Tailwind CSS.
 */

import Link from 'next/link';
import { ArrowDown, CalendarDays, User, MessageSquare, FileText, BarChart2, Moon, Sun, Laptop, Menu, X, ArrowUpRight, Mic, Building } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { geistFont } from './fonts'; // Usando la fuente de Vercel para consistencia
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import Image from 'next/image';
import { ContactModal } from './components/contact-modal';

// Datos para la sección de beneficios
const benefits = [
  {
    icon: CalendarDays,
    title: "Optimización del Tiempo",
    description: "Recupera horas valiosas cada semana al automatizar tareas repetitivas y simplificar la gestión diaria de tu clínica.",
  },
  {
    icon: User,
    title: "Decisiones Informadas",
    description: "Ten toda la información del paciente al alcance de tu mano, en cualquier momento y lugar, para diagnósticos precisos y tratamientos efectivos.",
  },
  {
    icon: MessageSquare,
    title: "Conexión sin Esfuerzo",
    description: "Mejora la relación con tus pacientes y la coordinación interna con herramientas de comunicación integradas y eficientes.",
  },
];

/**
 * Componente HomePage.
 * Renderiza la landing page principal de la aplicación.
 * @returns {JSX.Element} El elemento JSX de la página de inicio.
 */
export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMenuOpen]);

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    // Cierra el menú si está en vista móvil
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  return (
    <main className={`bg-background text-foreground ${geistFont.className}`}>
      {/* Navegación Superior Fija */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center gap-4 px-3 md:px-3 pt-3 md:pt-3">
        {/* Logo o Título */}
        <Link href="/" className="text-xl font-bold z-50 selection:bg-primary selection:text-primary-foreground">
          Irina 
        </Link>
        
        {/* Enlaces Centrales para Escritorio */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-6">
            <a href="#caracteristicas" onClick={(e) => handleScroll(e, 'caracteristicas')} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4" /> Características
            </a>
            <a href="#faq" onClick={(e) => handleScroll(e, 'faq')} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4" /> FAQ
            </a>
        </div>

        {/* Botones de Auth para Escritorio */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Iniciar sesión
          </Link>
          <Button asChild size="sm" className="selection:bg-secondary selection:text-primary">
            <Link href="/signup">Registro</Link>
          </Button>
        </div>

        {/* Botón de Menú para Móvil */}
        <div className="md:hidden z-50">
          <Button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            variant="ghost" 
            size="icon"
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={isMenuOpen ? "x" : "menu"}
                initial={{ rotate: 45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -45, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </motion.div>
            </AnimatePresence>
          </Button>
        </div>
      </nav>

      {/* Sección 1: Hero de Pantalla Completa */}
      <section 
        id="hero"
        className="relative h-dvh min-h-[600px] w-full grid grid-rows-[1fr_auto] pt-20 p-4 md:pt-24 md:px-6 md:pb-64 overflow-hidden"
      >
        {/* Drawer para Móvil */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex flex-col items-end justify-end p-8"
            >
              <div className="flex flex-col items-end gap-8 text-right">
                <a href="#caracteristicas" className="text-2xl font-medium flex items-center gap-2" onClick={(e) => handleScroll(e, 'caracteristicas')}>
                  <ArrowUpRight className="h-6 w-6" /> Características
                </a>
                <a href="#faq" className="text-2xl font-medium flex items-center gap-2" onClick={(e) => handleScroll(e, 'faq')}>
                  <ArrowUpRight className="h-6 w-6" /> FAQ
                </a>
                <Link href="/login" className="text-2xl font-medium" onClick={() => setIsMenuOpen(false)}>
                  Iniciar sesión
                </Link>
                <Link href="/signup" className="text-2xl font-medium" onClick={() => setIsMenuOpen(false)}>
                  Registro
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contenido Principal del Hero */}
        <motion.div 
          className="flex flex-col gap-4 items-start justify-center text-start p-4"
          initial="hidden"
          animate="show"
          variants={{ 
            hidden: { opacity: 0 }, 
            show: { opacity: 1, transition: { staggerChildren: 0.2 } } 
          }}
        >
          <motion.h1 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-base tracking-tighter selection:bg-primary selection:text-primary-foreground leading-tight"
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          >
            La Revolución en tu Agenda<br />Diseñado para redefinir tu Gestión
          </motion.h1>
          <motion.div 
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          >
            <Badge 
              variant="outline"
              className="px-3 py-1 bg-gradient-to-r from-primary/8 to-secondary/8 rounded-full border border-primary/15 text-xs sm:text-sm md:text-base font-medium text-primary/80 tracking-wide uppercase text-start whitespace-normal break-words leading-none"
            >
              Ideal para tu consultorio • centro médico • clínica
            </Badge>
          </motion.div>
          <motion.p 
            className="max-w-md md:max-w-xl text-muted-foreground md:text-lg"
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          >
            Tu asistente inteligente para la gestión de clínicas. Simplifica la agenda, centraliza expedientes y optimiza la comunicación.
          </motion.p>
          <motion.div 
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          >
            <ContactModal>
              <Button size="lg" className="selection:bg-secondary selection:text-primary">
                Solicitar Acceso
                <ArrowUpRight className='h-4 w-4'/>
              </Button>
            </ContactModal>
          </motion.div>
        </motion.div>

        {/* Botón para Bajar */}
        <motion.button
          onClick={() => {
            document.getElementById('producto')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          Más información
          <ArrowDown className="h-4 w-4 animate-bounce" />
        </motion.button>

        {/* Mockup de la aplicación (visible solo en desktop, cortado) */}
        <motion.div
          className="hidden md:block absolute bottom-[-200px] right-[-50px] w-[80%] max-w-6xl aspect-[16/9] bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg shadow-xl border border-primary/30 z-0"
          style={{ transform: 'rotateX(50deg) rotateZ(-25deg) translateY(20px)' }}
          initial={{ opacity: 0, y: 50, rotateX: 0, rotateZ: 0 }}
          animate={{ opacity: 1, y: 0, rotateX: 50, rotateZ: -25 }}
          transition={{ delay: 0.8, duration: 0.7, ease: "easeOut" }}
        >
          {/* Contenido del Mockup - Placeholder */}
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-semibold">
            <Image
              src={"/MedDashboardDark.webp"}
              alt="Mockup de la aplicación"
              width={1000}
              height={1000}
              className="w-full h-full p-3 rounded-4xl object-cover"
            />
          </div>
        </motion.div>

        {/* Mockup de la aplicación (visible solo en móvil, 3D flat y rotado) */}
        <motion.div
          className="md:hidden absolute bottom-[-100px] left-1/2 -translate-x-1/2 w-[150%] aspect-[16/9] bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg shadow-xl border border-primary/30 z-0"
          style={{ transform: 'translateX(-50%) rotateX(45deg) rotateZ(-15deg) translateY(20px)' }}
          initial={{ opacity: 0, y: 50, rotateX: 0, rotateZ: 0 }}
          animate={{ opacity: 1, y: 0, rotateX: 45, rotateZ: -15 }}
          transition={{ delay: 0.8, duration: 0.7, ease: "easeOut" }}
        >
          {/* Contenido del Mockup - Placeholder */}
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-semibold">
            <Image
              src={"/MedDashboardDark.webp"}
              alt="Mockup de la aplicación"
              width={1000}
              height={1000}
              className="w-full h-full p-3 rounded-4xl object-cover"
            />
          </div>
          {/* Degradado inferior para fusionarse con el fondo */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent"></div>
        </motion.div>
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

        <div className="mt-12 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          {[ /* Placeholder para tus mockups */
            {
              icon: CalendarDays,
              title: "Gestión Integral de Citas",
              description: "Organiza y visualiza tu agenda diaria, semanal y mensual. Gestiona citas, reprogramaciones, cancelaciones y listas de espera con facilidad, y recibe notificaciones en tiempo real sobre cambios.",
            },
            {
              icon: FileText,
              title: "Historial Clínico",
              description: "Accede al historial médico completo de tus pacientes, registra notas de consulta detalladas y adjunta documentos de forma segura.",
            },
            {
              icon: Mic,
              title: "AI-Care",
              description: "Utiliza inteligencia artificial para convertir voz a texto en consultas, obtén sugerencias inteligentes de diagnóstico y automatiza la documentación clínica.",
            },
            {
              icon: BarChart2,
              title: "Análisis y Rendimiento de Clínica",
              description: "Obtén una visión clara del rendimiento de tu clínica con métricas financieras, análisis de carga de trabajo, seguimiento de la IA, y sugerencias inteligentes para optimizar la atención al paciente.",
            },
            {
              icon: Building,
              title: "Gestión Unificada de Sedes",
              description: "Unifique el control y gestión de todas sus sedes en un solo sitio.",
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

      {/* Sección 4: Preguntas Frecuentes (FAQ) */}
      <section
        id="faq"
        className="py-20 md:py-32 px-4 md:px-6 bg-background"
      >
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Preguntas Frecuentes
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground md:text-lg">
            Encuentra respuestas a las preguntas más comunes sobre Irina.
          </p>
        </div>

        <div className="mt-12 max-w-3xl mx-auto space-y-4">
          {[ /* Datos de las FAQs */
            {
              question: "¿Qué es Irina y para quién está diseñada?",
              answer: "Irina es una plataforma inteligente de gestión de clínicas diseñada para médicos, asistentes y administradores que buscan optimizar sus operaciones diarias, desde la agenda de citas hasta la comunicación con pacientes.",
            },
            {
              question: "¿Cómo ayuda Irina a optimizar la gestión de citas?",
              answer: "Irina centraliza la agenda, permite la gestión de citas, reprogramaciones y cancelaciones con facilidad, y envía recordatorios automáticos, reduciendo ausencias y optimizando el tiempo del personal.",
            },
            {
              question: "¿Es seguro el historial clínico de mis pacientes en Irina?",
              answer: "Sí, la seguridad de los datos es nuestra máxima prioridad. Irina utiliza cifrado avanzado y cumple con las normativas de privacidad de datos para proteger la información sensible de tus pacientes.",
            },
            {
              question: "¿Puedo comunicarme con mis pacientes directamente desde la plataforma?",
              answer: "Absolutamente. Irina integra herramientas de mensajería directa, plantillas de comunicación personalizables y seguimiento de mensajes automatizados para una comunicación fluida y eficiente.",
            },
            {
              question: "¿Irina ofrece análisis sobre el rendimiento de mi clínica?",
              answer: "Sí, Irina proporciona métricas detalladas sobre el rendimiento financiero, la carga de trabajo del personal, la efectividad de la IA y sugerencias inteligentes para ayudarte a tomar decisiones informadas y mejorar la eficiencia.",
            },
          ].map((item, index) => (
            <motion.details
              key={index}
              className="group rounded-lg border bg-card p-4 shadow-sm transition-all duration-300 ease-in-out open:bg-card-foreground/5"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-foreground group-open:text-primary">
                {item.question}
                <svg
                  className="h-5 w-5 transform transition-transform duration-300 group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </summary>
              <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
                {item.answer}
              </p>
            </motion.details>
          ))}
        </div>
      </section>

      {/* Sección 5: Call to Action Final */}
      <section
        id="cta"
        className="py-20 md:py-32 px-4 md:px-6 bg-secondary/50 text-foreground text-center"
      >
        <motion.div
          className="flex flex-col gap-2 items-center justify-center text-center"
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
            className="max-w-2xl text-lg"
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
            <ContactModal>
              <Button size="lg" className="selection:bg-secondary selection:text-primary">
                Solicitar Acceso
                <ArrowUpRight className='h-4 w-4'/>
              </Button>
            </ContactModal>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-background py-12 px-4 md:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-left">

          {/* Columna 2: Producto */} 
          <div className="items-start font-light leading-8">
            <span className="text-lg text-foreground">Producto</span>
            <ul className="text-muted-foreground">
              <li><Link href="#caracteristicas" onClick={(e) => handleScroll(e, 'caracteristicas')} className="hover:text-primary transition-colors">Características</Link></li>
              <li><Link href="#beneficios" onClick={(e) => handleScroll(e, 'beneficios')} className="hover:text-primary transition-colors">Beneficios</Link></li>
            </ul>
          </div>

          {/* Columna 3: Empresa */} 
          <div className="items-start font-light leading-8">
            <span className="text-lg text-foreground">Empresa</span>
            <ul className="text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary transition-colors">Sobre Nosotros</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contacto</Link></li>
              <li><Link href="/careers" className="hover:text-primary transition-colors">Carreras</Link></li>
            </ul>
          </div>

          {/* Columna 4: Legal */}
          <div className="items-start font-light leading-8">
            <span className="text-lg text-foreground">Legal</span>
            <ul className="text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Política de Privacidad</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Términos de Servicio</Link></li>
            </ul>
          </div>

          {/* Columna 4 (real): Contacto */}
          <div className="items-start font-light leading-8">
            <span className="text-lg text-foreground">Contacto</span>
            <ul className="text-muted-foreground">
              <li><Link href="/contact" className="hover:text-primary transition-colors">Email</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Teléfono</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Soporte</Link></li>
            </ul>
          </div>

          {/* Nueva Fila para el Selector de Tema */}
          <div className="col-span-full flex justify-end md:justify-center">
            <div className="flex flex-col items-end">
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <ThemeSwitcher />
              </ThemeProvider>
            </div>
          </div>

          {/* Nueva Fila para Irina (Logo y Derechos) */}


            <div className="relative col-span-full flex flex-col items-end md:items-center overflow-hidden py-9">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10rem] font-extrabold text-foreground opacity-8 select-none">Irina</span>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2 selection:bg-primary selection:text-primary-foreground z-10">Irina</h3>
              <p className="text-sm text-muted-foreground z-10">
                © {new Date().getFullYear()} Irina. Todos los derechos reservados.
              </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Determine if current theme is dark mode
  const isDarkMode = theme?.endsWith('-dark');

  const handleThemeChange = (value: string) => {
    if (value === 'system') {
      setTheme('system');
    } else if (value === 'light') {
      setTheme('theme-vercel');
    } else if (value === 'dark') {
      setTheme('theme-vercel-dark');
    }
  };

  // Determine active tab based on current theme
  const getActiveTab = () => {
    if (theme === 'system') return 'system';
    if (theme?.includes('vercel')) {
      return isDarkMode ? 'dark' : 'light';
    }
    return 'system';
  };

  return (
    <Tabs defaultValue={getActiveTab()} onValueChange={handleThemeChange} className="w-[200px]">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="light" title="Cambiar a tema claro">
          <Sun className="h-4 w-4" />
          <span className="sr-only">Claro</span>
        </TabsTrigger>
        <TabsTrigger value="dark" title="Cambiar a tema oscuro">
          <Moon className="h-4 w-4" />
          <span className="sr-only">Oscuro</span>
        </TabsTrigger>
        <TabsTrigger value="system" title="Cambiar a tema del sistema">
          <Laptop className="h-4 w-4" />
          <span className="sr-only">Sistema</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}