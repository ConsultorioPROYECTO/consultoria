"use client";

import { LegalNavbar } from '../_components/LegalNavbar';
import { geistFont } from '../../fonts';
import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';

export default function TermsAndConditionsPage() {
  const termsContent = [
    {
      title: "Última actualización: 26 de junio de 2024",
      content: ""
    },
    {
      title: "Bienvenido a Irina. Al acceder y utilizar nuestros servicios, usted acepta cumplir y estar sujeto a los siguientes términos y condiciones de uso. Por favor, léalos detenidamente.",
      content: ""
    },
    {
      title: "1. Aceptación de los Términos",
      content: "Al utilizar la plataforma de Irina, usted reconoce que ha leído, entendido y aceptado estos Términos y Condiciones, así como nuestra Política de Privacidad. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestros servicios."
    },
    {
      title: "2. Descripción del Servicio",
      content: "Irina es una plataforma de gestión de clínicas diseñada para optimizar la administración de citas, expedientes de pacientes, comunicación interna y otras tareas relacionadas con la operación de un consultorio o centro médico."
    },
    {
      title: "3. Uso de la Plataforma",
      content: "Usted se compromete a utilizar la plataforma de Irina de manera lícita y de acuerdo con estos Términos y Condiciones. No deberá utilizar la plataforma para fines ilegales o no autorizados."
    },
    {
      title: "4. Cuentas de Usuario",
      content: "Para acceder a ciertas funciones de la plataforma, deberá registrar una cuenta. Usted es responsable de mantener la confidencialidad de su información de cuenta y de todas las actividades que ocurran bajo su cuenta."
    },
    {
      title: "5. Privacidad",
      content: "Su privacidad es importante para nosotros. Nuestra Política de Privacidad describe cómo recopilamos, utilizamos y protegemos su información personal. Al utilizar nuestros servicios, usted acepta nuestras prácticas de privacidad."
    },
    {
      title: "6. Modificaciones de los Términos",
      content: "Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación en la plataforma. Es su responsabilidad revisar periódicamente estos términos."
    },
    {
      title: "7. Limitación de Responsabilidad",
      content: "Irina no será responsable de ningún daño directo, indirecto, incidental, especial o consecuente que resulte del uso o la imposibilidad de usar nuestros servicios."
    },
    {
      title: "8. Ley Aplicable",
      content: "Estos Términos y Condiciones se regirán e interpretarán de acuerdo con las leyes del país donde Irina tiene su sede principal, sin tener en cuenta sus disposiciones sobre conflicto de leyes."
    },
    {
      title: "9. Contacto",
      content: "Si tiene alguna pregunta sobre estos Términos y Condiciones, por favor contáctenos a través de los canales de soporte disponibles en nuestra plataforma."
    },
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
    <main className={`bg-background text-foreground ${geistFont.className}`}>
      {/* Navegación Superior Fija */}
      <LegalNavbar showSectionLinks={true} sectionId="terms" sectionName="Términos y Condiciones" />

      {/* Sección de Contenido de Términos y Condiciones */}
      <section 
        id="terms"
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
            Términos y Condiciones
          </motion.h1>

          {termsContent.map((section, index) => (
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
              {index < termsContent.length - 1 && <></>}
            </React.Fragment>
          ))}
        </motion.div>
      </section>
    </main>
  );
}