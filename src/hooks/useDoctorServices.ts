import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { DoctorService } from '@/db/schema';

// Tipo extendido para el hook que incluye relaciones
export interface DoctorServiceWithRelations extends DoctorService {
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
  doctorServices: DoctorServiceWithRelations[];
  total: number;
}

interface UseDoctorServicesReturn {
  doctorServices: DoctorServiceWithRelations[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDoctorServices(): UseDoctorServicesReturn {
  const [doctorServices, setDoctorServices] = useState<DoctorServiceWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAuthToken } = useAuth();

  const fetchDoctorServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      
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
  }, [getAuthToken]);

  useEffect(() => {
    fetchDoctorServices();
  }, [fetchDoctorServices]);

  return {
    doctorServices,
    total,
    loading,
    error,
    refetch: fetchDoctorServices,
  };
}