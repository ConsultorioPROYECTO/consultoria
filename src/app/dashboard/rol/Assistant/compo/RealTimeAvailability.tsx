// src/app/dashboard/3/compo/RealTimeAvailability.tsx
'use client';

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Badge } from "@rutas/components/ui/badge";
import { CalendarCheck2, User, Clock } from "lucide-react";
import { useDoctorsWithAppointments } from "@/hooks/useDoctorsWithAppointments";

export function RealTimeAvailability() {
  const { doctors, loading, error } = useDoctorsWithAppointments();

  const getDoctorStatus = React.useMemo(() => {
    const allDoctors: any[] = [];
    
    doctors.forEach(assistant => {
      assistant.doctors.forEach(doctor => {
        const now = new Date();
        const currentAppointment = doctor.appointments.find((apt: any) => {
          const aptDate = new Date(apt.createdAt);
          const endTime = new Date(aptDate.getTime() + 60 * 60 * 1000); // Asumiendo citas de 1 hora
          return aptDate <= now && now <= endTime && apt.status !== 'Completada';
        });

        const nextAppointment = doctor.appointments
          .filter((apt: any) => {
            const aptDate = new Date(apt.createdAt);
            return aptDate > now && apt.status !== 'Completada';
          })
          .sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateA.getTime() - dateB.getTime();
          })[0];

        let status = "Disponible";
        let nextAvailable = null;

        if (currentAppointment) {
          status = "En Cita";
          if (nextAppointment) {
            nextAvailable = `${new Date(nextAppointment.createdAt).toLocaleTimeString()} - ${new Date(nextAppointment.createdAt).toLocaleDateString()}`;
          }
      } else if (nextAppointment) {
          const nextAptTime = new Date(nextAppointment.createdAt);
          const timeDiff = nextAptTime.getTime() - now.getTime();
          if (timeDiff < 30 * 60 * 1000) { // Menos de 30 minutos
            status = "Ocupado";
          }
          nextAvailable = `${new Date(nextAppointment.createdAt).toLocaleTimeString()} - ${new Date(nextAppointment.createdAt).toLocaleDateString()}`;
        }

        const patientName = currentAppointment?.patient ? 
          `${currentAppointment.patient.firstName} ${currentAppointment.patient.lastName}` : null;

        allDoctors.push({
          ...doctor,
          status,
          nextAvailable,
          currentPatient: patientName
        });
      });
    });
    
    return allDoctors;
  }, [doctors]);

  const getStatusColor = (status: string) => {
    if (status === "Disponible") return "bg-green-500";
    if (status === "En Cita" || status === "Ocupado") return "bg-yellow-500";
    if (status === "Fuera de Línea") return "bg-red-500";
    return "bg-gray-400";
  };

  if (loading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarCheck2 className="h-5 w-5 mr-2 text-primary" />
            Disponibilidad en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarCheck2 className="h-5 w-5 mr-2 text-primary" />
            Disponibilidad en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CalendarCheck2 className="h-5 w-5 mr-2 text-primary" />
          Disponibilidad en Tiempo Real
        </CardTitle>
        <CardDescription>
          Estado actual de los médicos bajo tu supervisión.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-md font-semibold mb-3 text-foreground flex items-center">
            <User className="h-4 w-4 mr-2" />
            Médicos ({getDoctorStatus.length})
          </h4>
          {getDoctorStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay médicos asignados.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getDoctorStatus.map((doctor) => (
                <div key={doctor.idDoctor} className="p-3 border rounded-lg bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-foreground">Dr. ID {doctor.idDoctor}</p>
                    <Badge variant={doctor.status === "Disponible" ? "default" : "secondary"} 
                           className={`text-xs ${getStatusColor(doctor.status)} text-white`}>
                      {doctor.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{doctor.speciality}</p>
                  {doctor.currentPatient && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Atendiendo: {doctor.currentPatient}
                    </p>
                  )}
                  {doctor.nextAvailable && (
                    <p className="text-xs text-muted-foreground flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      Próx. disponible: {doctor.nextAvailable}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Citas hoy: {doctor.appointments.filter((apt: any) => {
                      const today = new Date().toDateString();
                      const aptDate = new Date(apt.date).toDateString();
                      return today === aptDate && apt.status !== 'Completada';
                    }).length}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}