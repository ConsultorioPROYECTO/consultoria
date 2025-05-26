import { useState, useEffect } from 'react';
import { getFirebaseAuthToken } from '@/app/lib/firebase/clientUtils';

export interface DoctorService {
  doctorId: number;
  serviceId: number;
  customPrice?: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
  doctor: {
    idDoctor: number;
    speciality: string;
    user: {
      displayName: string;
      organizationId: number;
    };
  };
  service: {
    id: number;
    name: string;
    code: string;
    category: string;
    basePrice: string;
    durationMinutes: number;
    description?: string;
  };
}

interface DoctorServicesResponse {
  doctorServices: DoctorService[];
  total: number;
}

interface UseDoctorServicesReturn {
  doctorServices: DoctorService[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDoctorServices(): UseDoctorServicesReturn {
  const [doctorServices, setDoctorServices] = useState<DoctorService[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctorServices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getFirebaseAuthToken();
      const response = await fetch('/api/doctor-services', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const data = result.data as DoctorServicesResponse;
      
      setDoctorServices(data.doctorServices || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar relaciones doctor-servicio');
      setDoctorServices([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorServices();
  }, []);

  return {
    doctorServices,
    total,
    loading,
    error,
    refetch: fetchDoctorServices,
  };
}