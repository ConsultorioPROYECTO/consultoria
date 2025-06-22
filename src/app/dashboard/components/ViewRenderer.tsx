'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import RoleBasedRenderer from './RoleBasedRenderer';
import { useNavigation } from '@rutas/app/context/NavigationContext';
import { useUserRole } from '@rutas/app/hooks/useUserRole';
import WaveformLoader from '@rutas/components/custom/WaveformLoader';

// Lazy load CalendarView solo cuando sea necesario
const CalendarView = dynamic(() => import('../calender/calendar-view'), {
  loading: () => <WaveformLoader className="w-16 h-auto text-muted-foreground" />,
  ssr: false,
});

const OrganizationConfigView = dynamic(() => import('../organization/configorganization-view'), {
  loading: () => <WaveformLoader className="w-16 h-auto text-muted-foreground" />,
  ssr: false,
});

const ConfigurationView = dynamic(() => import('../configurations/config-view'), {
  loading: () => <WaveformLoader className="w-16 h-auto text-muted-foreground" />,
  ssr: false,
});

const LoadingSpinner = () => (
  <div className="flex h-screen flex-col items-center justify-center">
    <WaveformLoader className="w-24 h-auto text-muted-foreground" />
  </div>
);

const CalendarWrapper = () => (
  <div className="flex flex-1 flex-col overflow-hidden">
    <main className="flex-1 space-y-6 pb-4 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2 md:pt-2 lg:pt-2">
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
    <main className="flex-1 space-y-6 pb-4 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2 md:pt-2 lg:pt-2">
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
    <main className="flex-1 space-y-6 pb-4 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2 md:pt-2 lg:pt-2">
      <div className="h-full w-full flex flex-col">
        <Suspense fallback={<LoadingSpinner />}>
          <ConfigurationView />
        </Suspense>
      </div>
    </main>
  </div>
);

const ViewRenderer: React.FC = () => {
  const { currentView } = useNavigation();
  const { userRole, isLoadingRole, error } = useUserRole();

  // Manejo por casos usando switch para mejor escalabilidad
  switch (currentView) {
    case 'calendar':
      return <CalendarWrapper />;
    
    case 'organization':
      return <OrganizationConfigWrapper />;
    
    case 'configuration':
      return <ConfigurationWrapper />;
    
    case 'dashboard':
    default:
      // Vista dashboard por defecto
      return (
        <RoleBasedRenderer 
          userRole={userRole} 
          isLoading={isLoadingRole} 
          error={error} 
        />
      );
  }
};

export default ViewRenderer;