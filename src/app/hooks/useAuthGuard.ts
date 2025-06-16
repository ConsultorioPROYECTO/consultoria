import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { getFirebaseAuthToken } from '@rutas/app/lib/firebase/clientUtils';

export interface FetchRolUser {
  role: string;
}

const fetchRolUser = async (): Promise<FetchRolUser | null> => {
  try {
    const token = await getFirebaseAuthToken();

    if (!token) {
      console.error('No se pudo obtener el token de autenticación.');
      return null;
    }

    const response = await fetch('/api/users/rol', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data: FetchRolUser = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
};

export const useAuthGuard = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (loading) return;

      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const roleData = await fetchRolUser();
        
        if (roleData?.role === 'N/A') {
          router.push('/onboard');
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error during authentication check:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [user, loading, router]);

  return { isAuthenticated, isLoading };
};