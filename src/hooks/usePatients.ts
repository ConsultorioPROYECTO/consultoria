import { useState, useEffect } from 'react';
import { getFirebaseAuthToken } from '@/app/lib/firebase/clientUtils';
import { Patient } from '@/db/schema';

// Tipo extendido para el hook que incluye relaciones
export interface PatientWithRelations extends Patient {
  appointments?: Array<{
    id: number;
    date: Date;
    time: string;
    status: 'Confirmada' | 'Completada' | 'Pendiente' | 'Llegó';
    doctor: {
      speciality: string;
    };
    service: {
      name: string;
      category: string;
    };
  }>;
}

interface UsePatientsReturn {
  patients: PatientWithRelations[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePatients(): UsePatientsReturn {
  const [patients, setPatients] = useState<PatientWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getFirebaseAuthToken();
      const response = await fetch('/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setPatients(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar pacientes');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  return {
    patients,
    loading,
    error,
    refetch: fetchPatients,
  };
}