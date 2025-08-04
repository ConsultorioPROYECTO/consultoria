import { useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { sendEmailVerification } from 'firebase/auth';
import { toast } from 'sonner';

/**
 * Hook específico para manejar la sincronización del usuario después del registro
 * Maneja la verificación de email y redirección al onboarding
 */
export function useSignupSync() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitacionCode = searchParams.get('invitacionCode');
  const role = searchParams.get('role');

  const syncUser = useCallback(async (currentUser: typeof user) => {
    if (!currentUser) return;

    // Si el email no está verificado, enviar verificación
    if (!currentUser.emailVerified) {
      try {
        await sendEmailVerification(currentUser);
        toast.success('Correo de verificación enviado', {
          description: 'Te hemos enviado un correo de verificación. Por favor, verifica tu correo antes de continuar.'
        });
      } catch (error) {
        console.error('Error al enviar correo de verificación:', error);
        toast.error('Error al enviar correo de verificación');
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
        const errorData = await response.json();
        console.error('Error al sincronizar usuario tras registro:', errorData.details || response.statusText);
        toast.error('Error al sincronizar usuario');
        return;
      }

      await response.json();
      
      // Redireccionar al onboarding con parámetros
      const onboardUrl = new URL('/onboard', window.location.origin);
      if (invitacionCode) onboardUrl.searchParams.append('invitacionCode', invitacionCode);
      if (role) onboardUrl.searchParams.append('role', role);
      router.push(onboardUrl.toString());
      
    } catch (error) {
      console.error('Error en la llamada de sincronización tras registro:', error);
      toast.error('Error en la sincronización');
    }
  }, [router, invitacionCode, role]);

  useEffect(() => {
    if (user) {
      syncUser(user);
    }
  }, [user, syncUser]);

  return { syncUser };
}