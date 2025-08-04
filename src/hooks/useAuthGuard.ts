import { useAuth } from '../app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';

export const useAuthGuard = () => {
  const { user, loading, userRole, organizationId, isLoadingRole } = useAuth();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const hasRedirectedRef = useRef(false);
  const lastAuthStateRef = useRef<string>('');

  // Función memoizada para manejar redirecciones
  const handleRedirect = useCallback((path: string) => {
    if (!hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      setIsAuthenticated(false);
      router.push(path);
    }
  }, [router]);

  useEffect(() => {
    // Si aún está cargando, no hacer nada
    if (loading || isLoadingRole) return;

    // Crear un estado único para evitar re-ejecuciones innecesarias
    const currentAuthState = `${!!user}-${userRole}-${organizationId}-${loading}-${isLoadingRole}`;
    
    // Si el estado no ha cambiado, no hacer nada
    if (lastAuthStateRef.current === currentAuthState) return;
    lastAuthStateRef.current = currentAuthState;

    // Reset redirect flag cuando hay cambios en el estado de auth
    hasRedirectedRef.current = false;

    // Usuario no autenticado
    if (!user) {
      handleRedirect('/login');
      return;
    }

    // Usuario autenticado pero sin rol
    if (!userRole) {
      console.error('Error al obtener el rol del usuario');
      handleRedirect('/login');
      return;
    }

    // Usuario necesita completar onboarding
    if (userRole === 'N/A') {
      handleRedirect('/onboard');
      return;
    }

    // Usuario sin organización - redirigir a onboard para que se una a una organización
    if (!organizationId) {
      console.warn('Usuario sin organización asignada');
      handleRedirect('/onboard');
      return;
    }

    // Usuario completamente autenticado
    setIsAuthenticated(true);
  }, [user, userRole, organizationId, loading, isLoadingRole, handleRedirect]);

  return {
    isAuthenticated,
    isLoading: loading || isLoadingRole,
    user,
    userRole,
    organizationId,
  };
};