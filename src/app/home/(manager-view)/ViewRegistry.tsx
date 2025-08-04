'use client';

import React, { Suspense, ComponentType } from 'react';
import dynamic from 'next/dynamic';
import { ViewType, NAVIGATION_VIEWS } from '@/app/constants/navigation';
import WaveformLoader from '@rutas/components/custom/WaveformLoader';
import RoleBasedRenderer, { UserRole } from './RoleBasedRenderer';
import { useAuth } from '@/app/context/AuthContext';

// Centralized loading component
const LoadingSpinner = () => (
  <div className="flex h-screen flex-col items-center justify-center">
    <WaveformLoader className="w-24 h-auto text-muted-foreground" />
  </div>
);

// Dynamic imports with optimized loading
const CalendarView = dynamic(() => import('../(views)/calender/calendar-view'), {
  loading: LoadingSpinner,
  ssr: false,
});

const OrganizationConfigView = dynamic(() => import('../(views)/organization/configorganization-view'), {
  loading: LoadingSpinner,
  ssr: false,
});

const ConfigurationView = dynamic(() => import('../(views)/configurations/config-view'), {
  loading: LoadingSpinner,
  ssr: false,
});

const AiCareView = dynamic(() => import('../(views)/ai-care/ai-care-view'), {
  loading: LoadingSpinner,
  ssr: false,
});

const PatientsView = dynamic(() => import('../(views)/patients/patients-view'), {
  loading: LoadingSpinner,
  ssr: false,
});

// Wrapper component factory for consistent layout
const createViewWrapper = (
  Component: ComponentType<Record<string, unknown>>,
  customClassName?: string
) => {
  const WrappedComponent = React.memo(() => (
    <div className={`flex flex-1 flex-col overflow-hidden ${customClassName || ''}`}>
      <main className="flex-1 space-y-6 pb-22 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2">
        <div className="h-full w-full flex flex-col">
          <Suspense fallback={<LoadingSpinner />}>
            <Component />
          </Suspense>
        </div>
      </main>
    </div>
  ));
  
  WrappedComponent.displayName = 'WrappedComponent';
  return WrappedComponent;
};

// Special wrapper for AI Care with different layout
const AiCareWrapper = React.memo(() => (
  <div className="flex flex-1 flex-col h-screen overflow-hidden">
    <main className="flex-1 space-y-6 pb-22 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2 md:pt-2 lg:pt-2 flex flex-col">
      <div className="h-screen w-full flex flex-col flex-1">
        <Suspense fallback={<LoadingSpinner />}>
          <AiCareView />
        </Suspense>
      </div>
    </main>
  </div>
));
AiCareWrapper.displayName = 'AiCareWrapper';

// Home component wrapper
const HomeWrapper = React.memo(() => {
  const { userRole, isLoadingRole, error } = useAuth();
  
  return (
    <RoleBasedRenderer 
      userRole={userRole as UserRole} 
      isLoading={isLoadingRole} 
      error={error?.message || null} 
    />
  );
});
HomeWrapper.displayName = 'HomeWrapper';

// View registry with type-safe mapping

export const VIEW_REGISTRY: Record<ViewType, ComponentType<Record<string, unknown>>> = {
  [NAVIGATION_VIEWS.HOME]: HomeWrapper,
  [NAVIGATION_VIEWS.CALENDAR]: createViewWrapper(CalendarView),
  [NAVIGATION_VIEWS.ORGANIZATION]: createViewWrapper(OrganizationConfigView),
  [NAVIGATION_VIEWS.CONFIGURATION]: createViewWrapper(ConfigurationView),
  [NAVIGATION_VIEWS.AI_CARE]: AiCareWrapper,
  [NAVIGATION_VIEWS.PATIENTS]: createViewWrapper(PatientsView),
} as const;

// Type-safe view renderer function
export const renderView = (viewType: ViewType): React.ReactElement => {
  const ViewComponent = VIEW_REGISTRY[viewType];
  return <ViewComponent />;
};

// Preload function for performance optimization
export const preloadView = (viewType: ViewType): void => {
  // Only preload if the view is not the home view (which is always loaded)
  if (viewType === NAVIGATION_VIEWS.HOME) return;
  
  // Trigger dynamic import to preload the component
  switch (viewType) {
    case NAVIGATION_VIEWS.CALENDAR:
      import('../(views)/calender/calendar-view');
      break;
    case NAVIGATION_VIEWS.ORGANIZATION:
      import('../(views)/organization/configorganization-view');
      break;
    case NAVIGATION_VIEWS.CONFIGURATION:
      import('../(views)/configurations/config-view');
      break;
    case NAVIGATION_VIEWS.AI_CARE:
      import('../(views)/ai-care/ai-care-view');
      break;
    case NAVIGATION_VIEWS.PATIENTS:
      import('../(views)/patients/patients-view');
      break;
  }
};