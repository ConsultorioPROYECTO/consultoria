"use client";

import { LegalNavbar } from '../_components/LegalNavbar';
import { motion } from 'framer-motion';
import React from 'react';

type CookieContent = {
  title: string;
  content: string;
  number?: number;
};

export default function CookiesPage() {
  const cookiesContent: CookieContent[] = [
    {
      title: "Última actualización: 26 de junio de 2024",
      content: ""
    },
    {
      number: 1,
      title: "¿Qué son las cookies?",
      content: "Las cookies son archivos de texto que se almacenan en su navegador o dispositivo cuando visita sitios web o utiliza aplicaciones. Su objetivo es recolectar información relacionada con su actividad de navegación para facilitar su experiencia de usuario, permitir funcionalidades específicas y realizar análisis estadísticos."
    },
    {
      number: 2,
      title: "Tipos de cookies que utilizamos",
      content: "Utilizamos cookies esenciales, de rendimiento, funcionales y de publicidad para mejorar su experiencia en nuestra plataforma."
    },
    {
      number: 3,
      title: "Cómo gestionar las cookies",
      content: "Puede controlar y/o eliminar las cookies como desee. Para obtener más información, consulte aboutcookies.org. Puede eliminar todas las cookies que ya están en su computadora y puede configurar la mayoría de los navegadores para evitar que se coloquen."
    },
    {
      number: 4,
      title: "Cambios en nuestra política de cookies",
      content: ""
    },
    {
      number: 5,
      title: "Contacto",
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
            className="text-4xl md:text-5xl lg:text-6xl font-base tracking-tight selection:bg-primary selection:text-primary-foreground leading-tight"
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          >
            Política de Cookies
          </motion.h1>



          {cookiesContent.map((section, index) => (
            <React.Fragment key={index}>
              {index === 0 && (
                <>
                  <motion.p
                    className="text-sm text-muted-foreground"
                    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                  >
                    {section.title}
                  </motion.p>
                  <motion.p
                    className="text-muted-foreground md:text-lg text-left"
                    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                  >
                    Bienvenido(a) a <strong>IRINA</strong>. Esta Política de Cookies describe el uso que hacemos de cookies y tecnologías similares cuando usted accede o utiliza nuestra plataforma, conforme a la normativa colombiana de protección de datos personales.
                  </motion.p>
                  <motion.div className='border-b border-muted-foreground' variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}/>
                </>
              )}
              {index > 0 && (
                <>
                  <motion.div 
                    className="flex flex-col text-left"
                    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                  >
                    {section.number && (
                      <span className="text-xl text-muted-foreground font-semibold">{section.number}.</span>
                    )}
                    <h3 className="text-xl font-semibold">{section.title}</h3>
                  </motion.div>
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