// src/app/components/auth/LoginGoogle.tsx
'use client'; // Necesario porque usa el hook useAuth y maneja eventos onClick

import React, { ReactElement } from 'react';
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

import { useAuth } from '../../context/AuthContext'; 
import { useRouter } from 'next/navigation'; // Importamos useRouter

export default function LogoutButton(): React.ReactElement<ReactElement> { // Nombre cambiado para claridad
  const { signOut } = useAuth();
  const router = useRouter(); // Inicializamos el router

  const handleSignOut = async () => {
    try {
      await signOut();
      console.log('Cierre de sesión solicitado.');
      router.push('/login'); // Redirigir a /login después de cerrar sesión
    } catch (err) {
      console.error('Fallo en handleSignOut:', err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center border-r-1">
        <button
              onClick={handleSignOut}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 transition duration-150 ease-in-out"
            >
              Cerrar Sesión
        </button>
    </div>
        
  );
}