"use client";

import { LegalNavbar } from '../_components/LegalNavbar';
import { motion } from 'framer-motion';
import React from 'react';

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
  




  return (
    <main className="bg-background text-foreground">
      {/* Navegación Superior Fija */}
      <LegalNavbar showSectionLinks={true} sectionName="Política de Cookies" />

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