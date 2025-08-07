// src/app/contexts/AuthContext.tsx
'use client'; // Este componente utiliza hooks de React, por lo que debe ser un Client Component.

/**
 * @fileoverview Contexto de Autenticación para gestionar el estado del usuario.
 * @version 
 * @author Santiago Prada
 * @date 2025-05-10
 *
 * @description
 * Este contexto proporciona el estado del usuario actual y las funciones para
 * iniciar sesión (Google, Email/Password), registrarse (Email/Password) y cerrar sesión.
 * Utiliza `onAuthStateChanged` de Firebase para escuchar los cambios en el estado
 * de autenticación en tiempo real.
 *
 * @requires react - Para crear el contexto y los hooks.
 * @requires firebase/auth - Para tipos de usuario y funciones de autenticación.
 * @requires ../lib/firebase/firebaseConfig - Para la instancia de `auth` y `googleAuthProvider`.
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
  useRef,
  ReactNode,
  ReactElement,
} from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  AuthError,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase/firebaseConfig'; // Ajusta la ruta si es necesario

/**
 * @typedef {object} EmailPasswordCredentials
 * @description Credenciales para autenticación con email y contraseña.
 * @property {string} email - El correo electrónico del usuario.
 * @property {string} password - La contraseña del usuario.
 */
export interface EmailPasswordCredentials {
  email: string;
  password: string;
}

/**
 * @typedef {object} AuthContextType
 * @description Define la forma del objeto que se comparte a través del AuthContext.
 * @property {User | null} user - El objeto User de Firebase.
 * @property {boolean} loading - Indica si se está cargando el estado inicial.
 * @property {string | null} userRole - El rol del usuario (admin, medico, asistente, N/A).
 * @property {boolean} isLoadingRole - Indica si se está cargando la información del rol.
 * @property {number | null} organizationId - ID de la organización del usuario.
 * @property {number | null} doctorId - ID del doctor si el usuario es médico.
 * @property {number | null} assistantId - ID del asistente si el usuario es asistente.
 * @property {() => Promise<string | null>} getAuthToken - Función para obtener el token de autenticación.
 * @property {() => Promise<void>} signInWithGoogle - Función para iniciar sesión con Google.
 * @property {(credentials: EmailPasswordCredentials) => Promise<void>} signInWithEmail - Función para iniciar sesión con email/contraseña.
 * @property {(credentials: EmailPasswordCredentials) => Promise<void>} signUpWithEmail - Función para registrarse con email/contraseña.
 * @property {() => Promise<void>} signOut - Función para cerrar sesión.
 * @property {AuthError | null} error - Almacena cualquier error ocurrido.
 */
