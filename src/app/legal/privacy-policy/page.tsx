"use client";

import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LegalNavbar } from '../_components/LegalNavbar';
import { geistFont } from '../../fonts';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect } from 'react';

export default function PrivacyPolicyPage() {
  const privacyContent = [
    {
      title: "Última actualización: 26 de junio de 2024",
      content: ""
    },
    {
      title: "Bienvenido a Irina. Esta Política de Privacidad describe cómo recopilamos, utilizamos y protegemos su información personal cuando utiliza nuestra plataforma.",
      content: ""
    },
    {
      title: "1. Información que Recopilamos",
      content: "Recopilamos información que usted nos proporciona directamente, como su nombre, dirección de correo electrónico, número de teléfono y detalles de pago. También recopilamos información automáticamente, como datos de uso y dispositivos."
    },
    {
      title: "2. Cómo Utilizamos su Información",
      content: "Utilizamos su información para proporcionar, mantener y mejorar nuestros servicios, procesar transacciones, comunicarnos con usted, personalizar su experiencia y para fines de seguridad y cumplimiento legal."
    },
    {
      title: "3. Compartir su Información",
      content: "No compartimos su información personal con terceros, excepto cuando sea necesario para proporcionar nuestros servicios (por ejemplo, procesadores de pago), cumplir con la ley o proteger nuestros derechos."
    },
    {
      title: "4. Sus Derechos de Privacidad",
      content: "Usted tiene derecho a acceder, corregir, eliminar o restringir el uso de su información personal. También puede oponerse al procesamiento de sus datos o solicitar la portabilidad de los mismos."
    },
    {
      title: "5. Seguridad de los Datos",
      content: "Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal contra el acceso no autorizado, la alteración, la divulgación o la destrucción."
    },
    {
      title: "6. Cambios en esta Política de Privacidad",
      content: "Podemos actualizar esta Política de Privacidad periódicamente. Le notificaremos cualquier cambio publicando la nueva política en esta página y actualizando la fecha de 'última actualización'."
    },
    {
      title: "7. Contacto",
      content: "Si tiene alguna pregunta sobre esta Política de Privacidad, por favor contáctenos a través de los canales de soporte disponibles en nuestra plataforma."
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
      <LegalNavbar showSectionLinks={true} sectionId="privacy" sectionName="Política de Privacidad" />

      {/* Sección de Contenido de Política de Privacidad */}
      <section 
        id="privacy"
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
            Política de Privacidad
          </motion.h1>

          {privacyContent.map((section, index) => (
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
              {index < privacyContent.length - 1 && <></>}
            </React.Fragment>
          ))}
        </motion.div>
      </section>
    </main>
  );
}