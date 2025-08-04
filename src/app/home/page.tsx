import React from 'react';
import { Suspense } from 'react';
import { ClientDashboard } from './ClientDashboard';

// Este componente es un Server Component por defecto (sin 'use client')
export default function Page() {
  return (
    <Suspense>
      <ClientDashboard />
    </Suspense>
  );
}
