'use client'

import { memo, useCallback, useMemo, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useNavigation } from "@rutas/app/context/NavigationContext"
import dynamic from 'next/dynamic';

// Importación dinámica de iconos para reducir el bundle inicial
const Home = dynamic(() => import('lucide-react').then(mod => mod.Home));
const CalendarClock = dynamic(() => import('lucide-react').then(mod => mod.CalendarClock));

// Importación dinámica de componentes de UI
const Tabs = dynamic(() => import('@/components/ui/tabs').then(mod => mod.Tabs));
const TabsList = dynamic(() => import('@/components/ui/tabs').then(mod => mod.TabsList));
const TabsTrigger = dynamic(() => import('@/components/ui/tabs').then(mod => mod.TabsTrigger));

const MobileNavbar = memo(() => {
  const [isPending, startTransition] = useTransition();
  const { setCurrentView, currentView } = useNavigation()
  const currentPath = usePathname();

  // Memoize function to handle view changes with useTransition
  const handleViewChange = useCallback((view: 'dashboard' | 'calendar') => {
    startTransition(() => {
      setCurrentView(view);
    });
  }, [setCurrentView]);

  // Memoize navItems to prevent recreation on every render
  const navItems = useMemo(() => [
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
  const isItemActive = useCallback((item: { title: string; url: string }) => {
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
  const activeIndex = useMemo(() => 
    navItems.findIndex(item => isItemActive(item)),
    [navItems, isItemActive]
  );

  // Memoize handle item click function
  const handleItemClick = useCallback((index: number) => {
    const item = navItems[index];
    if (item.onClick) {
      item.onClick();
    }
  }, [navItems]);

  // Memoize motion animation props
  const motionProps = useMemo(() => ({
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
        <Tabs 
          value={navItems[activeIndex]?.title.toLowerCase() || 'dashboard'} 
          className="w-full relative z-10"
        >
          <TabsList className="w-full h-auto p-0 bg-transparent grid grid-cols-2 gap-0">
            {navItems.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <TabsTrigger
                  key={item.title}
                  value={item.title.toLowerCase()}
                  onClick={() => handleItemClick(index)}
                  disabled={isPending}
                  className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-full text-foreground transition-colors duration-300 ease-in-out border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none ${
                    isActive ? '' : 'hover:bg-muted'
                  } ${
                    isPending ? 'cursor-wait' : ''
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${
                    isActive ? 'text-primary-foreground' : 'text-foreground'
                  } ${
                    isPending ? 'animate-pulse' : ''
                  }`} />
                  {isActive && <span className="text-sm font-semibold text-primary-foreground">{item.title}</span>}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
    </nav>
  );
});

MobileNavbar.displayName = 'MobileNavbar';

export { MobileNavbar };
