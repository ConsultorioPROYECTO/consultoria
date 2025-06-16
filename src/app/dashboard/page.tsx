'use client';

import React from 'react';
import { AppSidebar } from '@rutas/app/dashboard/com/app-sidebar';
import { SiteHeader } from '@rutas/app/dashboard/com/site-header';
import {
  SidebarInset,
  SidebarProvider,
} from '@rutas/components/ui/sidebar';
import { NavigationProvider } from '@rutas/app/context/NavigationContext';
import { useAuthGuard } from '@rutas/app/hooks/useAuthGuard';
import ViewRenderer from './components/ViewRenderer';
import { LoadingScreen } from './com/loadingScreen';


const DashboardLayout: React.FC = () => {
  return (
    <NavigationProvider>
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
    </NavigationProvider>
  );
};

export default function Page() {
  const { isAuthenticated, isLoading } = useAuthGuard();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return null; // El hook useAuthGuard maneja la redirección
  }

  return <DashboardLayout />;
}
