"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card"
import { IconCalendarEvent, IconUser } from "@tabler/icons-react"
import { useDoctorsWithAppointments } from "@/hooks/useDoctorsWithAppointments"

export function UpcomingAppointments() {
  const { doctors, loading, error } = useDoctorsWithAppointments()

  // Obtener todas las citas y ordenar por fecha/hora más próxima
  const upcomingAppointments = React.useMemo(() => {
    if (!doctors.length) return []
    
    const allAppointments = doctors.flatMap(doctor => 
      doctor.appointments
        .filter(apt => apt.status !== 'Completada')
        .map(apt => ({
          ...apt,
          doctorSpecialty: doctor.speciality,
          doctorId: doctor.idDoctor
        }))
    )
    
    return allAppointments
      .sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`)
        const dateB = new Date(`${b.date} ${b.time}`)
        return dateA.getTime() - dateB.getTime()
      })
      .slice(0, 5) // Mostrar solo las próximas 5 citas
  }, [doctors])

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Citas Próximas</CardTitle>
          <IconCalendarEvent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Citas Próximas</CardTitle>
          <IconCalendarEvent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Citas Próximas
        </CardTitle>
        <IconCalendarEvent className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {upcomingAppointments.length > 0 ? (
          <ul className="space-y-2">
            {upcomingAppointments.map((appointment) => (
              <li key={`${appointment.doctorId}-${appointment.id}`} className="flex justify-between items-center p-2 border-b last:border-b-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <IconUser className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm font-semibold">{appointment.patientName}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{appointment.service}</p>
                  <p className="text-xs text-muted-foreground">{appointment.doctorSpecialty}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">{appointment.time}</span>
                  <p className="text-xs text-muted-foreground">
                    {new Date(appointment.date).toLocaleDateString()}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    appointment.status === 'Confirmada' ? 'bg-green-100 text-green-800' :
                    appointment.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {appointment.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No hay citas próximas.</p>
        )}
      </CardContent>
    </Card>
  )
}