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
    phone?: string;
  };
  service?: {
    id: string;
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