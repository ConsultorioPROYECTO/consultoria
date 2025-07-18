import { usePatientsData } from '@/app/context/DashboardDataContext';

// Tipo extendido para el hook que incluye relaciones
export interface PatientWithRelations {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  identificationType: string;
  identificationNumber: string;
  isActive: boolean;
  organizationId: number;
  appointments?: Array<{
    id: number;
    date: Date;
    time: string;
    status: 'Confirmada' | 'Completada' | 'Pendiente' | 'Llegó';
    service: {
      name: string;
      category: string;
    };
    doctor: {
      user: {
        displayName: string;
      };
    };
  }>;
}

interface UsePatientsReturn {
  patients: PatientWithRelations[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePatients(): UsePatientsReturn {
  const {
    patients,
    loading,
    error,
    refetch
  } = usePatientsData();

  return {
    patients,
    loading,
    error,
    refetch
  };
}