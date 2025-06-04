"use client"

import * as React from "react"
import { usePathname } from 'next/navigation';
// import { Calendar } from "@rutas/components/ui/calendar"
import { Button } from "@rutas/components/ui/button" // Añadir importación de Button
import { Card, CardHeader, CardTitle } from "@rutas/components/ui/card" // Añadir importaciones de Card
import {
  House,
  HelpCircle,
  Layers,
  CalendarClock,
} from "lucide-react"

import { NavMain } from "@rutas/app/dashboard/com/nav-main"
import { NavSecondary } from "@rutas/app/dashboard/com/nav-secondary"
import { NavUser } from "@rutas/app/dashboard/com/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@rutas/components/ui/sidebar"
import { useAuth } from "../../context/AuthContext"
import { useUIStyle } from "../../context/UIStyleContext"
import { geistFont } from "../../fonts"

// Interfaz para las citas y datos de ejemplo
interface Appointment {
  id: string;
  time: string;
  patientName: string;
  description?: string;
}


// Helper to format date to YYYY-MM-DD string for mock data lookup
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Datos de ejemplo para citas (simulando una base de datos o API)
const MOCK_APPOINTMENTS: { [key: string]: Appointment[] } = {
  // Usar fechas dinámicas relativas al día actual para que siempre haya datos de ejemplo
  [formatDateKey(new Date())]: [
    { id: "1", time: "09:00 AM", patientName: "Carlos Santana", description: "Consulta General" },
    { id: "2", time: "10:30 AM", patientName: "Elena Rodriguez", description: "Seguimiento" },
  ],
  [formatDateKey(new Date(new Date().setDate(new Date().getDate() + 1)))]: [
    { id: "3", time: "11:00 AM", patientName: "Pedro Pascal", description: "Revisión Anual" },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [date] = React.useState<Date | undefined>(undefined) // Estado inicial sin fecha seleccionada
  const [selectedDayAppointments, setSelectedDayAppointments] = React.useState<Appointment[]>([])
  const { user } = useAuth()
  const { uiStyle } = useUIStyle() // Obtener el estilo de interfaz
  const pathname = usePathname();

  React.useEffect(() => {
    if (date) {
      const dateKey = formatDateKey(date);
      setSelectedDayAppointments(MOCK_APPOINTMENTS[dateKey] || []);
    } else {
      setSelectedDayAppointments([]);
    }
  }, [date]);

  if (!user) {
    return null
  }

  const data = {
    user: {
      name: user.displayName || "Usuario",
      email: user.email || "m@example.com",
      avatar: user.photoURL || "/avatars/shadcn.jpg",
    },
    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: House,
      },
      {
        title: "Calendario",
        url: "/dashboard/calender",
        icon: CalendarClock,
      },
      {
        title: "Demo APIs",
        url: "/dashboard/apis-demo",
        icon: Layers,
      },
    ],
    navSecondary: [
      {
        title: "Get Help",
        url: "#",
        icon: HelpCircle,
      },
    ],
  }

  return (
    <Sidebar collapsible="offcanvas" className={geistFont.className} {...props}>
      <SidebarHeader>
        <div className="flex items-center p-1.5">
            <Layers className="size-8" />
            {uiStyle !== 'minimal' && <span className="ml-2 text-base font-semibold">Irina</span>}
        </div>
      </SidebarHeader>
      <SidebarContent className={`flex flex-col h-full ${uiStyle === 'minimal' ? 'content-center' : ''}`}>
        {/*
        <div className="p-2">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate} // setDate actualizará 'date', y el useEffect se encargará del resto
            className="rounded-md "
          />
        </div> */}
        
        {/* Sección para mostrar citas del día seleccionado */}  
        {date && selectedDayAppointments.length > 0 && (
          <div className="flex flex-col gap-3 p-2 mt-4">
            <Card>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm font-medium">
                  Citas para {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                </CardTitle>
              </CardHeader>
              <div className="flex flex-col gap-3 p-2">
                {selectedDayAppointments.map(app => (
                  <div key={app.id} className="p-1 border-b last:border-b-0">
                    <p className="font-semibold">{app.time} - {app.patientName}</p>
                    {app.description && <p className="text-muted-foreground">{app.description}</p>}
                  </div>
                ))}
                 <Button variant="outline" size="sm" className="w-full mt-2">
                  <CalendarClock className="mr-2 h-3 w-3" />
                  Ver todas las citas
                </Button>
              </div>
            </Card>
          </div>
        )}
        {date && selectedDayAppointments.length === 0 && (
           <div className="p-2 mt-2 text-center">
            <p className="text-xs text-muted-foreground">
                No hay citas para {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}.
            </p>
           </div>
        )}
        <div className="flex flex-col">
          <NavMain items={data.navMain} currentPath={pathname} hideIcons={uiStyle === 'minimal'} />
        </div>
        <div className="flex flex-col mt-auto">
          <NavSecondary items={data.navSecondary} currentPath={pathname} hideIcons={uiStyle === 'minimal'} />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
