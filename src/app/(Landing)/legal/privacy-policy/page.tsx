"use client";

import { LegalNavbar } from '../_components/LegalNavbar';

import { motion } from 'framer-motion';
import React from 'react';

type CookieContent = {
  title: string;
  content: string;
  number?: number;
};

export default function PrivacyPolicyPage() {
  const privacyContent: CookieContent[] = [
    {
      title: "Última actualización: 26 de junio de 2024",
      content: ""
    },
    {
      number: 1,
      title: "Información que Recopilamos",
      content: "Recopilamos información que usted nos proporciona directamente, como su nombre, dirección de correo electrónico, número de teléfono y detalles de pago. También recopilamos información automáticamente, como datos de uso y dispositivos."
    },
    {
      number: 2,
      title: "Cómo Utilizamos su Información",
      content: "Utilizamos su información para proporcionar, mantener y mejorar nuestros servicios, procesar transacciones, comunicarnos con usted, personalizar su experiencia y para fines de seguridad y cumplimiento legal."
    },
    {
      number: 3,
      title: "Compartir su Información",
      content: "No compartimos su información personal con terceros, excepto cuando sea necesario para proporcionar nuestros servicios (por ejemplo, procesadores de pago), cumplir con la ley o proteger nuestros derechos."
    },
    {
      number: 4,
      title: "Sus Derechos de Privacidad",
      content: "Usted tiene derecho a acceder, corregir, eliminar o restringir el uso de su información personal. También puede oponerse al procesamiento de sus datos o solicitar la portabilidad de los mismos."
    },
    {
      number: 5,
      title: "Seguridad de los Datos",
      content: "Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal contra el acceso no autorizado, la alteración, la divulgación o la destrucción."
    },
    {
      number: 6,
      title: "Cambios en esta Política de Privacidad",
      content: "Podemos actualizar esta Política de Privacidad periódicamente. Le notificaremos cualquier cambio publicando la nueva política en esta página y actualizando la fecha de 'última actualización'."
    },
    {
      number: 7,
      title: "Contacto",
      content: "Si tiene alguna pregunta sobre esta Política de Privacidad, por favor contáctenos a través de los canales de soporte disponibles en nuestra plataforma."
    }
  ];




  return (
    <main className="bg-background text-foreground">
      {/* Navegación Superior Fija */}
      <LegalNavbar showSectionLinks={true} sectionName="Política de Privacidad" />

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
                    Bienvenido(a) a <strong>IRINA</strong>. Esta Política de Privacidad describe cómo recopilamos, utilizamos y protegemos su información personal cuando utiliza nuestra plataforma, conforme a la normativa colombiana de protección de datos personales.
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
              {index < privacyContent.length - 1 && <></>}
            </React.Fragment>
          ))}
        </motion.div>
      </section>
    </main>
  );
}