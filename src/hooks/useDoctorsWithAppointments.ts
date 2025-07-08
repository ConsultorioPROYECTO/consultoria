import { useState, useEffect } from 'react';
import { getFirebaseAuthToken } from '@lib/firebase/clientUtils';
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

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getFirebaseAuthToken();
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
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  return {
    doctors,
    loading,
    error,
    refetch: fetchDoctors,
  };
}