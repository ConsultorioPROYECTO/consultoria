'use client'

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useNavigation } from "@rutas/app/context/NavigationContext"
import { Home, CalendarClock } from 'lucide-react';

const MobileNavbar = React.memo(() => {
  const [isPending, startTransition] = React.useTransition();
  const { setCurrentView, currentView } = useNavigation()
  const currentPath = usePathname();

  // Memoize function to handle view changes with useTransition
  const handleViewChange = React.useCallback((view: 'dashboard' | 'calendar') => {
    startTransition(() => {
      setCurrentView(view);
    });
  }, [setCurrentView]);

  // Memoize navItems to prevent recreation on every render
  const navItems = React.useMemo(() => [
    { 
      title: 'Dashboard', 
      icon: Home, 
      url: '/dashboard', 
      onClick: () => handleViewChange('dashboard')
    },
    { 
      title: 'Calendario', 
      icon: CalendarClock, 
      url: '/dashboard/calender', 
      onClick: () => handleViewChange('calendar')
    },
  ], [handleViewChange]);

  // Memoize helper function to determine if an item is active
  const isItemActive = React.useCallback((item: { title: string; url: string }) => {
    // For calendar, check both URL and currentView
    if (item.title === 'Calendario') {
      return currentView === 'calendar';
    }
    // For dashboard, check if we're on dashboard view and not on calendar
    if (item.title === 'Dashboard') {
      return currentView === 'dashboard' && currentPath === '/dashboard';
    }
    // For other items, use URL comparison
    return item.url === currentPath;
  }, [currentView, currentPath]);

  // Memoize active index calculation
  const activeIndex = React.useMemo(() => 
    navItems.findIndex(item => isItemActive(item)),
    [navItems, isItemActive]
  );

  // Memoize handle item click function
  const handleItemClick = React.useCallback((index: number) => {
    const item = navItems[index];
    if (item.onClick) {
      item.onClick();
    }
  }, [navItems]);

  // Memoize motion animation props
  const motionProps = React.useMemo(() => ({
    className: "absolute top-0 left-0 h-full bg-primary rounded-full z-0",
    style: { width: `${100 / navItems.length}%` },
    initial: false,
    animate: { x: `${activeIndex * 100}%` },
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  }), [navItems.length, activeIndex]);

  return (
    <nav className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md mx-auto bg-card border border-border rounded-full p-2 shadow-lg transition-opacity duration-200 z-50 ${
      isPending ? 'opacity-90' : ''
    }`}>
      <div className="relative flex items-center">
        <motion.div {...motionProps} />
        {navItems.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <div key={item.title} className="relative z-10 flex-1">
              <button
                onClick={() => handleItemClick(index)}
                disabled={isPending}
                className={`w-full flex justify-center items-center gap-2 py-2 rounded-full text-foreground transition-colors duration-300 ease-in-out ${
                  isActive ? '' : 'hover:bg-muted'
                } ${
                  isPending ? 'cursor-wait' : ''
                }`}>
                <item.icon className={`h-5 w-5 ${
                  isActive ? 'text-primary-foreground' : 'text-foreground'
                } ${
                  isPending ? 'animate-pulse' : ''
                }`} />
                {isActive && <span className="text-sm font-semibold text-primary-foreground">{item.title}</span>}
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
});

MobileNavbar.displayName = 'MobileNavbar';

export { MobileNavbar };
