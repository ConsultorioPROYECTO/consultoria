// src/app/components/auth/LoginGoogle.tsx
'use client'; // Necesario porque usa el hook useAuth y maneja eventos onClick

/**
 * @fileoverview Componente para el inicio de sesión con Google y mostrar estado del usuario.
 * @version 
 * @author Santiago Prada
 * @date 2025-05-10
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

/**
 * Componente LoginGoogle.
 * Proporciona la interfaz de usuario para el inicio de sesión con Google y
 * muestra la información del usuario o mensajes de estado.
 * @returns {JSX.Element} El elemento JSX del componente de login.
 */
export default function LoginGoogle(): React.ReactElement {
  const { user, loading, error, signInWithGoogle, signOut } = useAuth();

  /**
   * Manejador para el evento de clic del botón de inicio de sesión con Google.
   * Llama a la función `signInWithGoogle` del contexto de autenticación.
   * @async
   */
  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      // El estado del usuario se actualizará a través de onAuthStateChanged en AuthContext
      console.log('Inicio de sesión con Google solicitado.');
    } catch (err) {
      // El error ya se maneja y se muestra en AuthContext,
      // pero se puede registrar aquí si es necesario.
      console.error('Fallo en handleSignIn:', err);
    }
  };

  /**
   * Manejador para el evento de clic del botón de cierre de sesión.
   * Llama a la función `signOut` del contexto de autenticación.
   * @async
   */
  const handleSignOut = async () => {
    try {
      await signOut();
      console.log('Cierre de sesión solicitado.');
    } catch (err) {
      console.error('Fallo en handleSignOut:', err);
    }
  };

  if (loading) {
    return <p className="text-center text-gray-600">Cargando...</p>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Autenticación con Google
        </h1>

        {error && (
          <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">
            Error: {error.message} (Código: {error.code})
          </p>
        )}

        {user ? (
          <div>
            <p className="text-lg text-gray-700 mb-2">
              ¡Bienvenido,{' '}
              <span className="font-semibold">
                {user.displayName || user.email}!
              </span>
            </p>
            {user.photoURL && (

              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt="Foto de perfil"
                className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-blue-500"
              />
            )}
            <p className="text-sm text-gray-500 mb-1">
              Email: {user.email}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              UID: {user.uid}
            </p>
            <button
              onClick={handleSignOut}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 transition duration-150 ease-in-out"
            >
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-6">
              Por favor, inicia sesión para continuar.
            </p>
            <button
              onClick={handleSignIn}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-150 ease-in-out flex items-center justify-center"
            >
              {/* Puedes agregar un ícono de Google aquí si lo deseas */}
              <svg
                className="w-5 h-5 mr-2 fill-current"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M22.56,12.25C22.56,11.47 22.49,10.72 22.36,10H12V14.26H17.95C17.72,15.61 17.06,16.76 16.07,17.49V19.93H19.62C21.56,18.2 22.56,15.47 22.56,12.25Z" />
                <path d="M12,23C14.97,23 17.47,22.04 19.62,20.42L16.07,17.93C15.09,18.61 13.66,19.08 12,19.08C9.21,19.08 6.83,17.29 5.96,14.78H2.31V17.27C3.78,20.53 7.59,23 12,23Z" />
                <path d="M5.96,14.22C5.74,13.53 5.6,12.78 5.6,12C5.6,11.22 5.74,10.47 5.96,9.78V7.29H2.31C1.5,8.85 1,10.37 1,12C1,13.63 1.5,15.15 2.31,16.71L5.96,14.22Z" />
                <path d="M12,5.92C13.74,5.92 15.17,6.54 16.32,7.61L19.69,4.36C17.47,2.39 14.97,1 12,1C7.59,1 3.78,3.47 2.31,6.73L5.96,9.22C6.83,6.71 9.21,4.92 12,4.92Z" />
              </svg>
              Iniciar Sesión con Google
            </button>
          </div>
        )}
      </div>
      <p className="mt-8 text-xs text-gray-500">
        Tailwind CSS v4 | Next.js v15 | Firebase Auth | TypeScript v5
      </p>
    </div>
  );
}