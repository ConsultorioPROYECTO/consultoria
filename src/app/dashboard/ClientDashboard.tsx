'use client';

import React from 'react';
import { AppSidebar } from '@rutas/app/dashboard/com/app-sidebar';
import { SiteHeader } from '@rutas/app/dashboard/com/site-header';
import { SidebarInset, SidebarProvider } from '@rutas/components/ui/sidebar';
import { NavigationProvider } from '@rutas/app/context/NavigationContext';
import { useAuthGuard } from '@rutas/app/hooks/useAuthGuard';
import ViewRenderer from './components/ViewRenderer';
import { LoadingScreen } from './com/loadingScreen';
import { useIsMobile } from '@rutas/hooks/use-mobile'; // Importar el hook
import { MobileNavbar } from './com/mobile-navbar'; // Importar el componente de navbar móvil

const DashboardLayout: React.FC = () => {
  const isMobile = useIsMobile(); // Usar el hook para detectar si es móvil

  return (
    <NavigationProvider>
      {isMobile ? (
        // Layout para móvil
        <>
          <ViewRenderer />
          <MobileNavbar />
        </>
      ) : (
        // Layout para escritorio
        <SidebarProvider
          style={{
            '--sidebar-width': 'calc(var(--spacing) * 72)',
            '--header-height': 'calc(var(--spacing) * 12)',
          } as React.CSSProperties}
        >
          <AppSidebar variant="inset" />
          <SidebarInset>
            <SiteHeader />
            <ViewRenderer />
          </SidebarInset>
        </SidebarProvider>
      )}
    </NavigationProvider>
  );
};

export function ClientDashboard() {
  const { isAuthenticated, isLoading } = useAuthGuard();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return null; // El hook useAuthGuard maneja la redirección
  }

  return <DashboardLayout />;
}