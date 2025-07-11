'use client';

import { ChartAreaInteractive } from "@/app/dashboard/rol/Admin/_compo/chart-area-interactive"
import { DataTable } from "@rutas/app/dashboard/com/data-table"
import { SectionCards } from "@rutas/app/dashboard/com/section-cards"
import { UpcomingAppointments } from "@/app/dashboard/com/AssistantDashboardAppointments"
import { PendingInteractions } from "@rutas/app/dashboard/com/PendingInteractions"
import { AIStats } from "@rutas/app/dashboard/com/AIStats"
import { QuickActions } from "@rutas/app/dashboard/com/QuickActions"
import { AutomatedMessagesTracker } from "./_compo/AutomatedMessagesTracker";
import { RealTimeAvailability } from "./_compo/RealTimeAvailability";
import { DirectContactTools } from "./_compo/DirectContactTools";
import { CommunicationTemplates } from "./_compo/CommunicationTemplates";
import { ScheduleChangeNotifications } from "./_compo/ScheduleChangeNotifications";
import { WaitingListManagement } from "./_compo/WaitingListManagement";
import { ConflictResolutionCenter } from "./_compo/ConflictResolutionCenter";

export default function AssistantDashboard() {

  return (
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
  )
}
