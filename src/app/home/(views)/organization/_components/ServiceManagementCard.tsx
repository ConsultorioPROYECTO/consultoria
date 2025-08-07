'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Plus } from "lucide-react";
import { useState } from "react";

import { ServiceSpecialtyConfig } from "./ServiceManagementModal";

export function ServiceManagement() {
  const [isServiceConfigOpen, setIsServiceConfigOpen] = useState(false);

  return (
    <>
      <Card className="flex flex-col justify-between h-full">
        <CardHeader className="gap-0">
          <CardTitle className="text-2xl font-bold flex items-start justify-between">
            Gestión de Servicios Médicos
                  <Button 
                    size="sm" className="ml-2 selection:bg-secondary selection:text-primary"
                    onClick={() => setIsServiceConfigOpen(true)}
                  >
                    <Plus className="h-5 w-5" />
                    Servicios
                  </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-center items-center text-center space-y-4">
          <div className="text-muted-foreground">
              <Stethoscope className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Administra servicios, categorías y especialidades médicas de tu organización.</p>
          </div>   
        </CardContent>
      </Card>

      {/* Modal para configuración de servicios */}
      <ServiceSpecialtyConfig 
        isOpen={isServiceConfigOpen} 
        onOpenChange={setIsServiceConfigOpen} 
      />
    </>
  );
}