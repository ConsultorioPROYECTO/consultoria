'use client';

import { Card, CardContent } from "@rutas/components/ui/card";
import { ClockIcon, UserIcon } from 'lucide-react'; // Iconos

interface Appointment {
  id: number;
  doctorId: number;
  patientId: number;
  serviceId: number;
  status: string;
  date?: string;
  time?: string;
  notes?: string;
  // Campos de Google Calendar
  google_event_id?: string;
  google_calendar_id?: string;
  startDateTime?: string; // ISO string from Google Calendar
  endDateTime?: string;   // ISO string from Google Calendar
  location?: string;
  meetingLink?: string;
  patient?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  service?: {
    id: number;
    name: string;
    description?: string;
    duration: number;
    price: number;
  };
}

interface NextAppointmentProps {
  appointments: Appointment[];
  className?: string;
}



export function NextAppointment({ appointments, className }: NextAppointmentProps) {
  const now = new Date();

  // Debug: Log para ver qué citas están llegando
  console.log('NextAppointment - Citas recibidas:', appointments);
  console.log('NextAppointment - Hora actual:', now);

  // Filtrar citas no completadas y ordenarlas por fecha/hora más próxima
  const upcomingAppointments = appointments
    .filter(apt => {
      const isNotCompleted = apt.status !== 'Completada';
      console.log(`Cita ${apt.id}: status=${apt.status}, isNotCompleted=${isNotCompleted}`);
      console.log(`Cita ${apt.id}: patient=${apt.patient?.firstName} ${apt.patient?.lastName}, service=${apt.service?.name}`);
      return isNotCompleted;
    })
    .sort((a, b) => {
      // Priorizar ordenamiento por fecha/hora de Google Calendar si está disponible
      if (a.startDateTime && b.startDateTime) {
        return new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
      }
      // Fallback: ordenar por ID
      return a.id - b.id;
    });

  console.log('NextAppointment - Citas no completadas:', upcomingAppointments);

  // Tomar la primera cita pendiente (más próxima en el tiempo)
  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
  
  console.log('NextAppointment - Próxima cita encontrada:', nextAppointment);

  // Función para formatear la hora de la cita
  const formatAppointmentTime = (appointment: Appointment): string => {
    if (appointment.startDateTime) {
      const startTime = new Date(appointment.startDateTime);
      return startTime.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }
    if (appointment.time) {
      return appointment.time;
    }
    return 'Hora no especificada';
  };

  // Función para calcular tiempo restante hasta la cita
  const getTimeUntilAppointment = (appointment: Appointment): string => {
    if (!appointment.startDateTime) return '';
    
    const appointmentTime = new Date(appointment.startDateTime);
    const diffMs = appointmentTime.getTime() - now.getTime();
    
    if (diffMs < 0) return 'En curso';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `en ${diffHours}h ${diffMinutes}m`;
    } else if (diffMinutes > 0) {
      return `en ${diffMinutes}m`;
    } else {
      return 'Ahora';
    }
  };

  if (!nextAppointment) {
    return (
      <Card className={`flex flex-col justify-between h-full ${className}`}>
        <CardContent className="flex-grow flex items-center justify-center">
          <p className="text-muted-foreground text-md text-center">No hay citas pendientes próximas.</p>
        </CardContent>
      </Card>
    );
  }

  const appointmentTime = formatAppointmentTime(nextAppointment);
  const timeUntil = getTimeUntilAppointment(nextAppointment);

  return (
    <Card className={`flex flex-col justify-between h-full ${className}`}>
      <CardContent className="flex-grow flex flex-col justify-center space-y-2">
        <span className="text-sm opacity-80"></span>
        <div className="text-4xl @md:text-2xl @lg:text-3xl @xl:text-4xl font-bold leading-tight">
          <p>Tu próxima cita</p>
          <p>es con <span className="text-primary">{nextAppointment.patient?.firstName || 'Paciente'}</span></p>
          {nextAppointment.patient?.lastName && (
             <p className="text-primary">{nextAppointment.patient.lastName}</p>
           )}
        </div>
        
        {/* Hora de la cita */}
        <div className="flex items-center text-lg font-semibold text-primary mt-2">
          <ClockIcon className="h-5 w-5 mr-2" />
          <span>{appointmentTime}</span>
          {timeUntil && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({timeUntil})</span>
          )}
        </div>
        
        {/* Estado de la cita */}
        <div className="flex items-center text-sm text-muted-foreground">
          <span>Estado: {nextAppointment.status}</span>
        </div>
        
        {/* Servicio */}
        <div className="flex items-center text-sm text-muted-foreground">
          <UserIcon className="h-4 w-4 mr-2" />
          <span>Servicio: {nextAppointment.service?.name || 'No especificado'}</span>
        </div>
        
        {/* Ubicación si está disponible */}
        {nextAppointment.location && (
          <div className="flex items-center text-sm text-muted-foreground">
            <span>📍 {nextAppointment.location}</span>
          </div>
        )}
        
        {/* Enlace de reunión si está disponible */}
        {nextAppointment.meetingLink && (
          <div className="flex items-center text-sm text-blue-600">
            <span>🔗 Reunión virtual disponible</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}