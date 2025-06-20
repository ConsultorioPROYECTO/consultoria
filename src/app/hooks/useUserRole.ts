'use client';
import { useState, useEffect } from 'react';
import { getFirebaseAuthToken } from '@rutas/app/lib/firebase/clientUtils';
import { useAuth } from '../context/AuthContext';

export interface FetchRolUser {
  role: string;
  organizationId: number | null;
}

export type UserRole = 'medico' | 'asistente' | 'admin' | 'N/A' | null;

// Cache simple para el rol y organización del usuario
let roleCache: { userId: string; role: UserRole; organizationId: number | null; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

const fetchRolUser = async (): Promise<FetchRolUser | null> => {
  try {
    const token = await getFirebaseAuthToken();

    if (!token) {
      if (process.env.NODE_ENV === 'development') {
        console.error('No se pudo obtener el token de autenticación.');
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.error(`HTTP error! Status: ${response.status}`);
      }
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data: FetchRolUser = await response.json();
    if (process.env.NODE_ENV === 'development') {
      console.log('Rol obtenido exitosamente:', data);
    }
    return data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching user role:', error);
    }
    return null;
  }
};

export const useUserRole = () => {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userOrganizationId, setUserOrganizationId] = useState<number | null>(null);
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
        setUserOrganizationId(roleCache.organizationId);
        setIsLoadingRole(false);
        return;
      }

      try {
        setIsLoadingRole(true);
        setError(null);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Iniciando obtención de rol para usuario:', userId);
        }
        
        const roleData = await fetchRolUser();
        
        if (roleData?.role) {
          const role = roleData.role as UserRole;
          const organizationId = roleData.organizationId;
          setUserRole(role);
          setUserOrganizationId(organizationId);
          
          // Actualizar cache
          roleCache = {
            userId,
            role,
            organizationId,
            timestamp: now
          };
          
          if (process.env.NODE_ENV === 'development') {
            console.log('Rol y organización establecidos exitosamente:', { role, organizationId });
          }
        } else {
          const errorMsg = 'No se pudo obtener el rol del usuario';
          setError(errorMsg);
          if (process.env.NODE_ENV === 'development') {
            console.error(errorMsg, 'roleData:', roleData);
          }
        }
      } catch (err) {
        const errorMsg = 'Error al obtener el rol del usuario';
        setError(errorMsg);
        if (process.env.NODE_ENV === 'development') {
          console.error(errorMsg, err);
        }
      } finally {
        setIsLoadingRole(false);
      }
    };

    getUserRole();
  }, [user, loading]);

  return { userRole, userOrganizationId, isLoadingRole, error };
};