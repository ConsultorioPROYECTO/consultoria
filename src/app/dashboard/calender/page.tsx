"use client";

import CalendarView from "./com/calendar-view";
import { AppSidebar } from "@rutas/app/dashboard/com/app-sidebar";
import { SiteHeader } from "@rutas/app/dashboard/com/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@rutas/components/ui/sidebar";
import * as React from 'react'; // Asegúrate de que React esté importado

export default function CalendarPage() {
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
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 space-y-6 pb-4 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2 md:pt-2 lg:pt-2">
            <div className="h-full w-full flex flex-col">
              <CalendarView />
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}