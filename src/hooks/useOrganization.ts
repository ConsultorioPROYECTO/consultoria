import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/app/context/AuthContext';

interface OrganizationData {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  nit?: string;
  timezone?: string;
  currency?: string;
  logo?: string;
  invitationCode?: string;
  planId?: string;
  instanceId?: string;
  apiKey?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UpdateOrganizationData {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  nit?: string;
  timezone?: string;
  currency?: string;
}

interface UseOrganizationReturn {
  organization: OrganizationData | null;
  loading: boolean;
  error: string | null;
  updateOrganization: (data: UpdateOrganizationData) => Promise<boolean>;
  refreshOrganization: () => Promise<void>;
}

export const useOrganization = (): UseOrganizationReturn => {
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAuthToken } = useAuth();

  const fetchOrganization = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      
      const response = await fetch('/api/organization', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setOrganization(data.organization || data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error al obtener información de la organización:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  const updateOrganization = async (updateData: UpdateOrganizationData): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      const response = await fetch('/api/organization', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setOrganization(data.organization);
      
      toast.success('Información de la organización actualizada correctamente');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error(`Error al actualizar la organización: ${errorMessage}`);
      console.error('Error al actualizar la organización:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshOrganization = async () => {
    await fetchOrganization();
  };

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  return {
    organization,
    loading,
    error,
    updateOrganization,
    refreshOrganization,
  };
};