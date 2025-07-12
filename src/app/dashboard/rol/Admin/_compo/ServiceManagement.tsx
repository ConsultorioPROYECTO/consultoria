'use client';

import { Button } from "@rutas/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@rutas/components/ui/card";
import { Stethoscope, Plus, Settings, Heart } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@rutas/components/ui/dialog";
import { ServiceSpecialtyConfig } from "./ServiceSpecialtyConfig";

export function ServiceManagement() {
  const [isServiceConfigOpen, setIsServiceConfigOpen] = useState(false);

  return (
    <>
      <Card className="bg-card text-card-foreground gap-6 rounded-xl border py-6 shadow-sm flex flex-col justify-between h-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                Gestión de Servicios Médicos
              </CardTitle>
              <CardDescription>
                Administra servicios, categorías y especialidades médicas de tu organización.
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsServiceConfigOpen(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Ver Todos los Servicios
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 py-16">
          <div className="flex items-center justify-center">
            <div className="w-24 h-24 text-muted-foreground flex items-center justify-center">
              <Stethoscope className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              size="lg" 
              className="flex items-center gap-2 px-8"
              onClick={() => setIsServiceConfigOpen(true)}
            >
              <Plus className="h-5 w-5" />
              Nuevo Servicio
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para configuración de servicios */}
      <Dialog open={isServiceConfigOpen} onOpenChange={setIsServiceConfigOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Configuración de Servicios y Especialidades</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            <ServiceSpecialtyConfig />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}