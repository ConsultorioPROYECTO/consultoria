'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, EmailPasswordCredentials } from '@/app/context/AuthContext';
import { handleAuthError } from '@/app/(Auth)/_lib/auth-error-handler';
import type { AuthFormState, LoginFormData } from '@/app/(Auth)/_lib/auth-types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
// Removed direct Firebase imports - using AuthContext methods instead

export function LoginForm() {
  const { signInWithEmail, loading, userRole, organizationId, isLoadingRole } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' });
  const [formState, setFormState] = useState<AuthFormState>({ isLoading: false, error: null, success: false });

  // Handle navigation after successful login and role is loaded
  useEffect(() => {
    if (formState.success && !isLoadingRole && userRole !== null) {
      if (userRole === 'N/A' || !organizationId) {
        router.push('/onboard');
      } else if (userRole && organizationId) {
        router.push('/home');
      }
    }
  }, [formState.success, isLoadingRole, userRole, organizationId, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formState.isLoading || loading) return;

    setFormState({ isLoading: true, error: null, success: false });
    const credentials: EmailPasswordCredentials = { email: formData.email, password: formData.password };

    try {
      // Use AuthContext method instead of direct Firebase call
      await signInWithEmail(credentials);
      
      // La navegación se manejará en el useEffect basado en el rol
      setFormState({ isLoading: false, success: true, error: null });
      toast.success('Inicio de sesión exitoso', {
        description: 'Cargando información del usuario...'
      });
    } catch (error) {
      handleAuthError(error);
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


