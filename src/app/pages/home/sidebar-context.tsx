'use client';

/**
 * @file sidebar-context.tsx
 * @author Santiago Prada
 * @date 2025-05-13
 * @description Este archivo define el contexto de React para gestionar el estado del sidebar (barra lateral).
 * Permite compartir el estado de visibilidad del sidebar (abierto/cerrado) y la función para alternar dicho estado
 * entre diferentes componentes de la aplicación sin necesidad de pasar props manualmente a través de múltiples niveles.
 * Esto es crucial para la modularidad y mantenibilidad del código, especialmente en aplicaciones complejas donde
 * el estado del sidebar puede ser accedido o modificado desde diversas partes de la interfaz de usuario.
 * La creación de este contexto es una práctica común en React para el manejo de estado global o compartido,
 * lo que simplifica la arquitectura y mejora la organización del código, facilitando el proceso de compilación (build)
 * al tener dependencias de estado claramente definidas y centralizadas.
 */
import { createContext, useContext } from 'react';

/**
 * @interface SidebarContextType
 * @description Define la estructura del objeto de contexto para el sidebar.
 * @property {boolean} isSidebarOpen - Indica si el sidebar está actualmente abierto o cerrado.
 * @property {() => void} toggleSidebar - Función para alternar el estado de visibilidad del sidebar.
 */
interface SidebarContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

/**
 * @const SidebarContext
 * @description Crea el contexto de React para el sidebar.
 * Se inicializa con `undefined` y se espera que un `SidebarProvider` (no definido en este archivo)
 * proporcione el valor real del contexto.
 */
export const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

/**
 * @function useSidebar
 * @description Hook personalizado para acceder al contexto del sidebar.
 * Facilita el uso del `SidebarContext` en los componentes funcionales.
 * @throws {Error} Si se intenta usar fuera de un `SidebarProvider`.
 * @returns {SidebarContextType} El valor actual del contexto del sidebar.
 */
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};