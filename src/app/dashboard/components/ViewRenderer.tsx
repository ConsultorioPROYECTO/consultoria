'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import RoleBasedRenderer, { UserRole } from './RoleBasedRenderer';
import { useNavigation } from '@rutas/app/context/NavigationContext';
import { useAuth } from '@/app/context/AuthContext';
import WaveformLoader from '@rutas/components/custom/WaveformLoader';

// Componente de loading centralizado
const LoadingSpinner = () => (
  <div className="flex h-screen flex-col items-center justify-center">
    <WaveformLoader className="w-24 h-auto text-muted-foreground" />
  </div>
);

// Lazy load CalendarView solo cuando sea necesario
const CalendarView = dynamic(() => import('../calender/calendar-view'), {
  loading: LoadingSpinner,
  ssr: false,
});

const OrganizationConfigView = dynamic(() => import('../organization/configorganization-view'), {
  loading: LoadingSpinner,
  ssr: false,
});

const ConfigurationView = dynamic(() => import('../configurations/config-view'), {
  loading: LoadingSpinner,
  ssr: false,
});

const AiCareView = dynamic(() => import('../ai-care/ai-care-view'), {
  loading: LoadingSpinner,
  ssr: false,
});

const CalendarWrapper = () => (
  <div className="flex flex-1 flex-col overflow-hidden">
    <main className="flex-1 space-y-6 pb-22 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2">
      <div className="h-full w-full flex flex-col">
        <Suspense fallback={<LoadingSpinner />}>
          <CalendarView />
        </Suspense>
      </div>
    </main>
  </div>
);

const OrganizationConfigWrapper = () => (
  <div className="flex flex-1 flex-col overflow-hidden">
    <main className="flex-1 space-y-6 pb-22 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2">
      <div className="h-full w-full flex flex-col">
        <Suspense fallback={<LoadingSpinner />}>
          <OrganizationConfigView />
        </Suspense>
      </div>
    </main>
  </div>
);

const ConfigurationWrapper = () => (
  <div className="flex flex-1 flex-col overflow-hidden">
    <main className="flex-1 space-y-6 pb-22 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2">
      <div className="h-full w-full flex flex-col">
        <Suspense fallback={<LoadingSpinner />}>
          <ConfigurationView />
        </Suspense>
      </div>
    </main>
  </div>
);

const AiCareWrapper = () => (
  <div className="flex flex-1 flex-col h-screen overflow-hidden">
    <main className="flex-1 space-y-6 pb-22 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2 md:pt-2 lg:pt-2 flex flex-col">
      <div className="h-screen w-full flex flex-col flex-1">
        <Suspense fallback={<LoadingSpinner />}>
          <AiCareView />
        </Suspense>
      </div>
    </main>
  </div>
);

const ViewRenderer: React.FC = () => {
  const { currentView } = useNavigation();
  const { userRole, isLoadingRole, error } = useAuth();

  // Manejo por casos usando switch para mejor escalabilidad
  switch (currentView) {
    case 'calendar':
      return <CalendarWrapper />;
    
    case 'organization':
      return <OrganizationConfigWrapper />;
    
    case 'configuration':
      return <ConfigurationWrapper />;
    
    case 'ai-care':
      return <AiCareWrapper />;
    
    case 'dashboard':
    default:
      // Vista dashboard por defecto
      return (
        <RoleBasedRenderer 
          userRole={userRole as UserRole} 
          isLoading={isLoadingRole} 
          error={error?.message || null} 
        />
      );
  }
};

export default ViewRenderer;