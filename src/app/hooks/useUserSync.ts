import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { sendEmailVerification } from 'firebase/auth';

export function useUserSync() {
  const { user } = useAuth();
  const router = useRouter();

  const syncUser = useCallback(async (currentUser: typeof user) => {
    if (!currentUser) return;

    if (!currentUser.emailVerified) {
      try {
        await sendEmailVerification(currentUser);
        alert('Te hemos enviado un correo de verificación. Por favor, verifica tu correo antes de continuar.');
      } catch (error) {
        console.error('Error al enviar correo de verificación:', error);
      }
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
        const errorData = await response.json();
        console.error('Error al sincronizar usuario:', errorData.details || response.statusText);
        return;
      }

      const syncedUserData = await response.json();
      
      // Acceder a los datos correctamente desde la estructura de respuesta
      const userRole = syncedUserData.data?.userRole || syncedUserData.userRole;
      const organizationId = syncedUserData.data?.organizationId || syncedUserData.organizationId;

      if (userRole === 'N/A' || organizationId === null || organizationId === undefined) {
        router.push('/onboard');
      } else if (userRole && organizationId) {
        router.push('/dashboard');
      } else {
        // Caso de seguridad: si no cumple ninguna condición, ir a onboard
        router.push('/onboard');
      }
    } catch (error) {
      console.error('Error en la llamada de sincronización:', error);
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