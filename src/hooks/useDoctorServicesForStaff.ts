'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';

interface DoctorService {
  doctorId: number;
  serviceId: number;
  customPrice: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  service: {
    id: number;
    name: string;
    code: string;
    category: string;
    basePrice: string;
    durationMinutes: number;
    description: string | null;
  };
}

interface UseDoctorServicesForStaffReturn {
  services: DoctorService[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDoctorServicesForStaff(doctorId: number | null): UseDoctorServicesForStaffReturn {
  const [services, setServices] = useState<DoctorService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAuthToken } = useAuth();

  const fetchDoctorServices = useCallback(async () => {
    if (!doctorId) {
      setServices([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      
      const response = await fetch(`/api/doctor-services/${doctorId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // La API devuelve { message, data } directamente
      if (data.data) {
        setServices(data.data);
      } else {
        // Si no hay data, podría ser un error
        throw new Error(data.error || data.message || 'Error al obtener los servicios del doctor');
      }
    } catch (err) {
      console.error('Error fetching doctor services:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, getAuthToken]);

  useEffect(() => {
    fetchDoctorServices();
  }, [fetchDoctorServices]);

  return {
    services,
    loading,
    error,
    refetch: fetchDoctorServices,
  };
}