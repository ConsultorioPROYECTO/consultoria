'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ViewType, NAVIGATION_VIEWS, isValidView } from '@/app/constants/navigation';

// Re-export for backward compatibility
export type { ViewType } from '@/app/constants/navigation';
export { NAVIGATION_VIEWS } from '@/app/constants/navigation';

interface NavigationContextType {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  navigateToView: (view: ViewType) => void;
  isValidView: (view: string) => view is ViewType;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewType>(NAVIGATION_VIEWS.HOME);

  // Enhanced navigation function with validation
  const navigateToView = useCallback((view: ViewType) => {
    if (isValidView(view)) {
      setCurrentView(view);
    } else {
      console.warn(`Invalid view type: ${view}`);
    }
  }, []);

  const value = {
    currentView,
    setCurrentView,
    navigateToView,
    isValidView,
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