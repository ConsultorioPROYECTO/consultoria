import { unstable_cache } from 'next/cache';
import { getFirebaseAuthToken } from '@rutas/app/lib/firebase/clientUtils';

// Definir la interfaz Appointment
export interface Appointment {
  id: string;
  time: string;
  patientName: string;
  service: string;
  status: string;
  date?: string;
  doctorId?: string;
  notes?: string;
}

// Función base para obtener citas (sin cache para uso en cliente)
export const fetchAppointments = async (): Promise<Appointment[]> => {
  try {
    const token = await getFirebaseAuthToken();

    if (!token) {
      if (process.env.NODE_ENV === 'development') {
        console.error('No se pudo obtener el token de autenticación.');
      }
      return [];
    }

    const response = await fetch('/api/medicos/dashboard/appointments', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      // Deshabilitar cache para datos dinámicos
      cache: 'no-store',
    });
    
    if (!response.ok) {
      // Manejo específico para diferentes códigos de error
      if (response.status === 403) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error 403: Acceso denegado. Verifica que tu cuenta tenga el rol de médico asignado.');
        }
        return [];
      } else if (response.status === 401) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error 401: No autorizado. Tu sesión puede haber expirado.');
        }
        return [];
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error(`Error HTTP ${response.status}: ${response.statusText}`);
        }
      }
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validar que la respuesta sea un array
    if (!Array.isArray(data)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('La respuesta del API no es un array válido:', data);
      }
      return [];
    }
    
    return data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching appointments:', error);
    }
    return [];
  }
};

// Función con cache para Server Components (cuando sea posible)
export const getCachedAppointments = unstable_cache(
  async (doctorId: string): Promise<Appointment[]> => {
    // Esta función se usaría en Server Components cuando tengamos el doctorId
    // Por ahora, retornamos un array vacío ya que necesitamos autenticación del cliente
    return [];
  },
  ['appointments'],
  {
    revalidate: 300, // 5 minutos
    tags: ['appointments'],
  }
);

// Función para obtener citas del día actual
export const getTodayAppointments = async (): Promise<Appointment[]> => {
  const appointments = await fetchAppointments();
  const today = new Date().toISOString().split('T')[0];
  
  return appointments.filter(appointment => {
    // Si no hay fecha, asumimos que es de hoy (para compatibilidad)
    if (!appointment.date) return true;
    return appointment.date === today;
  });
};

// Función para obtener la próxima cita
export const getNextAppointment = async (): Promise<Appointment | null> => {
  const appointments = await getTodayAppointments();
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  // Filtrar citas futuras del día
  const futureAppointments = appointments.filter(appointment => {
    const [hours, minutes] = appointment.time.split(':').map(Number);
    const appointmentTime = hours * 60 + minutes;
    return appointmentTime > currentTime && appointment.status !== 'Completada';
  });
  
  // Ordenar por hora y retornar la primera
  futureAppointments.sort((a, b) => {
    const timeA = a.time.split(':').map(Number);
    const timeB = b.time.split(':').map(Number);
    return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
  });
  
  return futureAppointments[0] || null;
};

// Función para actualizar el estado de una cita
export const updateAppointmentStatus = async (
  appointmentId: string, 
  newStatus: string
): Promise<boolean> => {
  try {
    const token = await getFirebaseAuthToken();

    if (!token) {
      if (process.env.NODE_ENV === 'development') {
        console.error('No se pudo obtener el token de autenticación.');
      }
      return false;
    }

    const response = await fetch(`/api/medicos/dashboard/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    return response.ok;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error updating appointment status:', error);
    }
    return false;
  }
};

// Hook personalizado para usar en componentes
export const useAppointments = () => {
  // Este hook se implementaría con React Query o SWR para mejor gestión de estado
  // Por ahora, mantenemos la funcionalidad existente
  return {
    fetchAppointments,
    getTodayAppointments,
    getNextAppointment,
    updateAppointmentStatus,
  };
};