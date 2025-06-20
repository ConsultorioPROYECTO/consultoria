'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export type ViewType = 'dashboard' | 'calendar' | 'organization-config' | 'org-config' | 'organization';

interface NavigationContextType {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

// Helper function to determine view from pathname
const getViewFromPathname = (pathname: string): ViewType => {
  if (pathname.includes('/calender')) {
    return 'calendar';
  }
  return 'dashboard';
};

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const pathname = usePathname();
  const [currentView, setCurrentView] = useState<ViewType>(() => getViewFromPathname(pathname));

  // Sync currentView with pathname changes
  useEffect(() => {
    const viewFromPath = getViewFromPathname(pathname);
    setCurrentView(viewFromPath);
  }, [pathname]);

  const value = {
    currentView,
    setCurrentView,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};