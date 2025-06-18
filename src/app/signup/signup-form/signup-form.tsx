'use client'
import React from 'react';

import LoginGoogle from '../../components/auth/LoginButtonGoogle';
import { useAuth, EmailPasswordCredentials } from '@rutas/app/context/AuthContext';
import { useState } from 'react';
import { handleAuthError } from '@/app/auth-components/auth-error-handler';
import type { AuthFormState, SignupFormData } from '@/app/auth-components/auth-types';
export function SignupForm() {
  const { signUpWithEmail, loading } = useAuth();
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: ''
  });
  const [formState, setFormState] = useState<AuthFormState>({
    isLoading: false,
    error: null,
    success: false
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (formState.isLoading || loading) return;
    
    setFormState(prev => ({ ...prev, isLoading: true, error: null }));
    const credentials: EmailPasswordCredentials = { 
      email: formData.email, 
      password: formData.password 
    };
    
    try {
      await signUpWithEmail(credentials);
      setFormState(prev => ({ ...prev, success: true }));
    } catch (error) {
      handleAuthError(error, 'signup');
      setFormState(prev => ({ ...prev, error: 'Signup failed' }));
    } finally {
      setFormState(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <div className="w-full max-w-[400px] mx-auto">
      <div className="mb-8 flex flex-col items-center justify-between animate-fade-in">
        <h2 className="text-3xl font-copernicus mb-4 text-center text-gray-950">
          Crea tu cuenta para empezar
        </h2>
        <form onSubmit={handleSubmit} className="w-full">
          <div className="mb-4">
            <input 
              type="email" 
              id="email" 
              name="email" 
              placeholder="Ingresa tu correo" 
              className="w-full px-4 py-2 rounded-lg bg-stone-50 text-gray-950 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all duration-200 mb-4"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
            <input 
              type="password" 
              id="password" 
              name="password" 
              placeholder="Ingresa tu contraseña" 
              className="w-full px-4 py-2 rounded-lg bg-stone-50 text-gray-950 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all duration-200"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={formState.isLoading || loading}
            className="w-full bg-neutral-950 hover:bg-neutral-900 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {(formState.isLoading || loading) ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </>
            ) : (
              'Registrarse'
            )}
          </button>

          {/* Separador entre botones */}
          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-sm text-gray-500">o</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* Botón de Google con estilos adaptados */}
          <div className="w-full">
            <LoginGoogle/>
          </div>
        </form>
      </div>
    </div>
  );
}