// src/app/page.tsx
/**
 * @fileoverview Página principal (Landing Page) de la aplicación de consultoría.
 * @version 
 * @author Santiago Prada
 * @date 2025-05-12
 *
 * @description
 * Esta es la página de inicio que se muestra por defecto. Presenta información sobre
 * la consultoría, sus servicios y un llamado a la acción.
 * 
 * La hice solo para que no tener la pagina principal vacia, y que se vea bien el menú de navegación
 *
 * @requires next/link - Para la navegación interna.
 */

import Link from "next/link";
import { ReactElement } from "react";

/**
 * Interfaz para la información del proyecto que se mostrará en la landing page.
 */
interface ProjectInfo {
  projectName: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  ctaLink: string;
  servicesTitle: string;
  services: Array<{ id: string; title: string; description: string; icon?: string }>;
  aboutTitle: string;
  aboutText: string;
  contactEmail: string;
  footerText: string;
}

// Objeto con la información personalizada de la página
const projectData: ProjectInfo = {
  projectName: "Consultoría Innovadora",
  tagline: "Soluciones Estratégicas para un Futuro Digital",
  heroTitle: "Transforma Tu Negocio Hoy",
  heroSubtitle: "Descubre cómo nuestras estrategias de consultoría pueden impulsar tu crecimiento y eficiencia en el mercado actual.",
  ctaText: "Conoce Nuestros Planes",
  ctaLink: "/login", //  Puedes cambiar esto a una sección específica o página de contacto
  servicesTitle: "Nuestros Servicios Destacados",
  services: [
    {
      id: "s1",
      title: "Consultoría Estratégica",
      description: "Análisis profundo y planificación para optimizar tus operaciones y estrategias de mercado.",
      icon: "📊" // Ejemplo de icono
    },
    {
      id: "s2",
      title: "Desarrollo Tecnológico",
      description: "Soluciones de software a medida, desde aplicaciones web hasta integraciones complejas.",
      icon: "💻"
    },
    {
      id: "s3",
      title: "Marketing Digital Avanzado",
      description: "Campañas efectivas para aumentar tu visibilidad y conectar con tu audiencia objetivo.",
      icon: "🚀"
    }
  ],
  aboutTitle: "Sobre Nosotros",
  aboutText: "Somos un equipo de expertos apasionados por la innovación y la tecnología, dedicados a ofrecer resultados tangibles y valor a nuestros clientes. Creemos en la colaboración y la transparencia para construir relaciones a largo plazo.",
  contactEmail: "info@consultoriainnovadora.com",
  footerText: `© ${new Date().getFullYear()} Consultoría Innovadora. Todos los derechos reservados.`
};

/**
 * Componente HomePage.
 * Renderiza la landing page principal de la aplicación.
 * @returns {React.ReactElement} El elemento JSX de la página de inicio.
 */
export default function HomePage(): React.ReactElement<ReactElement> {
  return (
    <div className="font-sans text-gray-800">
      {/* Header */}
      <header className="bg-gray-50 py-5 px-10 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-2xl font-bold text-blue-600">{projectData.projectName}</h1>
        <nav>
          <Link href="/login" className="mr-4 text-blue-600 hover:underline">Login</Link>
          <Link href="/signup" className="text-blue-600 hover:underline">Registro</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main>
        <section className="bg-blue-600 text-white text-center py-20 px-5">
          <h2 className="text-5xl font-bold mb-5">{projectData.heroTitle}</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            {projectData.heroSubtitle}
          </p>
          <Link href={projectData.ctaLink} className="bg-white text-blue-600 py-4 px-8 rounded-md text-lg font-bold hover:bg-gray-100 transition-colors">
            {projectData.ctaText}
          </Link>
        </section>

        {/* Services Section */}
        <section className="py-16 px-5 text-center">
          <h3 className="text-4xl font-bold mb-10 text-gray-800">{projectData.servicesTitle}</h3>
          <div className="flex justify-center flex-wrap gap-8">
            {projectData.services.map(service => (
              <div key={service.id} className="bg-gray-50 border border-gray-200 rounded-lg p-8 w-80 shadow-md hover:shadow-lg transition-shadow">
                {service.icon && <span className="text-4xl block mb-4">{service.icon}</span>}
                <h4 className="text-2xl font-bold mb-2 text-blue-600">{service.title}</h4>
                <p className="text-base leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About Section */}
        <section className="bg-gray-100 py-16 px-5 text-center">
          <h3 className="text-4xl font-bold mb-5 text-gray-800">{projectData.aboutTitle}</h3>
          <p className="text-lg leading-relaxed max-w-4xl mx-auto text-gray-600">
            {projectData.aboutText}
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center py-8 px-5">
        <p className="mb-2">Contáctanos: <a href={`mailto:${projectData.contactEmail}`} className="text-cyan-400 hover:underline">{projectData.contactEmail}</a></p>
        <p className="text-sm">{projectData.footerText}</p>
      </footer>
    </div>
  );
}