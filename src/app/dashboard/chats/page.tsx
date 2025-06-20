'use client';
import { AppSidebar } from "@rutas/app/dashboard/com/app-sidebar"
import { SiteHeader } from "@rutas/app/dashboard/chats/compo/site-header"
import { NavigationProvider } from "@rutas/app/context/NavigationContext"

import {
  SidebarInset,
  SidebarProvider,
} from "@rutas/components/ui/sidebar"

import { Chats } from "./compo/chats"
import { useAuth } from "../../context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Page() {
  const { user, loading } = useAuth(); 
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  if (loading ||!user) {
    return null;
  }

  return (
    <NavigationProvider>
      <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-3">
              <Chats chats={[
  {
    name: 'Juan Pérez',
    lastMessage: 'Último mensaje del paciente',
    time: '10:30 AM',
    unread: 2,
    variant: 'secondary'
  },
  {
    name: 'María González',
    lastMessage: 'Solicitud de cita urgente',
    time: '9:15 AM',
    unread: 5
  }
]} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </NavigationProvider>
  )
}
