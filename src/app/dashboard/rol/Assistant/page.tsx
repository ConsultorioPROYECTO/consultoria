'use client';

import { CreateAppointmentModal } from "./_compo/CreateAppointmentModal";
import { CreatePatientModal } from "./_compo/CreatePatientModal";

export default function AssistantDashboard() {

  return (
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <CreateAppointmentModal/>
              <CreatePatientModal />
            </div>
          </div>
        </div>
  )
}
