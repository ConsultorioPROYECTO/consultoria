'use client'

import { memo, useCallback, useMemo, useTransition, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useNavigation } from "@rutas/app/context/NavigationContext"
import dynamic from 'next/dynamic';
import { ConfigDrawer } from './config-drawer';

// Importación dinámica de iconos para reducir el bundle inicial
const Home = dynamic(() => import('lucide-react').then(mod => mod.Home));
const CalendarClock = dynamic(() => import('lucide-react').then(mod => mod.CalendarClock));
const Ellipsis = dynamic(() => import('lucide-react').then(mod => mod.Ellipsis));

// Importación dinámica de componentes de UI
const Tabs = dynamic(() => import('@/components/ui/tabs').then(mod => mod.Tabs));
const TabsList = dynamic(() => import('@/components/ui/tabs').then(mod => mod.TabsList));
const TabsTrigger = dynamic(() => import('@/components/ui/tabs').then(mod => mod.TabsTrigger));
const Button = dynamic(() => import('@/components/ui/button').then(mod => mod.Button));

const MobileNavbar = memo(() => {
  const [isPending, startTransition] = useTransition();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { setCurrentView, currentView } = useNavigation()
  const currentPath = usePathname();

  // Memoize function to handle view changes with useTransition
  const handleViewChange = useCallback((view: 'dashboard' | 'calendar') => {
    startTransition(() => {
      setCurrentView(view);
    });
  }, [setCurrentView]);

  // Memoize navItems to prevent recreation on every render (only main navigation items)
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

  // Separate config button
  const configButton = useMemo(() => ({
    title: '',
    icon: Ellipsis,
    url: '/dashboard/config',
    onClick: () => setIsDrawerOpen(true)
  }), []);

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
    className: "absolute inset-0 bg-primary rounded-full z-0",
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
        <Tabs 
          value={navItems[activeIndex]?.title.toLowerCase() || 'dashboard'} 
          className="flex-1 relative z-10"
        >
          <div className="relative">
            <motion.div {...motionProps} />
            <TabsList className="w-full h-10 p-0 bg-transparent grid grid-cols-2 gap-0 relative z-10">
            {navItems.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <TabsTrigger
                  key={item.title}
                  value={item.title.toLowerCase()}
                  onClick={() => handleItemClick(index)}
                  disabled={isPending}
                  className={`flex-1 flex justify-center items-center gap-2 h-10 rounded-full text-foreground transition-colors duration-300 ease-in-out border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none ${
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
          </div>
        </Tabs>
        
        {/* Config button positioned separately */}
        <Button
          variant="ghost"
          size="icon"
          onClick={configButton.onClick}
          disabled={isPending}
          className={`w-10 h-10 rounded-full ml-2 ${
            isPending ? 'cursor-wait' : ''
          }`}
        >
          <configButton.icon className={`h-5 w-5 ${
            isPending ? 'animate-pulse' : ''
          }`} />
        </Button>
      </div>
      
      <ConfigDrawer 
        isOpen={isDrawerOpen} 
        onOpenChange={setIsDrawerOpen}
      />
    </nav>
  );
});

MobileNavbar.displayName = 'MobileNavbar';

export { MobileNavbar };
