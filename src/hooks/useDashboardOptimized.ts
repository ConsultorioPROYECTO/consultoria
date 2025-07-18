'use client';

import { useCallback, useMemo } from 'react';
import { useDashboardData } from '@/app/context/DashboardDataContext';

// Re-exportar tipos necesarios
export type { MedicalServiceWithRelations } from '@/hooks/useMedicalServices';
export type { PatientWithRelations } from '@/hooks/usePatients';

/**
 * Hook optimizado para manejar múltiples peticiones del dashboard
 * Evita peticiones duplicadas y proporciona un estado consolidado
 */
export function useDashboardOptimized() {
  const {
    state,
    fetchMedicalServices,
    fetchDoctorServices,
    fetchPatients,
    fetchUsers,
    refreshAll
  } = useDashboardData();

  // Estado consolidado de carga
  const isLoading = useMemo(() => {
    return (
      state.medicalServices.loading ||
      state.doctorServices.loading ||
      state.patients.loading ||
      state.users.loading
    );
  }, [
    state.medicalServices.loading,
    state.doctorServices.loading,
    state.patients.loading,
    state.users.loading
  ]);

  // Estado consolidado de errores
  const errors = useMemo(() => {
    const errorList = [];
    if (state.medicalServices.error) errorList.push(`Servicios médicos: ${state.medicalServices.error}`);
    if (state.doctorServices.error) errorList.push(`Servicios de doctores: ${state.doctorServices.error}`);
    if (state.patients.error) errorList.push(`Pacientes: ${state.patients.error}`);
    if (state.users.error) errorList.push(`Usuarios: ${state.users.error}`);
    return errorList;
  }, [
    state.medicalServices.error,
    state.doctorServices.error,
    state.patients.error,
    state.users.error
  ]);

  // Función para cargar datos específicos
  const loadData = useCallback(async (dataTypes: Array<'medicalServices' | 'doctorServices' | 'patients' | 'users'>) => {
    const promises = [];
    
    if (dataTypes.includes('medicalServices')) {
      promises.push(fetchMedicalServices());
    }
    if (dataTypes.includes('doctorServices')) {
      promises.push(fetchDoctorServices());
    }
    if (dataTypes.includes('patients')) {
      promises.push(fetchPatients());
    }
    if (dataTypes.includes('users')) {
      promises.push(fetchUsers());
    }

    await Promise.all(promises);
  }, [fetchMedicalServices, fetchDoctorServices, fetchPatients, fetchUsers]);

  // Función para refrescar datos específicos
  const refreshData = useCallback(async (dataTypes: Array<'medicalServices' | 'doctorServices' | 'patients' | 'users'>) => {
    const promises = [];
    
    if (dataTypes.includes('medicalServices')) {
      promises.push(fetchMedicalServices(true));
    }
    if (dataTypes.includes('doctorServices')) {
      promises.push(fetchDoctorServices(true));
    }
    if (dataTypes.includes('patients')) {
      promises.push(fetchPatients(true));
    }
    if (dataTypes.includes('users')) {
      promises.push(fetchUsers(true));
    }

    await Promise.all(promises);
  }, [fetchMedicalServices, fetchDoctorServices, fetchPatients, fetchUsers]);

  // Estadísticas de datos
  const stats = useMemo(() => {
    const medicalServicesData = Array.isArray(state.medicalServices.data) ? state.medicalServices.data : [];
    const doctorServicesData = Array.isArray(state.doctorServices.data) ? state.doctorServices.data : [];
    const patientsData = Array.isArray(state.patients.data) ? state.patients.data : [];
    const usersData = Array.isArray(state.users.data) ? state.users.data : [];
    
    return {
      medicalServicesCount: medicalServicesData.length,
      doctorServicesCount: doctorServicesData.length,
      patientsCount: patientsData.length,
      usersCount: usersData.length,
      totalActiveServices: medicalServicesData.filter(service => service.isActive).length,
      totalActiveDoctorServices: doctorServicesData.filter(ds => ds.isActive).length,
    };
  }, [
    state.medicalServices.data,
    state.doctorServices.data,
    state.patients.data,
    state.users.data
  ]);

  // Función para obtener servicios por categoría
  const getServicesByCategory = useCallback(() => {
    const medicalServicesData = Array.isArray(state.medicalServices.data) ? state.medicalServices.data : [];
    const servicesByCategory = medicalServicesData.reduce((acc, service) => {
      const category = service.category || 'Sin categoría';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(service);
      return acc;
    }, {} as Record<string, typeof medicalServicesData>);

    return servicesByCategory;
  }, [state.medicalServices.data]);

  // Función para obtener doctores con sus servicios
  const getDoctorsWithServices = useCallback(() => {
    const doctorServicesData = Array.isArray(state.doctorServices.data) ? state.doctorServices.data : [];
    const doctorsMap = new Map();
    
    doctorServicesData.forEach(ds => {
      const doctorKey = `${ds.doctor.firstName} ${ds.doctor.lastName}`;
      if (!doctorsMap.has(doctorKey)) {
        doctorsMap.set(doctorKey, {
          doctor: ds.doctor,
          services: []
        });
      }
      doctorsMap.get(doctorKey).services.push(ds.service);
    });

    return Array.from(doctorsMap.values());
  }, [state.doctorServices.data]);

  return {
    // Estados de datos
    medicalServices: Array.isArray(state.medicalServices.data) ? state.medicalServices.data : [],
    doctorServices: Array.isArray(state.doctorServices.data) ? state.doctorServices.data : [],
    patients: Array.isArray(state.patients.data) ? state.patients.data : [],
    users: Array.isArray(state.users.data) ? state.users.data : [],
    
    // Estados de carga y error
    isLoading,
    errors,
    hasErrors: errors.length > 0,
    
    // Estadísticas
    stats,
    
    // Funciones de utilidad
    getServicesByCategory,
    getDoctorsWithServices,
    
    // Funciones de carga
    loadData,
    refreshData,
    refreshAll,
    
    // Estados individuales para casos específicos
    loadingStates: {
      medicalServices: state.medicalServices.loading,
      doctorServices: state.doctorServices.loading,
      patients: state.patients.loading,
      users: state.users.loading
    },
    
    errorStates: {
      medicalServices: state.medicalServices.error,
      doctorServices: state.doctorServices.error,
      patients: state.patients.error,
      users: state.users.error
    }
  };
}

