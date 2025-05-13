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
export default function HomePage(): React.ReactElement {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#333' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#f8f9fa', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e7e7e7' }}>
        <h1 style={{ fontSize: '1.8em', margin: 0, color: '#007bff' }}>{projectData.projectName}</h1>
        <nav>
          <Link href="/login" style={{ marginRight: '15px', textDecoration: 'none', color: '#007bff' }}>Login</Link>
          <Link href="/signup" style={{ textDecoration: 'none', color: '#007bff' }}>Registro</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main>
        <section style={{ backgroundColor: '#007bff', color: 'white', textAlign: 'center', padding: '80px 20px' }}>
          <h2 style={{ fontSize: '2.8em', margin: '0 0 20px 0' }}>{projectData.heroTitle}</h2>
          <p style={{ fontSize: '1.2em', marginBottom: '30px', maxWidth: '700px', margin: '0 auto 30px auto' }}>
            {projectData.heroSubtitle}
          </p>
          <Link href={projectData.ctaLink} style={{ backgroundColor: 'white', color: '#007bff', padding: '15px 30px', textDecoration: 'none', borderRadius: '5px', fontSize: '1.1em', fontWeight: 'bold' }}>
            {projectData.ctaText}
          </Link>
        </section>

        {/* Services Section */}
        <section style={{ padding: '60px 20px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '2.2em', marginBottom: '40px', color: '#343a40' }}>{projectData.servicesTitle}</h3>
          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
            {projectData.services.map(service => (
              <div key={service.id} style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', padding: '30px', width: '300px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                {service.icon && <span style={{ fontSize: '2.5em', display: 'block', marginBottom: '15px' }}>{service.icon}</span>}
                <h4 style={{ fontSize: '1.5em', margin: '0 0 10px 0', color: '#007bff' }}>{service.title}</h4>
                <p style={{ fontSize: '1em', lineHeight: '1.6' }}>{service.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About Section */}
        <section style={{ backgroundColor: '#e9ecef', padding: '60px 20px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '2.2em', marginBottom: '20px', color: '#343a40' }}>{projectData.aboutTitle}</h3>
          <p style={{ fontSize: '1.1em', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto', color: '#495057' }}>
            {projectData.aboutText}
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#343a40', color: 'white', textAlign: 'center', padding: '30px 20px', marginTop:'auto' }}>
        <p style={{ margin: '0 0 10px 0' }}>Contáctanos: <a href={`mailto:${projectData.contactEmail}`} style={{ color: '#00bfff', textDecoration: 'none' }}>{projectData.contactEmail}</a></p>
        <p style={{ margin: 0, fontSize: '0.9em' }}>{projectData.footerText}</p>
      </footer>
    </div>
  );
}