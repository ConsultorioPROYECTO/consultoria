"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Settings } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

interface OrganizationSettingsProps {
  trigger?: React.ReactNode;
}

export function OrganizationSettings({ trigger }: OrganizationSettingsProps) {
  const { organization, loading, updateOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    nit: "",
    timezone: "",
    currency: "",
    welcomeMessage: "",
  });

  // Get supported timezones and currencies using Intl.supportedValuesOf
  const supportedTimezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone').sort();
    } catch (error) {
      console.warn('Intl.supportedValuesOf not supported for timeZone:', error);
      return ['America/Bogota', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
    }
  }, []);

  const supportedCurrencies = useMemo(() => {
    try {
      return Intl.supportedValuesOf('currency').sort();
    } catch (error) {
      console.warn('Intl.supportedValuesOf not supported for currency:', error);
      return ['USD', 'EUR', 'COP', 'GBP', 'JPY'];
    }
  }, []);

  // Actualizar el formulario cuando se carga la organización
  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || "",
        address: organization.address || "",
        phone: organization.phone || "",
        email: organization.email || "",
        nit: organization.nit || "",
        timezone: organization.timezone || "",
        currency: organization.currency || "",
        welcomeMessage: organization.welcomeMessage || "",
      });
    }
  }, [organization]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Filtrar solo los campos que han cambiado
      const changedFields: Record<string, string> = {};
      Object.entries(formData).forEach(([key, value]) => {
        const originalValue = organization?.[key as keyof typeof organization] || "";
        if (value !== originalValue && value.trim() !== "") {
          changedFields[key] = value.trim();
        }
      });

      if (Object.keys(changedFields).length === 0) {
        toast.info("No hay cambios para guardar");
        setIsOpen(false);
        return;
      }

      const success = await updateOrganization(changedFields);
      if (success) {
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Error al actualizar la organización:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" className="gap-2">
      <Settings className="h-4 w-4" />
      Configuración de la organización
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configuración de la organización</DialogTitle>
          <DialogDescription>
            Modifica la información de tu organización aquí. Haz clic en guardar cuando hayas terminado.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Cargando información...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nombre *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="col-span-3"
                  placeholder="Nombre de la organización"
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Dirección
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="col-span-3"
                  placeholder="Dirección de la organización"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="col-span-3"
                  placeholder="Número de teléfono"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="col-span-3"
                  placeholder="correo@organizacion.com"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nit" className="text-right">
                  NIT
                </Label>
                <Input
                  id="nit"
                  value={formData.nit}
                  onChange={(e) => handleInputChange("nit", e.target.value)}
                  className="col-span-3"
                  placeholder="Número de identificación tributaria"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="welcomeMessage" className="text-right">
                  Bienvenida
                </Label>
                <Input
                  id="welcomeMessage"
                  value={formData.welcomeMessage}
                  onChange={(e) => handleInputChange("welcomeMessage", e.target.value)}
                  className="col-span-3"
                  placeholder="Mensaje de bienvenida hacia los clientes"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="timezone" className="text-right">
                  Zona horaria
                </Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => handleInputChange("timezone", value)}
                >
                  <SelectTrigger className="col-span-3 w-full">
                    <SelectValue placeholder="Selecciona una zona horaria" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedTimezones.map((timezone) => (
                      <SelectItem key={timezone} value={timezone}>
                        {timezone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="currency" className="text-right">
                  Moneda
                </Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleInputChange("currency", value)}
                >
                  <SelectTrigger className="col-span-3 w-full">
                    <SelectValue placeholder="Selecciona una moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedCurrencies.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}


