import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import type { OrganizationAssistantDoctorAppointmentsResponse } from '@/app/api/master/organization-asistant-doctor-appointments/route';

interface UseDoctorsWithAppointmentsReturn {
  doctors: OrganizationAssistantDoctorAppointmentsResponse;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDoctorsWithAppointments(): UseDoctorsWithAppointmentsReturn {
  const [doctors, setDoctors] = useState<OrganizationAssistantDoctorAppointmentsResponse>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAuthToken } = useAuth();

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      
      const response = await fetch('/api/master/organization-asistant-doctor-appointments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setDoctors(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  return {
    doctors,
    loading,
    error,
    refetch: fetchDoctors,
  };
}