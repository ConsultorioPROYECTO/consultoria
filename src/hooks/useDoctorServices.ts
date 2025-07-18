import { useDoctorServicesData } from '@/app/context/DashboardDataContext';

interface DoctorServiceWithRelations {
  id: number;
  doctorId: number;
  serviceId: number;
  isActive: boolean;
  doctor: {
    id: number;
    firstName: string;
    lastName: string;
  };
  service: {
    id: number;
    name: string;
    category: string;
  };
}

interface UseDoctorServicesReturn {
  doctorServices: DoctorServiceWithRelations[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDoctorServices(): UseDoctorServicesReturn {
  const {
    doctorServices,
    loading,
    error,
    refetch
  } = useDoctorServicesData();

  return {
    doctorServices,
    loading,
    error,
    refetch
  };
}

export type { DoctorServiceWithRelations };