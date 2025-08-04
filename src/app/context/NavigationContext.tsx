'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ViewType = 'Home' | 'calendar' | 'patients' | 'organization' | 'configuration' | 'ai-care';

interface NavigationContextType {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewType>('Home');

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