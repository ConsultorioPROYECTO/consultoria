import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export const useAuthGuard = () => {
  const { user, loading, userRole, organizationId, isLoadingRole } = useAuth();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (loading || isLoadingRole) return;

    if (!user) {
      if (!hasRedirected) {
        setHasRedirected(true);
        setIsAuthenticated(false);
        router.push('/login');
      }
      return;
    }

    // Reset redirect flag when user is present
    setHasRedirected(false);

    if (!userRole || !organizationId) {
      console.error('Error al obtener el rol del usuario');
      if (!hasRedirected) {
        setHasRedirected(true);
        setIsAuthenticated(false);
        router.push('/login');
      }
      return;
    }

    if (userRole === 'N/A') {
      if (!hasRedirected) {
        setHasRedirected(true);
        setIsAuthenticated(false);
        router.push('/onboard');
      }
      return;
    }

    setIsAuthenticated(true);
  }, [user, userRole, organizationId, loading, isLoadingRole, router, hasRedirected]);

  return {
    isAuthenticated,
    isLoading: loading || isLoadingRole,
    user,
    userRole,
    organizationId,
  };
};