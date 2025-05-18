// src/app/dashboard/1/compo/ServiceSpecialtyConfig.tsx
'use client';

import { Button } from "@rutas/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@rutas/components/ui/card";
import { Input } from "@rutas/components/ui/input";
import { Label } from "@rutas/components/ui/label";
import { Switch } from "@rutas/components/ui/switch";
import { Badge } from "@rutas/components/ui/badge";
import { useState } from "react";

interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number;
  isActive: boolean;
}

interface Specialty {
  id: string;
  name: string;
  services: string[]; // array of service IDs
  isActive: boolean;
}

// Mock data
const initialServices: Service[] = [
  { id: "s1", name: "Consulta General", duration: 30, price: 50, isActive: true },
  { id: "s2", name: "Consulta Especializada", duration: 45, price: 80, isActive: true },
  { id: "s3", name: "Revisión Postoperatoria", duration: 20, price: 30, isActive: false },
];

const initialSpecialties: Specialty[] = [
  { id: "sp1", name: "Cardiología", services: ["s1", "s2"], isActive: true },
  { id: "sp2", name: "Pediatría", services: ["s1"], isActive: true },
  { id: "sp3", name: "Dermatología", services: [], isActive: false },
];

export function ServiceSpecialtyConfig() {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [specialties, setSpecialties] = useState<Specialty[]>(initialSpecialties);
  // Lógica para agregar, editar, activar/desactivar servicios y especialidades

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Servicios y Especialidades</CardTitle>
        <CardDescription>
          Define los servicios ofrecidos y las especialidades médicas disponibles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Sección de Servicios */}
        <section>
          <h3 className="text-xl font-semibold mb-3">Servicios</h3>
          <div className="space-y-4 mb-4">
            {services.map((service) => (
              <div key={service.id} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Duración: {service.duration} min - Precio: ${service.price}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <Switch checked={service.isActive} onCheckedChange={() => { /* Lógica de cambio */ }} />
                  <Button variant="outline" size="sm">Editar</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-4">
            <h4 className="text-md font-semibold mb-2">Agregar Nuevo Servicio</h4>
            {/* Formulario para agregar servicio */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Nombre del servicio" />
              <Input type="number" placeholder="Duración (min)" />
              <Input type="number" placeholder="Precio ($" />
            </div>
            <Button className="mt-3">Agregar Servicio</Button>
          </div>
        </section>

        {/* Sección de Especialidades */}
        <section>
          <h3 className="text-xl font-semibold mb-3">Especialidades</h3>
          <div className="space-y-4 mb-4">
            {specialties.map((specialty) => (
              <div key={specialty.id} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <p className="font-medium">{specialty.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {specialty.services.map(serviceId => {
                      const service = services.find(s => s.id === serviceId);
                      return service ? <Badge key={serviceId} variant="secondary">{service.name}</Badge> : null;
                    })}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Switch checked={specialty.isActive} onCheckedChange={() => { /* Lógica de cambio */ }} />
                  <Button variant="outline" size="sm">Editar</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-4">
            <h4 className="text-md font-semibold mb-2">Agregar Nueva Especialidad</h4>
            {/* Formulario para agregar especialidad */}
            <Input placeholder="Nombre de la especialidad" className="mb-2"/>
            {/* Aquí iría un selector múltiple para servicios */}
            <Button className="mt-3">Agregar Especialidad</Button>
          </div>
        </section>
      </CardContent>
      <CardFooter>
        <Button>Guardar Cambios Generales</Button>
      </CardFooter>
    </Card>
  );
}