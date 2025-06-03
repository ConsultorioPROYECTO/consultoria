"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@rutas/components/ui/dialog"
import { Label } from "@rutas/components/ui/label";
import { Input } from "@rutas/components/ui/input";

interface OrganizationSettingsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizationSettings({ isOpen, onOpenChange }: OrganizationSettingsProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configuración de la organización</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="organizationName">Nombre de la Organización</Label>
            <Input id="organizationName" defaultValue="Mi Organización" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" defaultValue="Calle Falsa 123" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" defaultValue="+1234567890" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