interface AuthContextType {
  user: User | null;
  loading: boolean;
  userRole: string | null;
  isLoadingRole: boolean;
  organizationId: number | null;
  doctorId: number | null;
  assistantId: number | null;
  getAuthToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (credentials: EmailPasswordCredentials) => Promise<void>;
  signUpWithEmail: (credentials: EmailPasswordCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserInfo: () => Promise<void>;
  startRolePolling: (intervalMs?: number) => void;
  stopRolePolling: () => void;
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
 * @returns {React.ReactElement} El proveedor del contexto con sus hijos.
 */
export function AuthProvider({ children }: AuthProviderProps): React.ReactElement<ReactElement> {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState<boolean>(true);
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [assistantId, setAssistantId] = useState<number | null>(null);

  // Ref para evitar múltiples peticiones con el mismo usuario
  const lastUserUidRef = useRef<string | null>(null);
  const roleRequestRef = useRef<Promise<void> | null>(null);
  const rolePollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimestamp = useRef<number>(0);
  const SYNC_COOLDOWN = 5000; // 5 segundos de cooldown entre sincronizaciones

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);
        
        if (currentUser) {
          // Evitar múltiples peticiones para el mismo usuario con cooldown
          const now = Date.now();
          if (lastUserUidRef.current === currentUser.uid && 
              (roleRequestRef.current || (now - lastSyncTimestamp.current) < SYNC_COOLDOWN)) {
            if (roleRequestRef.current) {
              await roleRequestRef.current;
            }
            return;
          }
          
          lastUserUidRef.current = currentUser.uid;
          lastSyncTimestamp.current = now;
          setIsLoadingRole(true);
          
          // Crear una promesa para evitar peticiones duplicadas
          const roleRequest = (async () => {
            try {
              // Usar un solo token para ambas peticiones
              const token = await currentUser.getIdToken();
              
              // Sincronizar usuario y obtener rol en paralelo para optimizar
              const userData = {
                firebaseUid: currentUser.uid,
                email: currentUser.email,
                emailVerified: currentUser.emailVerified,
                phoneNumber: currentUser.phoneNumber,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                providerId: currentUser.providerData?.[0]?.providerId || 'password',
              };

              const [syncResponse, roleResponse] = await Promise.allSettled([
                fetch('/api/auth/sync-user', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(userData),
                }),
                fetch('/api/users/rol', {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                })
              ]);

              // Manejar respuesta de sincronización
              if (syncResponse.status === 'rejected' || 
                  (syncResponse.status === 'fulfilled' && !syncResponse.value.ok)) {
                if (process.env.NODE_ENV === 'development') {
                  console.error('Error al sincronizar usuario:', 
                    syncResponse.status === 'rejected' ? syncResponse.reason : syncResponse.value.statusText);
                }
              }
              
              // Manejar respuesta de rol
              if (roleResponse.status === 'fulfilled' && roleResponse.value.ok) {
                const data = await roleResponse.value.json();
                setUserRole(data.role);
                setOrganizationId(data.organizationId || null);
                setDoctorId(data.doctorId || null);
                setAssistantId(data.assistantId || null);
              } else {
                setUserRole(null);
                setOrganizationId(null);
                setDoctorId(null);
                setAssistantId(null);
              }
            } catch (error) {
              if (process.env.NODE_ENV === 'development') {
                console.error("Error fetching user role:", error);
              }
              setUserRole(null);
              setOrganizationId(null);
              setDoctorId(null);
              setAssistantId(null);
            } finally {
              setIsLoadingRole(false);
              roleRequestRef.current = null;
            }
          })();
          
          roleRequestRef.current = roleRequest;
          await roleRequest;
        } else {
          lastUserUidRef.current = null;
          roleRequestRef.current = null;
          setUserRole(null);
          setOrganizationId(null);
          setDoctorId(null);
          setAssistantId(null);
          setIsLoadingRole(false);
        }
        
