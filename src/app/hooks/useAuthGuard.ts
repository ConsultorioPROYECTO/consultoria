import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export const useAuthGuard = () => {
  const { user, loading, userRole, organizationId, isLoadingRole } = useAuth();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (loading || isLoadingRole) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!userRole || !organizationId) {
      console.error('Error al obtener el rol del usuario');
      router.push('/login');
      return;
    }

    if (userRole === 'N/A') {
      router.push('/onboard');
      return;
    }

    setIsAuthenticated(true);
  }, [user, userRole, organizationId, loading, isLoadingRole, router]);

  return {
    isAuthenticated,
    isLoading: loading || isLoadingRole,
    user,
    userRole,
    organizationId,
  };
};