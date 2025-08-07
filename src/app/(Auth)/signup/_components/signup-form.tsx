'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, EmailPasswordCredentials } from '@/app/context/AuthContext';
import { handleAuthError } from '@/app/(Auth)/_lib/auth-error-handler';
import type { AuthFormState, SignupFormData } from '@/app/(Auth)/_lib/auth-types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const { signUpWithEmail, signOut, loading } = useAuth();
  const router = useRouter();
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
      
      // Sign out to clear authentication state and avoid conflicts
      await signOut();
      
      // Redirect to login for a clean authentication flow
      router.push('/login');
    } catch (error) {
      handleAuthError(error, 'signup');
      setFormState({ isLoading: false, success: false, error: 'Failed to sign up' });
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
          placeholder="Crea una contraseña segura" 
          className="h-12"
          required 
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          disabled={formState.isLoading || loading}
        />
      </div>
      <Button type="submit" className="w-full h-12" disabled={formState.isLoading || loading}>
        {formState.isLoading || loading ? 'Procesando...' : 'Crear Cuenta'}
      </Button>
    </form>
  );
}
