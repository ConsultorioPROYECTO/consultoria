'use client';

import { Card, CardContent } from "@rutas/components/ui/card";
import { ClockIcon, UserIcon } from 'lucide-react'; // Iconos

interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  serviceId: string;
  status: string;
  date?: string;
  notes?: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  service?: {
    id: string;
    name: string;
    description: string;
    duration: number;
    price: number;
  };
}

interface NextAppointmentProps {
  appointments: Appointment[];
  className?: string;
}

// Función auxiliar para crear un objeto Date para hoy con una hora y minuto específicos
function getDateFromTimeString(timeString: string): Date {
  // Validar que timeString no sea undefined, null o vacío
  if (!timeString || typeof timeString !== 'string') {
    console.warn('getDateFromTimeString: timeString inválido:', timeString);
    return new Date(); // Retornar fecha actual como fallback
  }

  const parts = timeString.split(' ');
  if (parts.length < 1) {
    console.warn('getDateFromTimeString: formato de tiempo inválido:', timeString);
    return new Date();
  }

  const [time, modifier] = parts;
  const timeParts = time?.split(':');
  
  if (!timeParts || timeParts.length < 2) {
    console.warn('getDateFromTimeString: formato de hora inválido:', timeString);
    return new Date();
  }

  const hoursStr = timeParts[0];
  const minutesStr = timeParts[1];
  
  if (!hoursStr || !minutesStr) {
    console.warn('getDateFromTimeString: horas o minutos inválidos:', timeString);
    return new Date();
  }

  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes)) {
    console.warn('getDateFromTimeString: no se pudieron parsear horas/minutos:', timeString);
    return new Date();
  }

  // Ajustar horas para formato 24h basado en AM/PM
  if (modifier === 'PM' && hours !== 12) {
    hours += 12;
  } else if (modifier === 'AM' && hours === 12) {
    hours = 0; // 12 AM (medianoche) es 00 en formato 24h
  }
  // 12 PM (mediodía) se mantiene como 12

  const today = new Date();
  today.setHours(hours, minutes, 0, 0);
  return today;
}

export function NextAppointment({ appointments, className }: NextAppointmentProps) {
  const now = new Date();

  // Debug: Log para ver qué citas están llegando
  console.log('NextAppointment - Citas recibidas:', appointments);
  console.log('NextAppointment - Hora actual:', now);

  // Filtrar citas no completadas y ordenarlas por fecha de creación
  const upcomingAppointments = appointments
    .filter(apt => {
      const isNotCompleted = apt.status !== 'Completada';
      console.log(`Cita ${apt.id}: status=${apt.status}, isNotCompleted=${isNotCompleted}`);
      console.log(`Cita ${apt.id}: patient=${apt.patient?.firstName} ${apt.patient?.lastName}, service=${apt.service?.name}`);
      return isNotCompleted;
    })
    .sort((a, b) => {
      // Ordenar por ID (asumiendo que IDs más altos son más recientes)
      return a.id.localeCompare(b.id);
    });

  console.log('NextAppointment - Citas no completadas:', upcomingAppointments);

  // Tomar la primera cita pendiente (más antigua)
  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
  
  console.log('NextAppointment - Próxima cita encontrada:', nextAppointment);

  console.log('NextAppointment - Próxima cita encontrada:', nextAppointment);

  if (!nextAppointment) {
    return (
      <Card className={`flex flex-col justify-between h-full ${className}`}>
        <CardContent className="flex-grow flex items-center justify-center">
          <p className="text-muted-foreground text-md text-center">No hay citas pendientes próximas.</p>
        </CardContent>
      </Card>
    );
  }

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
        <div className="flex items-center text-sm text-muted-foreground mt-2">
           <ClockIcon className="h-4 w-4 mr-2" />
           <span>Estado: {nextAppointment.status}</span>
        </div>
         <div className="flex items-center text-sm text-muted-foreground">
           <UserIcon className="h-4 w-4 mr-2" />
           <span>Servicio: {nextAppointment.service?.name || 'No especificado'}</span>
        </div>
      </CardContent>
    </Card>
  );
}