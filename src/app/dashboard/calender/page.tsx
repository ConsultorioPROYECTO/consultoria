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
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="h-full w-full flex flex-col">
              <CalendarView />
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}