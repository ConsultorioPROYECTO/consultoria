'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

// Mapa de promesas pendientes para evitar peticiones duplicadas
const pendingRequests = new Map<string, Promise<unknown>>();

// Tipos de datos
interface MedicalService {
  id: number;
  name: string;
  description: string | null;
  code: string;
  durationMinutes: number;
  basePrice: string;
  category: string;
  isActive: boolean;
  organizationId: number;
}

interface DoctorService {
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

interface Patient {
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
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  organizationId: number;
}

// Estado del contexto
interface DashboardDataState {
  medicalServices: {
    data: MedicalService[];
    loading: boolean;
    error: string | null;
    lastFetch: number | null;
  };
  doctorServices: {
    data: DoctorService[];
    loading: boolean;
    error: string | null;
    lastFetch: number | null;
  };
  patients: {
    data: Patient[];
    loading: boolean;
    error: string | null;
    lastFetch: number | null;
  };
  users: {
    data: User[];
    loading: boolean;
    error: string | null;
    lastFetch: number | null;
  };
}

// Acciones del reducer
type DashboardDataAction =
  | { type: 'SET_MEDICAL_SERVICES_LOADING'; payload: boolean }
  | { type: 'SET_MEDICAL_SERVICES_SUCCESS'; payload: MedicalService[] }
  | { type: 'SET_MEDICAL_SERVICES_ERROR'; payload: string }
  | { type: 'SET_DOCTOR_SERVICES_LOADING'; payload: boolean }
  | { type: 'SET_DOCTOR_SERVICES_SUCCESS'; payload: DoctorService[] }
  | { type: 'SET_DOCTOR_SERVICES_ERROR'; payload: string }
  | { type: 'SET_PATIENTS_LOADING'; payload: boolean }
  | { type: 'SET_PATIENTS_SUCCESS'; payload: Patient[] }
  | { type: 'SET_PATIENTS_ERROR'; payload: string }
  | { type: 'SET_USERS_LOADING'; payload: boolean }
  | { type: 'SET_USERS_SUCCESS'; payload: User[] }
  | { type: 'SET_USERS_ERROR'; payload: string }
  | { type: 'INVALIDATE_CACHE'; payload: keyof DashboardDataState };

// Estado inicial
const initialState: DashboardDataState = {
  medicalServices: {
    data: [],
    loading: false,
    error: null,
    lastFetch: null,
  },
  doctorServices: {
    data: [],
    loading: false,
    error: null,
    lastFetch: null,
  },
  patients: {
    data: [],
    loading: false,
    error: null,
    lastFetch: null,
  },
  users: {
    data: [],
    loading: false,
    error: null,
    lastFetch: null,
  },
};

// Reducer
function dashboardDataReducer(state: DashboardDataState, action: DashboardDataAction): DashboardDataState {
  switch (action.type) {
    case 'SET_MEDICAL_SERVICES_LOADING':
      return {
        ...state,
        medicalServices: { ...state.medicalServices, loading: action.payload, error: null },
      };
    case 'SET_MEDICAL_SERVICES_SUCCESS':
      return {
        ...state,
        medicalServices: {
          data: action.payload,
          loading: false,
          error: null,
          lastFetch: Date.now(),
        },
      };
    case 'SET_MEDICAL_SERVICES_ERROR':
      return {
        ...state,
        medicalServices: { ...state.medicalServices, loading: false, error: action.payload },
      };
    case 'SET_DOCTOR_SERVICES_LOADING':
      return {
        ...state,
        doctorServices: { ...state.doctorServices, loading: action.payload, error: null },
      };
    case 'SET_DOCTOR_SERVICES_SUCCESS':
      return {
        ...state,
        doctorServices: {
          data: action.payload,
          loading: false,
          error: null,
          lastFetch: Date.now(),
        },
      };
    case 'SET_DOCTOR_SERVICES_ERROR':
      return {
        ...state,
        doctorServices: { ...state.doctorServices, loading: false, error: action.payload },
      };
    case 'SET_PATIENTS_LOADING':
      return {
        ...state,
        patients: { ...state.patients, loading: action.payload, error: null },
      };
    case 'SET_PATIENTS_SUCCESS':
      return {
        ...state,
        patients: {
          data: action.payload,
          loading: false,
          error: null,
          lastFetch: Date.now(),
        },
      };
    case 'SET_PATIENTS_ERROR':
      return {
        ...state,
        patients: { ...state.patients, loading: false, error: action.payload },
      };
    case 'SET_USERS_LOADING':
      return {
        ...state,
        users: { ...state.users, loading: action.payload, error: null },
      };
    case 'SET_USERS_SUCCESS':
      return {
        ...state,
        users: {
          data: action.payload,
          loading: false,
          error: null,
          lastFetch: Date.now(),
        },
      };
    case 'SET_USERS_ERROR':
      return {
        ...state,
        users: { ...state.users, loading: false, error: action.payload },
      };
    case 'INVALIDATE_CACHE':
      return {
        ...state,
        [action.payload]: {
          ...state[action.payload],
          lastFetch: null,
        },
      };
    default:
      return state;
  }
}

// Contexto
interface DashboardDataContextType {
  state: DashboardDataState;
  fetchMedicalServices: (force?: boolean) => Promise<void>;
  fetchDoctorServices: (force?: boolean) => Promise<void>;
  fetchPatients: (force?: boolean) => Promise<void>;
  fetchUsers: (force?: boolean) => Promise<void>;
  invalidateCache: (dataType: keyof DashboardDataState) => void;
  refreshAll: () => Promise<void>;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

// Constantes de configuración
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Provider
export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(dashboardDataReducer, initialState);
  const { user, userRole } = useAuth();
  const stateRef = useRef(state);
  
