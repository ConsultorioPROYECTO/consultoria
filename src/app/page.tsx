// src/app/page.tsx
/**
 * @fileoverview Página principal de la aplicación.
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-05-10
 *
 * @description
 * Esta es la página de inicio que se muestra por defecto.
 * Actualmente, integra el componente LoginGoogle para demostrar la funcionalidad
 * de autenticación.
 *
 * @requires ./components/auth/LoginGoogle - Componente para el login con Google.
 */

import LoginGoogle from './components/auth/LoginGoogle'; // Ajusta la ruta si es necesario

/**
 * Componente HomePage.
 * Renderiza la página principal de la aplicación.
 * @returns {JSX.Element} El elemento JSX de la página de inicio.
 */
export default function HomePage(): React.ReactElement {
  return (
    <main>
      {/* Puedes agregar más contenido aquí si es necesario */}
      <LoginGoogle />
    </main>
  );
}