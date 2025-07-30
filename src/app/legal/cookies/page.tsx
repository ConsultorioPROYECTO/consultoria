"use client";

import Link from 'next/link';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { geistFont } from '../../fonts';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect } from 'react';

export default function CookiesPage() {
  const cookiesContent = [
    {
      title: "Última actualización: 26 de junio de 2024",
      content: ""
    },
    {
      title: "Bienvenido a Irina. Esta política de cookies explica cómo utilizamos las cookies y tecnologías similares en nuestra plataforma.",
      content: ""
    },
    {
      title: "1. ¿Qué son las cookies?",
      content: "Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web. Se utilizan ampliamente para hacer que los sitios web funcionen de manera más eficiente, así como para proporcionar información a los propietarios del sitio."
    },
    {
      title: "2. Tipos de cookies que utilizamos",
      content: "Utilizamos cookies esenciales, de rendimiento, funcionales y de publicidad para mejorar su experiencia en nuestra plataforma."
    },
    {
      title: "3. Cómo gestionar las cookies",
      content: "Puede controlar y/o eliminar las cookies como desee. Para obtener más información, consulte aboutcookies.org. Puede eliminar todas las cookies que ya están en su computadora y puede configurar la mayoría de los navegadores para evitar que se coloquen."
    },
    {
      title: "4. Cambios en nuestra política de cookies",
      content: "Nos reservamos el derecho de modificar esta política de cookies en cualquier momento. Cualquier cambio en esta política de cookies será publicado en esta página."
    },
    {
      title: "5. Contacto",
      content: "Si tiene alguna pregunta sobre nuestra política de cookies, por favor contáctenos a través de los canales de soporte disponibles en nuestra plataforma."
    }
  ];
  
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
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  return (
    <main className="bg-background text-foreground">
      {/* Navegación Superior Fija */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center gap-4 px-3 md:px-3 h-16">
        {/* Logo o Título */}
        <Link href="/" className="text-xl font-bold z-50 selection:bg-primary selection:text-primary-foreground">
          Irina
        </Link>
        
        {/* Enlaces Centrales para Escritorio */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-6">
            <a href="#" onClick={(e) => handleScroll(e, 'cookies')} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4" /> Política de Cookies
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

      {/* Sección de Contenido de Cookies */}
      <section 
        id="cookies"
        className="relative min-h-screen w-full pt-20 p-4 md:pt-24 md:px-6 overflow-hidden flex flex-col items-center justify-center text-center"
      >
        <motion.div 
          className="flex flex-col gap-4 p-4 max-w-3xl"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 }, 
            show: { opacity: 1, transition: { staggerChildren: 0.2 } } 
          }}
        >
          <motion.h1 
            className="text-4xl sm:text-4xl md:text-5xl lg:text-6xl font-base tracking-tighter selection:bg-primary selection:text-primary-foreground leading-tight"
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          >
            Política de Cookies
          </motion.h1>

          {cookiesContent.map((section, index) => (
            <React.Fragment key={index}>
              {index === 0 && (
                <motion.p
                  className="text-sm text-muted-foreground"
                  variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                >
                  {section.title}
                </motion.p>
              )}
              {index === 1 && (
                <motion.p
                  className="text-muted-foreground md:text-lg text-left"
                  variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                >
                  {section.title}
                </motion.p>
              )}
              {index > 1 && (
                <>
                  <motion.h3
                    className="text-xl font-semibold text-left"
                    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                  >
                    {section.title}
                  </motion.h3>
                  <motion.p
                    className="text-muted-foreground md:text-lg text-left"
                    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                  >
                    {section.content}
                  </motion.p>
                </>
              )}
              {index < cookiesContent.length - 1 && <></>}
            </React.Fragment>
          ))}
        </motion.div>
      </section>
    </main>
  );
}