        setLoading(false);
        setError(null);
      },
      (authError) => {
        if (process.env.NODE_ENV === 'development') {
        console.error('Error en onAuthStateChanged:', authError);
      }
        setError(authError as AuthError);
        setUser(null);
        setUserRole(null);
        setOrganizationId(null);
        setDoctorId(null);
        setAssistantId(null);
        setLoading(false);
        setIsLoadingRole(false);
        lastUserUidRef.current = null;
        roleRequestRef.current = null;
      },
    );

    return () => {
      unsubscribe();
      // Limpiar el polling cuando el componente se desmonte
      if (rolePollingIntervalRef.current) {
        clearInterval(rolePollingIntervalRef.current);
        rolePollingIntervalRef.current = null;
      }
    };
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Error al iniciar sesión con Google:', err);
      }
      if (err instanceof Error && 'code' in err) {
        setError(err as AuthError);
      } else {
        setError({
          code: 'auth/unknown-error',
          message: err instanceof Error ? err.message : 'Ocurrió un error desconocido durante el inicio de sesión.',
          name: 'AuthError',
        } as AuthError);
      }
      setUser(null);
    } finally {
      // Aunque onAuthStateChanged también setea loading a false,
      // es bueno tenerlo aquí para el caso de error inmediato en signInWithPopup.
      // Sin embargo, onAuthStateChanged es el que debe tener la última palabra.
      setLoading(false); // Se gestiona mejor con onAuthStateChanged
    }
  };

  /**
   * Inicia sesión de un usuario existente con correo electrónico y contraseña.
   * @param {EmailPasswordCredentials} credentials - El email y contraseña del usuario.
   * @returns {Promise<void>}
   * @async
   */
  const signInWithEmail = async ({ email, password }: EmailPasswordCredentials): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const currentUser = userCredential.user;
      
      // Check if email is verified after successful login
      if (!currentUser.emailVerified) {
        await firebaseSignOut(auth);
        const emailError = {
          code: 'auth/email-not-verified',
          message: 'Email not verified'
        } as AuthError;
        setError(emailError);
        setUser(null);
        setLoading(false);
        throw emailError;
      }
      
      // onAuthStateChanged manejará la actualización del usuario
    } catch (err) {
      const authError = err as AuthError;
      // Only log unexpected errors, not user validation errors
      if (process.env.NODE_ENV === 'development' && authError.code !== 'auth/email-not-verified') {
        console.error('Error al iniciar sesión con email:', authError);
      }
      setError(authError);
      setUser(null);
      setLoading(false); // Resetear loading en caso de error
      throw authError; // Re-lanzar el error para que el componente pueda manejarlo
    }
  };

  /**
   * Registra un nuevo usuario con correo electrónico y contraseña.
   * @param {EmailPasswordCredentials} credentials - El email y contraseña para el nuevo usuario.
   * @returns {Promise<void>}
   * @async
   */
  const signUpWithEmail = async ({ email, password }: EmailPasswordCredentials): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged manejará la actualización del usuario
    } catch (err) {
      const authError = err as AuthError;
      setError(authError);
      setUser(null);
      throw authError; // Re-lanzar el error para que el componente pueda manejarlo
    } finally {
      setLoading(false); // Resetear loading en todos los casos
    }
  };


  /**
   * Obtiene el token de autenticación del usuario actual.
   * @async
   * @returns {Promise<string | null>} El token de autenticación o null si no hay usuario.
   * @throws {Error} Si ocurre un error al obtener el token.
   */
  const getAuthToken = async (): Promise<string | null> => {
    if (!user) {
      return null;
    }
    try {
      return await user.getIdToken();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error al obtener el token de autenticación:', error);
      }
      throw error;
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
      // Limpiar estados inmediatamente para evitar errores durante la transición
      setUser(null);
      setUserRole(null);
      setOrganizationId(null);
      setDoctorId(null);
      setAssistantId(null);
      setIsLoadingRole(false);
      // `onAuthStateChanged` se encargará de confirmar la actualización del estado.
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error al cerrar sesión:', err);
      }
      if (err instanceof Error && 'code' in err) {
        setError(err as AuthError);
      } else {
        setError({
          code: 'auth/unknown-error',
          message: err instanceof Error ? err.message : 'Ocurrió un error desconocido durante el cierre de sesión.',
          name: 'AuthError',
        } as AuthError);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresca la información del usuario desde la base de datos.
   * Útil después de crear una organización o cambiar el rol.
   * @async
   * @returns {Promise<void>}
   */
  const refreshUserInfo = async (): Promise<void> => {
    if (!user) return;
    
    // Aplicar el mismo cooldown que en onAuthStateChanged para evitar peticiones duplicadas
    const now = Date.now();
    if ((now - lastSyncTimestamp.current) < SYNC_COOLDOWN) {
      return;
    }
    
    lastSyncTimestamp.current = now;
    setIsLoadingRole(true);
    try {
      const token = await user.getIdToken(); // Removed force refresh to avoid unnecessary token requests
      const response = await fetch('/api/users/rol', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
        setOrganizationId(data.organizationId || null);
        setDoctorId(data.doctorId || null);
        setAssistantId(data.assistantId || null);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error refreshing user info:', response.status);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error refreshing user info:', error);
      }
    } finally {
      setIsLoadingRole(false);
    }
  };

  /**
   * Inicia un polling para verificar cambios de rol cada cierto tiempo.
   * Útil para detectar cambios de rol realizados por otros usuarios.
   * @param {number} intervalMs - Intervalo en milisegundos (por defecto 30 segundos)
   */
  const startRolePolling = (intervalMs: number = 30000): void => {
    if (rolePollingIntervalRef.current) {
      clearInterval(rolePollingIntervalRef.current);
    }
    
    rolePollingIntervalRef.current = setInterval(() => {
      if (user && !isLoadingRole) {
        refreshUserInfo();
      }
    }, intervalMs);
  };

  /**
    * Detiene el polling de cambios de rol.
    */
   const stopRolePolling = (): void => {
     if (rolePollingIntervalRef.current) {
       clearInterval(rolePollingIntervalRef.current);
       rolePollingIntervalRef.current = null;
     }
   };

  const contextValue: AuthContextType = {
    user,
    loading,
    userRole,
    isLoadingRole,
    organizationId,
    doctorId,
    assistantId,
    getAuthToken,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail, 
    signOut,
    refreshUserInfo,
    startRolePolling,
    stopRolePolling,
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