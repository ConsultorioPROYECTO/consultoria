import React from 'react';
import { Suspense } from 'react';
import { ClientDashboard } from './ClientDashboard';
export default function Page() {
  return (
    <Suspense>
      <ClientDashboard />
    </Suspense>
  );
}
