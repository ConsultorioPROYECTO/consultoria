'use client';

import { Card, CardContent } from "@rutas/components/ui/card";
import { ClockIcon, UserIcon } from 'lucide-react'; // Iconos

interface Appointment {
  id: string;
  time: string;
  patientName: string;
  service: string;
  status: string;
}

interface NextAppointmentProps {
  appointments: Appointment[];
  className?: string;
}

// Función auxiliar para crear un objeto Date para hoy con una hora y minuto específicos
function getDateFromTimeString(timeString: string): Date {
  const [time, modifier] = timeString.split(' ');
  let hours = parseInt(time.split(':')[0], 10);
  const minutes = parseInt(time.split(':')[1], 10);

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

  // Filtrar citas no completadas y ordenarlas por hora
  const upcomingAppointments = appointments
    .filter(apt => apt.status !== 'Completada')
    .sort((a, b) => {
      const dateA = getDateFromTimeString(a.time);
      const dateB = getDateFromTimeString(b.time);
      return dateA.getTime() - dateB.getTime();
    });

  // Encontrar la próxima cita (la primera que aún no ha pasado)
  const nextAppointment = upcomingAppointments.find(apt => {
     const aptDate = getDateFromTimeString(apt.time);
     return aptDate >= now; // Comparar con la hora actual
  });

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
          <p>es con <span className="text-primary">{nextAppointment.patientName?.split(' ')[0] || 'Paciente'}</span></p>
          {nextAppointment.patientName?.split(' ').length > 1 && (
             <p className="text-primary">{nextAppointment.patientName?.split(' ').slice(1).join(' ')}</p>
           )}
        </div>
        <div className="flex items-center text-sm text-muted-foreground mt-2">
           <ClockIcon className="h-4 w-4 mr-2" />
           <span>Hora: {nextAppointment.time}</span>
        </div>
         <div className="flex items-center text-sm text-muted-foreground">
           <UserIcon className="h-4 w-4 mr-2" />
           <span>Servicio: {nextAppointment.service}</span>
        </div>
      </CardContent>
    </Card>
  );
}