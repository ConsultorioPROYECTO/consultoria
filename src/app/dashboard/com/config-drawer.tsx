'use client';

import { memo } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Settings, User, Bell, Shield, Palette, HelpCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ConfigDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ConfigDrawer = memo(({ isOpen, onOpenChange }: ConfigDrawerProps) => {

  const configOptions = [
    {
      icon: User,
      title: 'Perfil',
      description: 'Gestiona tu información personal',
      action: () => console.log('Abrir perfil'),
    },
    {
      icon: Bell,
      title: 'Notificaciones',
      description: 'Configura tus preferencias de notificación',
      action: () => console.log('Abrir notificaciones'),
    },
    {
      icon: Shield,
      title: 'Privacidad y Seguridad',
      description: 'Controla tu privacidad y configuración de seguridad',
      action: () => console.log('Abrir privacidad'),
    },
    {
      icon: Palette,
      title: 'Apariencia',
      description: 'Personaliza el tema y la apariencia',
      action: () => console.log('Abrir apariencia'),
    },
    {
      icon: HelpCircle,
      title: 'Ayuda y Soporte',
      description: 'Obtén ayuda y contacta con soporte',
      action: () => console.log('Abrir ayuda'),
    },
  ];

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-center">
          <DrawerTitle className="flex items-center justify-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración
          </DrawerTitle>
          <DrawerDescription>
            Gestiona tus preferencias y configuración de la aplicación
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="px-4 pb-4 space-y-2 overflow-y-auto">
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
                  <div className="flex items-start gap-3 w-full">
                    <IconComponent className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 space-y-1">
                      <p className="font-medium leading-none">{option.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </Button>
                {index < configOptions.length - 1 && (
                  <Separator className="my-2" />
                )}
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