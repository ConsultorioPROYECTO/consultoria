'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

/**
 * @typedef {object} UIStyleContextType
 * @description Define la forma del objeto que se comparte a través del UIStyleContext.
 * @property {'normal' | 'minimal'} uiStyle - El estilo actual de la interfaz.
 * @property {(style: 'normal' | 'minimal') => void} setUiStyle - Función para cambiar el estilo de la interfaz.
 */
interface UIStyleContextType {
  uiStyle: 'normal' | 'minimal';
  setUiStyle: (style: 'normal' | 'minimal') => void;
}

/**
 * Contexto de Estilo de Interfaz.
 * @type {React.Context<UIStyleContextType | undefined>}
 */
const UIStyleContext = createContext<UIStyleContextType | undefined>(undefined);

/**
 * @typedef {object} UIStyleProviderProps
 * @description Propiedades para el componente UIStyleProvider.
 * @property {ReactNode} children - Los componentes hijos que tendrán acceso al contexto.
 */
interface UIStyleProviderProps {
  children: ReactNode;
}

/**
 * Componente Proveedor del Contexto de Estilo de Interfaz.
 * Envuelve la aplicación para proveer el estado del estilo de interfaz.
 * @param {UIStyleProviderProps} props - Las propiedades del componente.
 * @returns {React.ReactElement} El proveedor del contexto con sus hijos.
 */
export function UIStyleProvider({ children }: UIStyleProviderProps): React.ReactElement {
  const [uiStyle, setUiStyleState] = useState<'normal' | 'minimal'>('normal');

  // Cargar el estilo desde localStorage al inicializar
  useEffect(() => {
    const savedStyle = localStorage.getItem('ui-style') as 'normal' | 'minimal' | null;
    if (savedStyle && (savedStyle === 'normal' || savedStyle === 'minimal')) {
      setUiStyleState(savedStyle);
    }
  }, []);

  // Función para cambiar el estilo y guardarlo en localStorage
  const setUiStyle = (style: 'normal' | 'minimal') => {
    setUiStyleState(style);
    localStorage.setItem('ui-style', style);
  };

  const value: UIStyleContextType = {
    uiStyle,
    setUiStyle,
  };

  return (
    <UIStyleContext.Provider value={value}>
      {children}
    </UIStyleContext.Provider>
  );
}

/**
 * Hook personalizado para acceder al contexto de estilo de interfaz.
 * @returns {UIStyleContextType} El contexto de estilo de interfaz.
 * @throws {Error} Si se usa fuera del UIStyleProvider.
 */
export function useUIStyle(): UIStyleContextType {
  const context = useContext(UIStyleContext);
  if (context === undefined) {
    throw new Error('useUIStyle debe ser usado dentro de un UIStyleProvider');
  }
  return context;
}