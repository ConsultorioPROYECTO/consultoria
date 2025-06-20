import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useUserRole } from './useUserRole';

export const useAuthGuard = () => {
  const { user, loading } = useAuth();
  const { userRole, userOrganizationId, isLoadingRole, error } = useUserRole();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      // Si aún está cargando la autenticación o el rol, esperar
      if (loading || isLoadingRole) {
        setIsLoading(true);
        return;
      }

      // Si no hay usuario, redirigir al login
      if (!user) {
        router.push('/login');
        setIsLoading(false);
        return;
      }

      // Si hay error obteniendo el rol, redirigir al login
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error during authentication check:', error);
        }
        router.push('/login');
        setIsLoading(false);
        return;
      }

      // Si el rol es N/A o no tiene organización, redirigir al onboarding
      if (userRole === 'N/A' || userOrganizationId === null) {
        router.push('/onboard');
        setIsLoading(false);
        return;
      }

      // Si hay usuario, rol válido y organización, autenticar
      if (userRole && userOrganizationId) {
        setIsAuthenticated(true);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [user, loading, userRole, userOrganizationId, isLoadingRole, error, router]);

  return { isAuthenticated, isLoading };
};