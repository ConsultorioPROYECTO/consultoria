'use client';

import { LegalNavbar } from '../_components/LegalNavbar';

import { motion } from 'framer-motion';
import React from 'react';

type CookieContent = {
  title: string;
  content: string;
  number?: number;
};

export default function TermsOfServicePage() {
  const termsContent: CookieContent[] = [
    {
      title: "Última actualización: 26 de junio de 2024",
      content: ""
    },
    {
      number: 1,
      title: "Aceptación de los Términos de Servicio",
      content: "Al utilizar la plataforma de Irina, usted reconoce que ha leído, entendido y aceptado estos Términos de Servicio, así como nuestra Política de Privacidad. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestros servicios."
    },
    {
      number: 2,
      title: "Descripción del Servicio",
      content: "Irina es una plataforma de gestión de clínicas diseñada para optimizar la administración de citas, expedientes de pacientes, comunicación interna y otras tareas relacionadas con la operación de un consultorio o centro médico."
    },
    {
      number: 3,
      title: "Uso de la Plataforma",
      content: "Usted se compromete a utilizar la plataforma de Irina de manera lícita y de acuerdo con estos Términos de Servicio. No deberá utilizar la plataforma para fines ilegales o no autorizados."
    },
    {
      number: 4,
      title: "Cuentas de Usuario",
      content: "Para acceder a ciertas funciones de la plataforma, deberá registrar una cuenta. Usted es responsable de mantener la confidencialidad de su información de cuenta y de todas las actividades que ocurran bajo su cuenta."
    },
    {
      number: 5,
      title: "Privacidad",
      content: "Su privacidad es importante para nosotros. Nuestra Política de Privacidad describe cómo recopilamos, utilizamos y protegemos su información personal. Al utilizar nuestros servicios, usted acepta nuestras prácticas de privacidad."
    },
    {
      number: 6,
      title: "Modificaciones de los Términos de Servicio",
      content: "Nos reservamos el derecho de modificar estos Términos de Servicio en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación en la plataforma. Es su responsabilidad revisar periódicamente estos términos."
    },
    {
      number: 7,
      title: "Limitación de Responsabilidad",
      content: "Irina no será responsable de ningún daño directo, indirecto, incidental, especial o consecuente que resulte del uso o la imposibilidad de usar nuestros servicios."
    },
    {
      number: 8,
      title: "Ley Aplicable",
      content: "Estos Términos de Servicio se regirán e interpretarán de acuerdo con las leyes del país donde Irina tiene su sede principal, sin tener en cuenta sus disposiciones sobre conflicto de leyes."
    },
    {
      number: 9,
      title: "Contacto",
      content: "Si tiene alguna pregunta sobre estos Términos de Servicio, por favor contáctenos a través de los canales de soporte disponibles en nuestra plataforma."
    }
  ];




  return (
    <main className="bg-background text-foreground">
      {/* Navegación Superior Fija */}
      <LegalNavbar showSectionLinks={true} sectionName="Términos de Servicio" />

      {/* Sección de Contenido de Términos de Servicio */}
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
            Términos de Servicio
          </motion.h1>

          {termsContent.map((section, index) => (
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
                    Bienvenido(a) a <strong>IRINA</strong>. Al acceder y utilizar nuestros servicios, usted acepta cumplir y estar sujeto a los siguientes términos de servicio. Por favor, léalos detenidamente.
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
              {index < termsContent.length - 1 && <></>}
            </React.Fragment>
          ))}
        </motion.div>
      </section>
    </main>
  );
}