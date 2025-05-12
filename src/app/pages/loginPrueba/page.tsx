// src/app/login/page.tsx
/**
 * @fileoverview Página de inicio de sesión y registro.
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-05-11
 *
 * @description
 * Esta página presenta al usuario las opciones para iniciar sesión o registrarse,
 * utilizando el componente de login con Google y el formulario de email/contraseña.
 * También muestra información del usuario si ya está autenticado.
 *
 * @requires ../../components/auth/LoginButtonGoogle - Hook `useAuth` para el estado del usuario.
 * @requires ../../components/login-form/LoginFormPrueba - Componente para login con Google.
 * @requires ../../context/AuthContext - Componente para login/registro con email y contraseña.
 */
'use client'; // Necesario si usas useAuth directamente aquí para mostrar info del usuario

import React from 'react';
import LoginGoogle from '../../components/auth/LoginButtonGoogle'; // Ajusta la ruta si es necesario
import LoginForm from '../../components/login-form/LoginFormPrueba';     // Ajusta la ruta si es necesario
import { useAuth } from '../../context/AuthContext';       // Ajusta la ruta si es necesario

/**
 * Componente LoginPage.
 * Renderiza la página con las opciones de autenticación.
 * @returns {React.ReactElement} El elemento JSX de la página de login.
 */
export default function LoginPage(): React.ReactElement {
  const { user, loading, signOut } = useAuth(); // Obtenemos el usuario y signOut para mostrar info

  if (loading) {
    return <p style={{ textAlign: 'center', padding: '50px', fontSize: '1.2em' }}>Cargando información de usuario...</p>;
  }

  return (
    <main style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
        Bienvenido - Inicia Sesión o Regístrate
      </h1>

      {user ? (
        <div style={{ textAlign: 'center', border: '1px solid green', padding: '20px', margin: '20px auto', maxWidth: '500px' }}>
          <p>
            Ya has iniciado sesión como:{' '}
            <strong>{user.displayName || user.email}</strong>
          </p>
          {user.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt="Foto de perfil"
              style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '10px auto', display: 'block' }}
            />
          )}
          <button
            onClick={() => signOut()}
            style={{ padding: '10px 20px', backgroundColor: 'tomato', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}
          >
            Cerrar Sesión
          </button>
        </div>
      ) : (
        <>
          {/* Componente de Login con Google */}
          {/* El componente LoginGoogle ya tiene sus propios estilos y manejo de estado,
              podrías necesitar envolverlo o ajustarlo si quieres una apariencia unificada.
              Por ahora lo dejamos tal cual. */}
          <div style={{ marginBottom: '40px', borderBottom: '1px solid #eee', paddingBottom: '30px' }}>
             <LoginGoogle />
          </div>


          {/* Componente de Login/Registro con Email y Contraseña */}
          <div>
            <LoginForm />
          </div>
        </>
      )}
    </main>
  );
}