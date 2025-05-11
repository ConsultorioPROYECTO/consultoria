// src/app/contexts/AuthContext.tsx
'use client'; // Este componente utiliza hooks de React, por lo que debe ser un Client Component.

/**
 * @fileoverview Contexto de Autenticación para gestionar el estado del usuario.
 * @version 
 * @author Santiago Prada
 * @date 2025-05-10
 *
 * @description
 * Este contexto proporciona el estado del usuario actual (si está autenticado y sus datos)
 * y las funciones para iniciar sesión con Google y cerrar sesión.
 * Utiliza `onAuthStateChanged` de Firebase para escuchar los cambios en el estado
 * de autenticación en tiempo real.
 *
 * @requires react - Para crear el contexto y los hooks.
 * @requires firebase/auth - Para tipos de usuario y funciones de autenticación.
 * @requires ../../lib/firebase/config - Para la instancia de `auth` y `googleAuthProvider`.
 *
 * @exports AuthContext - El contexto de React.
 * @exports AuthProvider - El componente proveedor del contexto.
 * @exports useAuth - Hook personalizado para acceder fácilmente al contexto.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  AuthError,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase/firebaseConfig'; // Ajusta la ruta si es necesario

/**
 * @typedef {object} AuthContextType
 * @description Define la forma del objeto que se comparte a través del AuthContext.
 * @property {User | null} user - El objeto User de Firebase si el usuario está autenticado, de lo contrario null.
 * @property {boolean} loading - Indica si se está cargando el estado inicial de autenticación.
 * @property {() => Promise<void>} signInWithGoogle - Función para iniciar sesión con Google.
 * @property {() => Promise<void>} signOut - Función para cerrar sesión.
 * @property {AuthError | null} error - Almacena cualquier error ocurrido durante la autenticación.
 */
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: AuthError | null;
}

/**
 * Contexto de Autenticación.
 * @type {React.Context<AuthContextType | undefined>}
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * @typedef {object} AuthProviderProps
 * @description Propiedades para el componente AuthProvider.
 * @property {ReactNode} children - Los componentes hijos que tendrán acceso al contexto.
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Componente Proveedor del Contexto de Autenticación.
 * Envuelve la aplicación o partes de ella para proveer el estado de autenticación.
 * @param {AuthProviderProps} props - Las propiedades del componente.
 * @returns {JSX.Element} El proveedor del contexto con sus hijos.
 */
export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    /**
     * Observador del estado de autenticación de Firebase.
     * Se ejecuta cuando el componente se monta y cada vez que el estado de autenticación cambia.
     * Actualiza el estado `user` y `loading`.
     * @returns {() => void} Una función de limpieza para desuscribirse del observador cuando el componente se desmonta.
     */
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
        setError(null); // Limpiar errores en cambio de estado exitoso
      },
      (authError) => {
        // Este callback de error en onAuthStateChanged es menos común para errores de login/logout directos,
        // pero es bueno tenerlo para errores de inicialización o persistencia del estado.
        console.error('Error en onAuthStateChanged:', authError);
        setError(authError as AuthError);
        setUser(null);
        setLoading(false);
      },
    );

    // Limpieza al desmontar el componente
    return () => unsubscribe();
  }, []); // El array vacío asegura que useEffect se ejecute solo una vez (al montar y desmontar)

  /**
   * Inicia el proceso de inicio de sesión con Google utilizando Firebase Auth.
   * Utiliza un pop-up para la autenticación.
   * @async
   * @returns {Promise<void>} Promesa que se resuelve cuando el inicio de sesión es exitoso o falla.
   * @throws {AuthError} Si ocurre un error durante el inicio de sesión.
   */
  const signInWithGoogle = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
      // `onAuthStateChanged` se encargará de actualizar el estado del usuario.
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      if (err instanceof Error && 'code' in err) {
        setError(err as AuthError);
      } else {
        setError({
          code: 'auth/unknown-error',
          message: err instanceof Error ? err.message : 'An unknown error occurred during sign-in.',
          name: 'AuthError',
        } as AuthError);
      }
      setUser(null);
    } finally {
      // Aunque onAuthStateChanged también setea loading a false,
      // es bueno tenerlo aquí para el caso de error inmediato en signInWithPopup.
      // Sin embargo, onAuthStateChanged es el que debe tener la última palabra.
      // setLoading(false); // Se gestiona mejor con onAuthStateChanged
    }
  };

  /**
   * Cierra la sesión del usuario actual.
   * @async
   * @returns {Promise<void>} Promesa que se resuelve cuando el cierre de sesión es exitoso o falla.
   * @throws {AuthError} Si ocurre un error durante el cierre de sesión.
   */
  const signOut = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
      // `onAuthStateChanged` se encargará de actualizar el estado del usuario a null.
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      if (err instanceof Error && 'code' in err) {
        setError(err as AuthError);
      } else {
        setError({
          code: 'auth/unknown-error',
          message: err instanceof Error ? err.message : 'An unknown error occurred during sign-out.',
          name: 'AuthError',
        } as AuthError);
      }
    } finally {
      // setLoading(false); // Gestionado por onAuthStateChanged
    }
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signOut,
    error,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

/**
 * Hook personalizado para consumir el AuthContext.
 * Proporciona una forma sencilla y segura de acceder al estado de autenticación.
 * @returns {AuthContextType} El valor del contexto de autenticación.
 * @throws {Error} Si se usa fuera de un AuthProvider.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};