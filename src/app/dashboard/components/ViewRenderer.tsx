'use client';
import React, { useState, useEffect, useMemo } from 'react';
import CalendarView from '../calender/com/calendar-view';
import RoleBasedRenderer from './RoleBasedRenderer';
import { useNavigation } from '@rutas/app/context/NavigationContext';
import { useUserRole } from '@rutas/app/hooks/useUserRole';

const ViewRenderer: React.FC = () => {
  const { currentView } = useNavigation();
  const { userRole, isLoadingRole, error } = useUserRole();
  const [hasLoadedDashboard, setHasLoadedDashboard] = useState(false);
  const [hasLoadedCalendar, setHasLoadedCalendar] = useState(false);

  // Marcar como cargado cuando el dashboard se carga por primera vez
  useEffect(() => {
    if (currentView === 'dashboard' && userRole && !isLoadingRole && !error) {
      setHasLoadedDashboard(true);
    }
    if (currentView === 'calendar') {
      setHasLoadedCalendar(true);
    }
  }, [currentView, userRole, isLoadingRole, error]);

  // Memoizar los componentes para evitar re-renderizados innecesarios
  const dashboardComponent = useMemo(() => {
    if (!hasLoadedDashboard && isLoadingRole) {
      return (
        <RoleBasedRenderer 
          userRole={userRole} 
          isLoading={true} 
          error={error} 
        />
      );
    }
    return (
      <RoleBasedRenderer 
        userRole={userRole} 
        isLoading={false} 
        error={error} 
      />
    );
  }, [userRole, hasLoadedDashboard, isLoadingRole, error]);

  const calendarComponent = useMemo(() => (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 space-y-6 pb-4 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2 md:pt-2 lg:pt-2">
        <div className="h-full w-full flex flex-col">
          <CalendarView />
        </div>
      </main>
    </div>
  ), []);

  // Renderizar ambos componentes pero mostrar solo el activo
  return (
    <>
      <div style={{ display: currentView === 'dashboard' ? 'block' : 'none' }}>
        {dashboardComponent}
      </div>
      <div style={{ display: currentView === 'calendar' ? 'block' : 'none' }}>
        {hasLoadedCalendar && calendarComponent}
      </div>
    </>
  );
};

export default ViewRenderer;