'use client'

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { CheckCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface OnboardSuccessModalProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardSuccessModal({ open, onClose }: OnboardSuccessModalProps) {
  const isMobile = useIsMobile();

  const content = (
    <>
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">
          ¡Onboard Completado Exitosamente!
        </h2>
        <p className="text-muted-foreground mb-6">
          Tu configuración se ha guardado correctamente. Para que los datos se sincronicen adecuadamente, 
          necesitas cerrar sesión e iniciar sesión nuevamente.
        </p>
      </div>
      <div className="flex justify-center">
        <Button 
          onClick={onClose}
          className="w-full"
        >
          Entendido, cerrar sesión
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={() => {}}>
        <DrawerContent className="min-h-[50vh] max-h-[80vh]">
          <DrawerHeader className="text-center">
            <DrawerTitle className="sr-only">Onboard Completado</DrawerTitle>
            <DrawerDescription className="sr-only">
              Configuración completada exitosamente
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-6 pb-8 pt-4">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="sr-only">Onboard Completado</DialogTitle>
          <DialogDescription className="sr-only">
            Configuración completada exitosamente
          </DialogDescription>
        </DialogHeader>
        <div className="p-2">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}