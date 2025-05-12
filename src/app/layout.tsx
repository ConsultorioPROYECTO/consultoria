// src/app/layout.tsx
/**
 * @fileoverview Layout principal de la aplicación.
 * @version 
 * @author Santiago Prada
 * @date 2025-05-10
 *
 * @description
 * Este es el layout raíz que envuelve todas las páginas de la aplicación.
 * Se utiliza para configurar elementos globales como el proveedor de autenticación,
 * metadatos, y estilos base.
 *
 * @requires next/font/google - Para cargar fuentes de Google.
 * @requires ./globals.css - Estilos globales (Tailwind).
 * @requires ./contexts/AuthContext - El proveedor del contexto de autenticación.
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Asegúrate que Tailwind está configurado aquí
import { AuthProvider } from './context/AuthContext'; // Importa el AuthProvider
import { copernicusFont } from './fonts'

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mi App con Firebase Auth',
  description: 'Ejemplo de login con Google usando Next.js y Firebase',
};

/**
 * Componente RootLayout que define la estructura base HTML de la aplicación.
 * @param {Readonly<{ children: React.ReactNode }>} props - Propiedades del layout.
 * @property {React.ReactNode} children - El contenido de la página actual.
 * @returns {JSX.Element} El elemento JSX del layout.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="es">
      <body className={`${inter.className} ${copernicusFont.variable}`}>
        {/* Envuelve la aplicación con AuthProvider */}
        <AuthProvider>{children}</AuthProvider>
        {/* Es muy importante el componente AuthProvider ya que se encarga de la logica que mantiene la sesion el usuario */}
      </body>
    </html>
  );
}