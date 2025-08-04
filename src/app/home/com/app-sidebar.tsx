'use client'

import * as React from "react"
import {
  House,
  HelpCircle,
  Layers,
  CalendarClock,
  Factory,
  Users,
  Activity
} from "lucide-react"

import { NavMain } from "@/app/home/com/nav-main"
import { NavSecondary } from "@/app/home/com/nav-secondary"
import { NavUser } from "@/app/home/com/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@rutas/components/ui/sidebar"
import { useAuth } from "../../context/AuthContext"
import { useUIStyle } from "../../context/UIStyleContext"
import { useNavigation } from "@rutas/app/context/NavigationContext"
import { geistFont } from "../../fonts"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
 
  const { user, userRole } = useAuth()
  const { uiStyle } = useUIStyle() // Obtener el estilo de interfaz
  const { setCurrentView, } = useNavigation()
  if (!user) {
    return null
  }
  const navMain = [
    {
      title: "Dashboard",
      icon: House,
      onClick: () => setCurrentView('dashboard'),
    },
    {
      title: "Calendario",
      icon: CalendarClock,
      onClick: () => setCurrentView('calendar'),
    },
  ];

  if (userRole === 'admin') {
    navMain.splice(1, 0, {
      title: "Organización",
      icon: Factory,
      onClick: () => setCurrentView('organization'),
    });
  }
  if (userRole === 'admin') {
    navMain.splice(1, 0, {
      title: "Ai-Care",
      icon: Activity,
      onClick: () => setCurrentView('ai-care'),
    });
  }
  if (userRole === 'admin' || userRole === 'asistente') {
    navMain.splice(1, 0, {
      title: "Pacientes",
      icon: Users,
      onClick: () => setCurrentView('patients'),
    });
  }

  const data = {
    user: {
      name: user.displayName || "Usuario",
      email: user.email || "m@example.com",
      avatar: user.photoURL || "/img/avatar_1.webp",
    },
    navMain: navMain,
    navSecondary: [
      {
        title: "Obtener ayuda",
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
      <SidebarContent className={`flex flex-col h-full ${uiStyle === 'minimal' ? 'justify-center' : ''}`}>
        {uiStyle === 'minimal' ? (
          // Modo minimalista: contenido centrado
          <div className="flex flex-col gap-4">
            
            <NavMain items={data.navMain} hideIcons={true} />
            {/* <NavSecondary items={data.navSecondary} currentPath={pathname} hideIcons={true} /> */}
            <NavUser user={data.user} hideIcons={true} />
            
          </div>
          
        ) : (
          // Modo normal: layout completo
          <>
            {/*
            <div className="p-2">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate} // setDate actualizará 'date', y el useEffect se encargará del resto
                className="rounded-md "
              />
            </div> */}

        

            <div className="flex flex-col">
              <NavMain items={data.navMain} hideIcons={false} />
            </div>
            <div className="flex flex-col mt-auto">
              <NavSecondary items={data.navSecondary} hideIcons={false} />
            </div>
          </>
        )}
      </SidebarContent>
      {uiStyle !== 'minimal' && (
        <SidebarFooter>
          <NavUser user={data.user} />
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
