'use client';

import React from 'react';
import { AppSidebar } from '@/app/home/_components/app-sidebar';
import { SiteHeader } from '@/app/home/_components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { NavigationProvider } from '@/app/context/NavigationContext';
import { DashboardDataProvider } from '@/app/context/DashboardDataContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import ViewRenderer from './(manager-view)/ViewRenderer';
import { LoadingScreen } from './_components/loadingScreen';
import { useIsMobile } from '@/hooks/use-mobile'; // Importar el hook
import { MobileNavbar } from './_components/mobile-navbar'; // Importar el componente de navbar móvil

import { useAuth } from '@/app/context/AuthContext';

const DashboardLayout: React.FC = () => {
  const isMobile = useIsMobile(); // Usar el hook para detectar si es móvil

  return (
    <NavigationProvider>
      <DashboardDataProvider>
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
      </DashboardDataProvider>
    </NavigationProvider>
  );
};

export function ClientDashboard() {
  const { isAuthenticated, isLoading } = useAuthGuard();
  const { isLoadingRole } = useAuth();

  if (isLoading || isLoadingRole) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return null; // El hook useAuthGuard maneja la redirección
  }

  return <DashboardLayout />;
}