'use client';
import { AppSidebar } from "@rutas/app/dashboard/com/app-sidebar"
import { ChartAreaInteractive } from "@rutas/app/dashboard/com/chart-area-interactive"
import { DataTable } from "@rutas/app/dashboard/com/data-table"
import { SectionCards } from "@rutas/app/dashboard/com/section-cards"
import { SiteHeader } from "@rutas/app/dashboard/com/site-header"
import { UpcomingAppointments } from "@rutas/app/dashboard/com/UpcomingAppointments"
import { PendingInteractions } from "@rutas/app/dashboard/com/PendingInteractions"
import { AIStats } from "@rutas/app/dashboard/com/AIStats"
import { QuickActions } from "@rutas/app/dashboard/com/QuickActions"
import { AutomatedMessagesTracker } from "./compo/AutomatedMessagesTracker";
import { RealTimeAvailability } from "./compo/RealTimeAvailability";
import { DirectContactTools } from "./compo/DirectContactTools";
import { CommunicationTemplates } from "./compo/CommunicationTemplates";
import { ScheduleChangeNotifications } from "./compo/ScheduleChangeNotifications";
import { WaitingListManagement } from "./compo/WaitingListManagement";
import { ConflictResolutionCenter } from "./compo/ConflictResolutionCenter";
import {
  SidebarInset,
  SidebarProvider,
} from "@rutas/components/ui/sidebar"

import data from "../data.json"
import { useAuth } from "../../context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getFirebaseAuthToken } from "@lib/firebase/clientUtils"

export default function Page() {
  const { user, loading } = useAuth(); 
  const router = useRouter();
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (!loading && user) {
      (async () => {
        try {
          const token = await getFirebaseAuthToken();
          const res = await fetch('/api/users/rol', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('No se pudo obtener el rol');
          const { role } = await res.json();
          if (role === 'asistente') {
            setCheckingRole(false);
          } else if (role === 'admin') {
            router.push('/dashboard/1');
          } else if (role === 'medico') {
            router.push('/dashboard/2');
          } else if (role === 'N/A') {
            router.push('/onboard');
          } else {
            router.push('/login');
          }
        } catch (err) {
          console.error(err);
          if (user) router.push('/login');
        }
      })();
    }
  }, [user, loading, router]);
  if (loading || !user || checkingRole) {
    return null;
  }

  return (
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
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              {/* Nuevos componentes del dashboard */}
              <div className="grid gap-4 px-4 md:grid-cols-2 lg:grid-cols-2 lg:px-6 xl:grid-cols-4">
                <UpcomingAppointments />
                <PendingInteractions />
                <AIStats />
                <QuickActions />
              </div>

              {/* Nuevos componentes específicos para el Asistente */}
              <div className="grid gap-4 px-4 md:grid-cols-1 lg:grid-cols-2 lg:px-6 xl:grid-cols-2">
                <RealTimeAvailability />
                <DirectContactTools />
              </div>
              <div className="grid gap-4 px-4 md:grid-cols-1 lg:grid-cols-1 lg:px-6 xl:grid-cols-1">
                <AutomatedMessagesTracker /> 
              </div>
               <div className="grid gap-4 px-4 md:grid-cols-1 lg:grid-cols-2 lg:px-6 xl:grid-cols-2">
                <CommunicationTemplates />
                <ScheduleChangeNotifications />
              </div>
              <div className="grid gap-4 px-4 md:grid-cols-1 lg:grid-cols-2 lg:px-6 xl:grid-cols-2">
                <WaitingListManagement />
                <ConflictResolutionCenter />
              </div>

              <div className="px-4 lg:px-6 mt-4">
                <ChartAreaInteractive />
              </div>
              <DataTable />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