  // Mantener la referencia del estado actualizada
  stateRef.current = state;

  // Función helper para verificar si los datos están frescos
  const isDataFresh = (lastFetch: number | null): boolean => {
    if (!lastFetch) return false;
    return Date.now() - lastFetch < CACHE_DURATION;
  };

  // Función para obtener servicios médicos con prevención de duplicados
  const fetchMedicalServices = useCallback(async (force = false) => {
    if (!user) return;
    
    const requestKey = `medicalServices-${force}`;
    
    // Si hay una petición pendiente, esperar a que termine
    if (pendingRequests.has(requestKey)) {
      return await pendingRequests.get(requestKey);
    }
    
    // Si los datos están frescos y no se fuerza la actualización, no hacer nada
    if (!force && isDataFresh(stateRef.current.medicalServices.lastFetch) && stateRef.current.medicalServices.data.length > 0) {
      return;
    }

    // Si ya está cargando, no hacer otra petición
    if (stateRef.current.medicalServices.loading) return;

    const fetchPromise = (async () => {
      dispatch({ type: 'SET_MEDICAL_SERVICES_LOADING', payload: true });

      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/medical-services?active=false', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Error al obtener servicios médicos');
        }

        const data = await response.json();
        dispatch({ type: 'SET_MEDICAL_SERVICES_SUCCESS', payload: data.data.services || [] });
        return data.data.services || [];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        dispatch({ type: 'SET_MEDICAL_SERVICES_ERROR', payload: errorMessage });
        throw error;
      } finally {
        pendingRequests.delete(requestKey);
      }
    })();

