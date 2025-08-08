// src/app/components/auth/LoginGoogle.tsx
'use client'; // Necesario porque usa el hook useAuth y maneja eventos onClick

import { ReactElement, useEffect, useState } from 'react';
/**
 * @fileoverview Componente para el inicio de sesión con Google y mostrar estado del usuario.
 * @version 
 * @Back-End Santiago Prada
 * @Front-End Brian
 * @date 2025-05-11
 *
 * @description
 * Este componente utiliza el hook `useAuth` para acceder a las funciones de
 * `signInWithGoogle`, `signOut` y al estado del usuario (`user`, `loading`, `error`).
 * Muestra un botón para iniciar sesión si el usuario no está autenticado,
 * y la información del usuario y un botón para cerrar sesión si está autenticado.
 * También maneja los estados de carga y errores.
 *
 * @requires ../../contexts/AuthContext - Hook `useAuth` para la lógica de autenticación.
 * @requires tailwindcss - Para los estilos del botón y texto.
 */

import { useAuth } from '../../context/AuthContext';
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Componente LoginGoogle.
 * Proporciona la interfaz de usuario para el inicio de sesión con Google y
 * muestra la información del usuario o mensajes de estado.
 * @returns {React.ReactElement} El elemento JSX del componente de login.
 */
export default function LoginGoogle(): React.ReactElement<ReactElement> {
  const { signInWithGoogle, userRole, organizationId, isLoadingRole, loading } = useAuth();
  const router = useRouter();
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Handle navigation after successful login and role is loaded
  useEffect(() => {
    if (loginSuccess && !isLoadingRole && userRole !== null) {
      if (userRole === 'N/A' || !organizationId) {
        router.push('/onboard');
      } else if (userRole && organizationId) {
        router.push('/home');
      }
    }
  }, [loginSuccess, isLoadingRole, userRole, organizationId, router]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      setLoginSuccess(true);
      toast.success('Inicio de sesión exitoso', {
        description: 'Cargando información del usuario...'
      });
      console.log('Inicio de sesión con Google solicitado.');
    } catch (err) {
      // El error ya se maneja y se muestra en AuthContext,
      // pero se puede registrar aquí si es necesario.
      console.error('Fallo en handleSignIn:', err);
      setLoginSuccess(false);
    }
  };

  return (
    <Button
    onClick={handleSignIn}
    disabled={loading || isLoadingRole}
    className="h-12 w-full text-base bg-white hover:bg-gray-50 text-gray-950 rounded-lg border border-gray-300 transition-colors duration-200 flex items-center justify-center"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20" className="mr-3">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>


    {loading || isLoadingRole ? 'Procesando...' : 'Continuar con Google'}
  </Button>
  );
}
