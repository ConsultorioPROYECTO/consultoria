'use client';

import { CreateAppointmentCard } from "./_compo/CreateAppointmentCard";
import { CreatePatientModal } from "./_compo/CreatePatientModal";

export default function AssistantDashboard() {

  return (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <main className="flex-1 space-y-6 pb-4 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2 md:pt-2 lg:pt-2">
            <div  className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between mb-6">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

                <div className="grid gap-6 lg:grid-cols-2 lg:col-span-2">
                  {/* <WorkloadOverview /> */}
                  <CreateAppointmentCard/>
                  <CreatePatientModal />
                </div>

              </div>
            </div>
          </main>
        </div>
  )
}