/**
 * Hook específico para componentes que solo necesitan servicios médicos y doctores
 */
export function useServicesData() {
  const {
    medicalServices,
    doctorServices,
    loadingStates,
    errorStates,
    getServicesByCategory,
    getDoctorsWithServices,
    loadData,
    refreshData
  } = useDashboardOptimized();

  const isLoading = loadingStates.medicalServices || loadingStates.doctorServices;
  const hasErrors = !!errorStates.medicalServices || !!errorStates.doctorServices;

  return {
    medicalServices,
    doctorServices,
    isLoading,
    hasErrors,
    errors: {
      medicalServices: errorStates.medicalServices,
      doctorServices: errorStates.doctorServices
    },
    getServicesByCategory,
    getDoctorsWithServices,
    loadData: () => loadData(['medicalServices', 'doctorServices']),
    refreshData: () => refreshData(['medicalServices', 'doctorServices'])
  };
}

/**
 * Hook específico para componentes que solo necesitan pacientes
 */
export function usePatientsOnly() {
  const {
    patients,
    loadingStates,
    errorStates,
    stats,
    loadData,
    refreshData
  } = useDashboardOptimized();

  return {
    patients,
    isLoading: loadingStates.patients,
    error: errorStates.patients,
    patientsCount: stats.patientsCount,
    loadData: () => loadData(['patients']),
    refreshData: () => refreshData(['patients'])
  };
}

/**
 * Hook específico para componentes administrativos que necesitan usuarios
 */
export function useUsersOnly() {
  const {
    users,
    loadingStates,
    errorStates,
    stats,
    loadData,
    refreshData
  } = useDashboardOptimized();

  return {
    users,
    isLoading: loadingStates.users,
    error: errorStates.users,
    usersCount: stats.usersCount,
    loadData: () => loadData(['users']),
    refreshData: () => refreshData(['users'])
  };
}