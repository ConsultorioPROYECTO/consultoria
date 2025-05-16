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
import {
  SidebarInset,
  SidebarProvider,
} from "@rutas/components/ui/sidebar"

import data from "./data.json"
import { useAuth } from "../context/AuthContext"
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
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable data={data} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
