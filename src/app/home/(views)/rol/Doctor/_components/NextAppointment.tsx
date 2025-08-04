'use client';

import { Card, CardContent } from "@/components/ui/card";
import { ClockIcon, UserIcon } from 'lucide-react';
import { AppointmentEventData, BreakTimeEventData } from "@/types/google-calendar";
import { DateTime } from 'luxon';

type CalendarEvent = AppointmentEventData | BreakTimeEventData;

function isAppointmentEvent(event: CalendarEvent): event is AppointmentEventData {
  return 'patientId' in event;
}

interface NextAppointmentProps {
  calendarEvents: CalendarEvent[];
  className?: string;
}

export function NextAppointment({ calendarEvents, className }: NextAppointmentProps) {
  const now = DateTime.local();

  const upcomingAppointments = calendarEvents
    .filter(isAppointmentEvent)
    .filter(apt => apt.appointmentStatus !== 'Completada')
    .sort((a, b) => {
        const timeA = DateTime.fromISO(a.startDateTime as unknown as string).toMillis();
        const timeB = DateTime.fromISO(b.startDateTime as unknown as string).toMillis();
        return timeA - timeB;
    });

  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  const formatAppointmentTime = (appointment: AppointmentEventData): string => {
    return DateTime.fromISO(appointment.startDateTime as unknown as string).toFormat('HH:mm');
  };

  const getTimeUntilAppointment = (appointment: AppointmentEventData): string => {
    const appointmentTime = DateTime.fromISO(appointment.startDateTime as unknown as string);
    const diff = appointmentTime.diff(now, ['hours', 'minutes']);

    if (diff.as('milliseconds') < 0) return 'En curso';

    const hours = Math.floor(diff.as('hours'));
    const minutes = Math.floor(diff.as('minutes')) % 60;

    if (hours > 0) {
      return `en ${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `en ${minutes}m`;
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
          <p>es con <span className="text-primary">{nextAppointment.summary}</span></p>
        </div>
        
        <div className="flex items-center text-lg font-semibold text-primary mt-2">
          <ClockIcon className="h-5 w-5 mr-2" />
          <span>{appointmentTime}</span>
          {timeUntil && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({timeUntil})</span>
          )}
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground">
          <span>Estado: {nextAppointment.appointmentStatus}</span>
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground">
          <UserIcon className="h-4 w-4 mr-2" />
          <span>Servicio: {nextAppointment.description || 'No especificado'}</span>
        </div>
        
        {nextAppointment.location && (
          <div className="flex items-center text-sm text-muted-foreground">
            <span>📍 {nextAppointment.location}</span>
          </div>
        )}
        
        {nextAppointment.meetingLink && (
          <div className="flex items-center text-sm text-blue-600">
            <span>🔗 Reunión virtual disponible</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