    pendingRequests.set(requestKey, fetchPromise);
    return await fetchPromise;
  }, [user]);

  // Función para obtener servicios de doctores con prevención de duplicados
  const fetchDoctorServices = useCallback(async (force = false) => {
    if (!user) return;
    
    const requestKey = `doctorServices-${force}`;
    
    // Si hay una petición pendiente, esperar a que termine
    if (pendingRequests.has(requestKey)) {
      return await pendingRequests.get(requestKey);
    }
    
    if (!force && isDataFresh(stateRef.current.doctorServices.lastFetch) && stateRef.current.doctorServices.data.length > 0) {
      return;
    }

    if (stateRef.current.doctorServices.loading) return;

    const fetchPromise = (async () => {
      dispatch({ type: 'SET_DOCTOR_SERVICES_LOADING', payload: true });

      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/doctor-services', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Error al obtener servicios de doctores');
        }

        const data = await response.json();
        dispatch({ type: 'SET_DOCTOR_SERVICES_SUCCESS', payload: data.data || [] });
        return data.data || [];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        dispatch({ type: 'SET_DOCTOR_SERVICES_ERROR', payload: errorMessage });
        throw error;
      } finally {
        pendingRequests.delete(requestKey);
      }
    })();

    pendingRequests.set(requestKey, fetchPromise);
    return await fetchPromise;
  }, [user]);

  // Función para obtener pacientes con prevención de duplicados
  const fetchPatients = useCallback(async (force = false) => {
    if (!user) return;
    
    const requestKey = `patients-${force}`;
    
    // Si hay una petición pendiente, esperar a que termine
    if (pendingRequests.has(requestKey)) {
      return await pendingRequests.get(requestKey);
    }
    
    if (!force && isDataFresh(stateRef.current.patients.lastFetch) && stateRef.current.patients.data.length > 0) {
      return;
    }

    if (stateRef.current.patients.loading) return;

    const fetchPromise = (async () => {
      dispatch({ type: 'SET_PATIENTS_LOADING', payload: true });

      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/patients', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Error al obtener pacientes');
        }

        const data = await response.json();
        dispatch({ type: 'SET_PATIENTS_SUCCESS', payload: data.data || [] });
        return data.data || [];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        dispatch({ type: 'SET_PATIENTS_ERROR', payload: errorMessage });
        throw error;
      } finally {
        pendingRequests.delete(requestKey);
      }
    })();

    pendingRequests.set(requestKey, fetchPromise);
    return await fetchPromise;
  }, [user]);

  // Función para obtener usuarios con prevención de duplicados
  const fetchUsers = useCallback(async (force = false) => {
    if (!user) return;
    
    // Solo los administradores pueden obtener la lista de usuarios
    if (userRole !== 'admin') {
      console.log('Usuario no es administrador, no se cargarán usuarios');
      dispatch({ type: 'SET_USERS_SUCCESS', payload: [] });
      return [];
    }
    
    const requestKey = `users-${force}`;
    
    // Si hay una petición pendiente, esperar a que termine
    if (pendingRequests.has(requestKey)) {
      return await pendingRequests.get(requestKey);
    }
    
    if (!force && isDataFresh(stateRef.current.users.lastFetch) && stateRef.current.users.data.length > 0) {
      return;
    }

    if (stateRef.current.users.loading) return;

    const fetchPromise = (async () => {
      dispatch({ type: 'SET_USERS_LOADING', payload: true });

      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Error al obtener usuarios');
        }

        const data = await response.json();
        dispatch({ type: 'SET_USERS_SUCCESS', payload: data || [] });
        return data || [];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        dispatch({ type: 'SET_USERS_ERROR', payload: errorMessage });
        console.warn('Error al obtener usuarios:', errorMessage);
        return [];
      } finally {
        pendingRequests.delete(requestKey);
      }
    })();

    pendingRequests.set(requestKey, fetchPromise);
    return await fetchPromise;
  }, [user, userRole]);

  // Función para invalidar cache
  const invalidateCache = useCallback((dataType: keyof DashboardDataState) => {
    dispatch({ type: 'INVALIDATE_CACHE', payload: dataType });
  }, []);

  // Función para refrescar todos los datos
  const refreshAll = useCallback(async () => {
    // Crear array de promesas basado en el rol del usuario
    const promises = [
      fetchMedicalServices(true),
      fetchDoctorServices(true),
      fetchPatients(true),
    ];
    
    const dataTypes = ['servicios médicos', 'servicios de doctores', 'pacientes'];
    
    // Solo agregar fetchUsers si el usuario es admin
    if (userRole === 'admin') {
      promises.push(fetchUsers(true));
      dataTypes.push('usuarios');
    }
    
    // Ejecutar todas las peticiones de forma independiente para que si una falla, las otras continúen
    const results = await Promise.allSettled(promises);
    
    // Log de errores si los hay, pero no fallar completamente
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(`Error al refrescar ${dataTypes[index]}:`, result.reason);
      }
    });
  }, [fetchMedicalServices, fetchDoctorServices, fetchPatients, fetchUsers, userRole]);

  // Función estable para cargar datos iniciales
  const loadInitialData = useCallback(() => {
    if (user) {
      // Crear array de promesas basado en el rol del usuario
      const promises = [
        fetchMedicalServices(),
        fetchDoctorServices(),
        fetchPatients(),
      ];
      
      const dataTypes = ['servicios médicos', 'servicios de doctores', 'pacientes'];
      
      // Solo agregar fetchUsers si el usuario es admin
      if (userRole === 'admin') {
        promises.push(fetchUsers());
        dataTypes.push('usuarios');
      }
      
      // Cargar datos de forma paralela pero sin bloquear la UI
      // Usar Promise.allSettled para que si una petición falla, las otras continúen
      Promise.allSettled(promises).then((results) => {
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.warn(`Error al cargar ${dataTypes[index]}:`, result.reason);
          }
        });
      });
    }
  }, [user, userRole, fetchMedicalServices, fetchDoctorServices, fetchPatients, fetchUsers]);

  // Cargar datos iniciales cuando el usuario esté disponible
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const value: DashboardDataContextType = {
    state,
    fetchMedicalServices,
    fetchDoctorServices,
    fetchPatients,
    fetchUsers,
    invalidateCache,
    refreshAll,
  };

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}

// Hook personalizado para usar el contexto
export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (context === undefined) {
    throw new Error('useDashboardData debe ser usado dentro de un DashboardDataProvider');
  }
  return context;
}

// Hooks específicos para cada tipo de dato
export function useMedicalServicesData() {
  const { state, fetchMedicalServices, invalidateCache } = useDashboardData();
  
  return {
    medicalServices: state.medicalServices.data,
    loading: state.medicalServices.loading,
    error: state.medicalServices.error,
    refetch: () => fetchMedicalServices(true),
    invalidate: () => invalidateCache('medicalServices'),
  };
}

export function useDoctorServicesData() {
  const { state, fetchDoctorServices, invalidateCache } = useDashboardData();
  
  return {
    doctorServices: state.doctorServices.data,
    loading: state.doctorServices.loading,
    error: state.doctorServices.error,
    refetch: () => fetchDoctorServices(true),
    invalidate: () => invalidateCache('doctorServices'),
  };
}

export function usePatientsData() {
  const { state, fetchPatients, invalidateCache } = useDashboardData();
  
  return {
    patients: state.patients.data,
    loading: state.patients.loading,
    error: state.patients.error,
    refetch: () => fetchPatients(true),
    invalidate: () => invalidateCache('patients'),
  };
}

export function useUsersData() {
  const { state, fetchUsers, invalidateCache } = useDashboardData();
  
  return {
    users: state.users.data,
    loading: state.users.loading,
    error: state.users.error,
    refetch: () => fetchUsers(true),
    invalidate: () => invalidateCache('users'),
  };
}