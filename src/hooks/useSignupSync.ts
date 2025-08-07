import { useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { sendEmailVerification } from 'firebase/auth';
import { toast } from 'sonner';

/**
 * Hook específico para manejar la sincronización del usuario después del registro
 * Maneja la verificación de email y redirección al onboarding
 * Solo se ejecuta en la página de signup para evitar interferencias
 */
export function useSignupSync() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const invitacionCode = searchParams.get('invitacionCode');
  const role = searchParams.get('role');
  
  // Ref para trackear usuarios que ya han recibido correo de verificación
  const sentVerificationEmailsRef = useRef(new Set<string>());

  const syncUser = useCallback(async (currentUser: typeof user) => {
    if (!currentUser) return;
    
    // Solo ejecutar si estamos en la página de signup
    if (!pathname.includes('/signup')) {
      return;
    }

    // Si el email no está verificado, enviar verificación
    if (!currentUser.emailVerified) {
      // Verificar si ya se envió correo para este usuario
      if (sentVerificationEmailsRef.current.has(currentUser.uid)) {
        return; // Ya se envió correo para este usuario
      }
      
      try {
        await sendEmailVerification(currentUser);
        // Marcar que se envió correo para este usuario
        sentVerificationEmailsRef.current.add(currentUser.uid);
        toast.success('Correo de verificación enviado', {
          description: 'Te hemos enviado un correo de verificación. Por favor, verifica tu correo antes de continuar.'
        });
      } catch {
        toast.error('Error al enviar correo de verificación');
        // No agregar al Set si hay error, para permitir reintento
      }
      return;
    }

    // Sincronizar usuario con la base de datos
    try {
      const userData = {
        firebaseUid: currentUser.uid,
        email: currentUser.email,
        emailVerified: currentUser.emailVerified,
        phoneNumber: currentUser.phoneNumber,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        providerId: currentUser.providerData?.[0]?.providerId || 'password',
      };

      const response = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        toast.error('Error al sincronizar usuario');
        return;
      }

      await response.json();
      
      // Redireccionar al onboarding con parámetros
      const onboardUrl = new URL('/onboard', window.location.origin);
      if (invitacionCode) onboardUrl.searchParams.append('invitacionCode', invitacionCode);
      if (role) onboardUrl.searchParams.append('role', role);
      router.push(onboardUrl.toString());
      
    } catch {
      toast.error('Error en la sincronización');
    }
  }, [router, invitacionCode, role, pathname]);

  useEffect(() => {
    if (user) {
      syncUser(user);
    }
  }, [user, syncUser]);

  return { syncUser };
}