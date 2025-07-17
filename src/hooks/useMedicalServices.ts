import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { MedicalService } from '@/db/schema';

// Tipo extendido para el hook que incluye relaciones
export interface MedicalServiceWithRelations extends MedicalService {
  doctorServices?: Array<{
    doctorId: number;
    customPrice?: string;
    isAvailable: boolean;
    doctor: {
      idDoctor: number;
      speciality: string;
      user: {
        displayName: string;
      };
    };
  }>;
  appointments?: Array<{
    id: number;
    date: Date;
    time: string;
    status: 'Confirmada' | 'Completada' | 'Pendiente' | 'Llegó';
    patient: {
      firstName: string;
      lastName: string;
      patientCode: string;
    };
  }>;
}

interface UseMedicalServicesReturn {
  services: MedicalServiceWithRelations[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMedicalServices(): UseMedicalServicesReturn {
  const [services, setServices] = useState<MedicalServiceWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAuthToken } = useAuth();

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      
      const response = await fetch('/api/medical-services', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setServices(result.data?.services || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar servicios médicos');
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    services,
    loading,
    error,
    refetch: fetchServices,
  };
}