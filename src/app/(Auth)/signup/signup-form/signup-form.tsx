'use client'

import React, { useState } from 'react';
import { useAuth, EmailPasswordCredentials } from '@/app/context/AuthContext';
import { handleAuthError } from '@/app/auth-components/auth-error-handler';
import type { AuthFormState, SignupFormData } from '@/app/auth-components/auth-types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoginGoogle from '../../../components/auth/LoginButtonGoogle';

export function SignupForm() {
  const { signUpWithEmail, loading } = useAuth();
  const [formData, setFormData] = useState<SignupFormData>({ email: '', password: '' });
  const [formState, setFormState] = useState<AuthFormState>({ isLoading: false, error: null, success: false });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formState.isLoading || loading) return;

    setFormState({ isLoading: true, error: null, success: false });
    const credentials: EmailPasswordCredentials = { email: formData.email, password: formData.password };

    try {
      await signUpWithEmail(credentials);
      setFormState({ isLoading: false, success: true, error: null });
    } catch (error) {
      handleAuthError(error, 'signup');
      setFormState({ isLoading: false, success: false, error: 'Failed to sign up' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Correo Electrónico</Label>
        <Input 
          id="email" 
          type="email" 
          placeholder="tu@email.com" 
          required 
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          disabled={formState.isLoading || loading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input 
          id="password" 
          type="password" 
          placeholder="Crea una contraseña segura" 
          required 
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          disabled={formState.isLoading || loading}
        />
      </div>
      <Button type="submit" className="w-full" disabled={formState.isLoading || loading}>
        {formState.isLoading || loading ? 'Procesando...' : 'Crear Cuenta'}
      </Button>

      <div className="relative flex py-3 items-center">
        <div className="flex-grow border-t border-muted"></div>
        <span className="flex-shrink mx-4 text-xs text-muted-foreground">O CONTINUAR CON</span>
        <div className="flex-grow border-t border-muted"></div>
      </div>

      <LoginGoogle />
    </form>
  );
}
