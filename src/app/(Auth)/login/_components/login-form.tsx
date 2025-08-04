'use client'

import React, { useState } from 'react';
import { useAuth, EmailPasswordCredentials } from '@/app/context/AuthContext';
import { handleAuthError } from '@/app/(Auth)/_lib/auth-error-handler';
import type { AuthFormState, LoginFormData } from '@/app/(Auth)/_lib/auth-types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const { signInWithEmail, loading } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' });
  const [formState, setFormState] = useState<AuthFormState>({ isLoading: false, error: null, success: false });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formState.isLoading || loading) return;

    setFormState({ isLoading: true, error: null, success: false });
    const credentials: EmailPasswordCredentials = { email: formData.email, password: formData.password };

    try {
      await signInWithEmail(credentials);
      setFormState({ isLoading: false, success: true, error: null });
    } catch (error) {
      handleAuthError(error, 'login');
      setFormState({ isLoading: false, success: false, error: 'Failed to sign in' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid gap-4 px-4 lg:px-0">
      <div className="space-y-2">
        <Label htmlFor="email">Correo Electrónico</Label>
        <Input 
          id="email" 
          type="email" 
          className="h-12"
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
          placeholder="Tu contraseña" 
          className='h-12'
          required 
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          disabled={formState.isLoading || loading}
        />
      </div>
      <Button type="submit" className="w-full h-12" disabled={formState.isLoading || loading}>
        {formState.isLoading || loading ? 'Procesando...' : 'Continuar'}
      </Button>
      

    </form>
  );
}


