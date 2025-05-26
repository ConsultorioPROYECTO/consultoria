import { useState, useEffect } from 'react';
import { getFirebaseAuthToken } from '@lib/firebase/clientUtils';
import type { DoctorsWithAppointmentsResponse } from '@/types/api';

interface UseDoctorsWithAppointmentsReturn {
  doctors: DoctorsWithAppointmentsResponse;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDoctorsWithAppointments(): UseDoctorsWithAppointmentsReturn {
  const [doctors, setDoctors] = useState<DoctorsWithAppointmentsResponse>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getFirebaseAuthToken();
      const response = await fetch('/api/assitantants/doctors-with-appointments', {
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