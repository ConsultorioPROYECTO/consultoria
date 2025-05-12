// src/app/components/auth/LoginGoogle.tsx
'use client'; // Necesario porque usa el hook useAuth y maneja eventos onClick

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

import { useAuth } from '../../context/AuthContext'; // Ajusta la ruta si es necesario
import { useRouter } from 'next/navigation'; // Importamos el router de Next.js

/**
 * Componente LoginGoogle.
 * Proporciona la interfaz de usuario para el inicio de sesión con Google y
 * muestra la información del usuario o mensajes de estado.
 * @returns {JSX.Element} El elemento JSX del componente de login.
 */
export default function LoginGoogle(): React.ReactElement {
  const { signInWithGoogle } = useAuth();
  const router = useRouter(); // Inicializamos el router

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      // El estado del usuario se actualizará a través de onAuthStateChanged en AuthContext
      console.log('Inicio de sesión con Google solicitado.');
      // Redirigimos al usuario a la página de home después de iniciar sesión
      router.push('/pages/home');
    } catch (err) {
      // El error ya se maneja y se muestra en AuthContext,
      // pero se puede registrar aquí si es necesario.
      console.error('Fallo en handleSignIn:', err);
    }
  };

  return (
            <button
              onClick={handleSignIn}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-150 ease-in-out flex items-center justify-center"
            >
              {/* Puedes agregar un ícono de Google aquí si lo deseas */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 pr-3" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
              Iniciar Sesión con Google
            </button>
  );
}