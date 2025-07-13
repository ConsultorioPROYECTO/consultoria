'use client';

import { CreateAppointmentModal } from "./_compo/CreateAppointmentModal";
import { CreatePatientModal } from "./_compo/CreatePatientModal";

export default function AssistantDashboard() {

  return (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <main className="flex-1 space-y-6 pb-4 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2 md:pt-2 lg:pt-2">
            <div  className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between mb-6">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <CreateAppointmentModal/>
                <CreatePatientModal />
              </div>
            </div>
          </main>
        </div>
  )
}
