'use client';

import { memo } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Settings, Bell, Building, LogOut } from 'lucide-react';
import { useNavigation } from '@/app/context/NavigationContext';
import { useAuth } from '@/app/context/AuthContext';

interface ConfigDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ConfigDrawer = memo(({ isOpen, onOpenChange }: ConfigDrawerProps) => {
  const { setCurrentView } = useNavigation();
  const { signOut } = useAuth();

  const configOptions = [
    {
      icon: Settings,
      title: 'Configuración',
      action: () => setCurrentView('configuration'),
    },
    {
      icon: Building,
      title: 'Organizacion',
      action: () => setCurrentView('organization'),
    },
    {
      icon: Bell,
      title: 'Notificaciones',
      action: () => console.log('Abrir perfil'),
    },
    {
      icon: LogOut,
      title: 'Cerrar sesión',
      action: () => signOut(),
    },
  ];

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex justify-center text-xl sr-only">Más</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pt-4 pb-4 space-y-2 overflow-y-auto">
          {configOptions.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <div key={index}>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto p-4 text-left"
                  onClick={() => {
                    option.action();
                    onOpenChange(false);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <IconComponent className="h-6 w-6 text-muted-foreground" />
                    <span className="text-lg font-medium">{option.title}</span>
                  </div>
                </Button>
              </div>
            );
          })}
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Cerrar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
});

ConfigDrawer.displayName = 'ConfigDrawer';

export { ConfigDrawer };