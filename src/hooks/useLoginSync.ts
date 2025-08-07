import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

/**
 * Hook específico para manejar la sincronización del usuario después del login
 * No envía correos de verificación automáticamente - esa lógica está en login-form
 */
export function useLoginSync() {
  const { user } = useAuth();
  const router = useRouter();

  const syncUser = useCallback(async (currentUser: typeof user) => {
    if (!currentUser) return;

    // Si el email no está verificado, no hacer nada
    // La validación se maneja en login-form.tsx
    if (!currentUser.emailVerified) {
      return;
    }

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
        return;
      }

      const syncedUserData = await response.json();
      
      // Acceder a los datos correctamente desde la estructura de respuesta
      const userRole = syncedUserData.data?.userRole || syncedUserData.userRole;
      const organizationId = syncedUserData.data?.organizationId || syncedUserData.organizationId;

      if (userRole === 'N/A' || organizationId === null || organizationId === undefined) {
        router.push('/onboard');
      } else if (userRole && organizationId) {
        router.push('/home');
      } else {
        // Caso de seguridad: si no cumple ninguna condición, ir a onboard
        router.push('/onboard');
      }
    } catch {
      router.push('/onboard');
    }
  }, [router]);

  useEffect(() => {
    if (user) {
      syncUser(user);
    }
  }, [user, syncUser]);

  return { syncUser };
}