'use client'

import * as React from "react"
import {
  HelpCircle,
  Layers,
  House,
  CalendarClock,
  Users,
  Factory,
  Settings,
  Activity,
  type LucideIcon
} from "lucide-react"

import { NavMain } from "@/app/home/_components/nav-main"
import { NavSecondary } from "@/app/home/_components/nav-secondary"
import { NavUser } from "@/app/home/_components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@rutas/components/ui/sidebar"
import { useAuth } from "../../context/AuthContext"
import { useUIStyle } from "../../context/UIStyleContext"
import { useNavigation } from "@rutas/app/context/NavigationContext"
import { NAVIGATION_VIEWS, VIEW_CONFIG, ALL_VIEWS, canUserAccessView } from "@/app/constants/navigation"
import { geistFont } from "../../fonts"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
 
  const { user, userRole } = useAuth()
  const { uiStyle } = useUIStyle() // Obtener el estilo de interfaz
  const { setCurrentView, } = useNavigation()
  if (!user) {
    return null
  }
  // Icon mapping for type safety
  const iconMap: Record<string, LucideIcon> = {
    House,
    CalendarClock,
    Users,
    Factory,
    Settings,
    Activity,
  };

  // Generate navigation items from centralized configuration
  const navMain = ALL_VIEWS
    .filter(view => {
      // Filter out configuration view from main nav
      if (view === NAVIGATION_VIEWS.CONFIGURATION) return false;
      // Check user role permissions
      return canUserAccessView(view, userRole || '');
    })
    .map(view => {
      const config = VIEW_CONFIG[view];
      const IconComponent = iconMap[config.icon];
      
      return {
        title: config.title,
        icon: IconComponent,
        onClick: () => setCurrentView(view),
      };
    });

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
