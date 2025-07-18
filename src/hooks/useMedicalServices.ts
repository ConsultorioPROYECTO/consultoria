import { useMedicalServicesData } from '@/app/context/DashboardDataContext';

interface MedicalServiceWithRelations {
  id: number;
  name: string;
  description: string | null;
  code: string;
  durationMinutes: number;
  basePrice: string;
  category: string;
  isActive: boolean;
  organizationId: number;
  appointments?: Array<{
    id: string;
    status: string;
    scheduledAt: string;
    patient?: {
      firstName: string;
      lastName: string;
    };
  }>;
  doctorServices?: Array<{
    id: string;
    customPrice?: number;
    isActive: boolean;
    doctor: {
      id: string;
      firstName: string;
      lastName: string;
      specialty?: string;
    };
  }>;
}

interface UseMedicalServicesReturn {
  services: MedicalServiceWithRelations[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMedicalServices(): UseMedicalServicesReturn {
  const {
    medicalServices,
    loading,
    error,
    refetch
  } = useMedicalServicesData();

  return {
    services: medicalServices,
    loading,
    error,
    refetch
  };
}

export type { MedicalServiceWithRelations };