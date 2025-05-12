// src/app/components/auth/LoginForm.tsx
'use client'; // Necesario por useState, y uso de useAuth y eventos.

/**
 * @fileoverview Componente de formulario para inicio de sesión y registro con email/contraseña.
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-05-11
 *
 * @description
 * Proporciona campos para email y contraseña, y botones para ejecutar
 * las acciones de `signInWithEmail` y `signUpWithEmail` del `AuthContext`.
 * Muestra mensajes de error y carga del contexto.
 * Los estilos son mínimos o inexistentes, para ser aplicados externamente.
 *
 * @requires react - Para `useState` y manejo de eventos.
 * @requires ../../contexts/AuthContext - Hook `useAuth` y tipo `EmailPasswordCredentials`.
 */

import React, { useState, FormEvent } from 'react';
import { useAuth, EmailPasswordCredentials } from '../../context/AuthContext'; // Ajusta la ruta si es necesario

/**
 * Componente LoginForm.
 * Permite al usuario ingresar email y contraseña para iniciar sesión o registrarse.
 * @returns {React.ReactElement} El elemento JSX del formulario de login/registro.
 */
export default function LoginForm(): React.ReactElement {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const { signInWithEmail, signUpWithEmail, loading, error, user } = useAuth();

  /**
   * Maneja el envío del formulario para iniciar sesión.
   * @param {FormEvent<HTMLFormElement>} event - El evento del formulario.
   * @async
   */
  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      alert('Por favor, ingresa email y contraseña.'); // Reemplazar con mejor UI de error
      return;
    }
    const credentials: EmailPasswordCredentials = { email, password };
    try {
      await signInWithEmail(credentials);
      // El AuthContext se encargará de la redirección o actualización del estado del UI
      console.log('Solicitud de inicio de sesión con email enviada.');
    } catch (e) {
      // El error ya se maneja y se muestra en AuthContext o a través de su estado `error`
      console.error('Fallo en handleSignIn (LoginForm):', e);
    }
  };

  /**
   * Maneja el envío del formulario para registrar un nuevo usuario.
   * @param {FormEvent<HTMLFormElement>} event - El evento del formulario.
   * @async
   */
  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      alert('Por favor, ingresa email y contraseña para registrarte.'); // Reemplazar
      return;
    }
    // Aquí podrías agregar validación de contraseña si lo deseas
    const credentials: EmailPasswordCredentials = { email, password };
    try {
      await signUpWithEmail(credentials);
      console.log('Solicitud de registro con email enviada.');
    } catch (e) {
      console.error('Fallo en handleSignUp (LoginForm):', e);
    }
  };

  // Si el usuario ya está logueado, no mostramos el formulario.
  // Esto es opcional, podrías querer mostrarlo siempre y que el AuthContext maneje la redirección.
  if (user && !loading) {
    return <></>;  // Return empty fragment when user is already logged in
  }

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', margin: '20px auto', maxWidth: '400px' }}>
      <h2 style={{ textAlign: 'center' }}>Iniciar Sesión / Registrarse</h2>

      {/* Formulario para Iniciar Sesión */}
      <form onSubmit={handleSignIn} style={{ marginBottom: '20px' }}>
        <h3 style={{ marginTop: '0' }}>Iniciar Sesión Existente</h3>
        <div>
          <label htmlFor="login-email">Email:</label>
          <input
            type="email"
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="login-password">Contraseña:</label>
          <input
            type="password"
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '10px 15px', width: '100%' }}>
          {loading ? 'Procesando...' : 'Iniciar Sesión'}
        </button>
      </form>

      <hr style={{ margin: '20px 0' }} />

      {/* Formulario para Registrarse */}
      {/* Podrías tener campos separados de email/password para el registro o reutilizar los mismos */}
      <form onSubmit={handleSignUp}>
        <h3>Crear Nueva Cuenta</h3>
        {/* Asumimos que usamos los mismos campos de email/password para simplificar */}
        {/* Si fueran diferentes, necesitarías otros estados: signUpEmail, signUpPassword */}
        <div>
          <label htmlFor="signup-email">Email (para registro):</label>
          <input
            type="email"
            id="signup-email"
            value={email} // Reutilizando el estado `email`
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
            disabled={loading}
            placeholder="Usa el campo de arriba o ingresa uno nuevo"
          />
        </div>
        <div>
          <label htmlFor="signup-password">Contraseña (para registro):</label>
          <input
            type="password"
            id="signup-password"
            value={password} // Reutilizando el estado `password`
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
            disabled={loading}
            placeholder="Usa el campo de arriba o ingresa uno nuevo"
          />
          {/* Aquí podrías añadir un campo para confirmar contraseña */}
        </div>
        <button type="submit" disabled={loading} style={{ padding: '10px 15px', width: '100%', backgroundColor: '#28a745', color: 'white', border: 'none' }}>
          {loading ? 'Procesando...' : 'Registrarse'}
        </button>
      </form>

      {loading && <p style={{ textAlign: 'center', marginTop: '10px' }}>Cargando...</p>}
      {error && (
        <p style={{ color: 'red', backgroundColor: '#ffebee', border: '1px solid red', padding: '10px', marginTop: '15px', textAlign: 'center' }}>
          Error: {error.message} (Código: {error.code})
        </p>
      )}
    </div>
  );
}