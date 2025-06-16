'use client';
import { useState, useEffect } from 'react';
import { getFirebaseAuthToken } from '@rutas/app/lib/firebase/clientUtils';
import { useAuth } from '../context/AuthContext';

export interface FetchRolUser {
  role: string;
}

export type UserRole = 'medico' | 'asistente' | 'admin' | null;

// Cache simple para el rol del usuario
let roleCache: { userId: string; role: UserRole; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

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

export const useUserRole = () => {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getUserRole = async () => {
      if (loading || !user) {
        setIsLoadingRole(false);
        return;
      }

      const userId = user.uid;
      const now = Date.now();

      // Verificar cache
      if (roleCache && 
          roleCache.userId === userId && 
          (now - roleCache.timestamp) < CACHE_DURATION) {
        setUserRole(roleCache.role);
        setIsLoadingRole(false);
        return;
      }

      try {
        setIsLoadingRole(true);
        setError(null);
        
        const roleData = await fetchRolUser();
        
        if (roleData?.role) {
          const role = roleData.role as UserRole;
          setUserRole(role);
          
          // Actualizar cache
          roleCache = {
            userId,
            role,
            timestamp: now
          };
        } else {
          setError('No se pudo obtener el rol del usuario');
        }
      } catch (err) {
        setError('Error al obtener el rol del usuario');
        console.error('Error fetching user role:', err);
      } finally {
        setIsLoadingRole(false);
      }
    };

    getUserRole();
  }, [user, loading]);

  return { userRole, isLoadingRole, error };
};