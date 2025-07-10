'use client';

import { Button } from "@rutas/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@rutas/components/ui/card";
import { Input } from "@rutas/components/ui/input";
import { Switch } from "@rutas/components/ui/switch";
import { Badge } from "@rutas/components/ui/badge";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@rutas/components/ui/dialog";
import { Label } from "@rutas/components/ui/label";
import { toast } from "sonner";
import { Skeleton } from "@rutas/components/ui/skeleton";

// Tipos basados en la API
interface MedicalService {
  id: number;
  name: string;
  description: string | null;
  code: string;
  durationMinutes: number;
  basePrice: string;
  category: string;
  isActive: boolean;
  organizationId: number;
}

type ServiceFormData = Partial<Omit<MedicalService, 'organizationId'>>;

interface Specialty {
  name: string;
  services: MedicalService[];
}

export function ServiceSpecialtyConfig() {
  const { user, loading: authLoading } = useAuth();
  const [services, setServices] = useState<MedicalService[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<MedicalService | null>(null);

  const fetchServices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/medical-services?active=false', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch services');
      const data = await response.json();
      setServices(data.data.services || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      toast.error("Error al cargar los servicios.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchServices();
    }
  }, [authLoading, user, fetchServices]);

  useEffect(() => {
    const groupedBySpecialty = services.reduce((acc, service) => {
      const specialtyName = service.category;
      if (!acc[specialtyName]) {
        acc[specialtyName] = [];
      }
      acc[specialtyName].push(service);
      return acc;
    }, {} as Record<string, MedicalService[]>);

    const specialtiesArray = Object.entries(groupedBySpecialty).map(([name, services]) => ({
      name,
      services,
    }));
    setSpecialties(specialtiesArray);
  }, [services]);

  const handleToggleService = async (service: MedicalService) => {
    if (!user) return;

    const isActivating = !service.isActive;
    const method = isActivating ? 'PUT' : 'DELETE';
    const headers: HeadersInit = {
      'Authorization': `Bearer ${await user.getIdToken()}`,
    };
    let body: string | undefined = undefined;

    if (isActivating) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ isActive: true });
    }

    try {
      const response = await fetch(`/api/medical-services/${service.id}`, {
        method,
        headers,
        body,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || `Failed to ${isActivating ? 'activate' : 'deactivate'} service`);
      }
      
      const updatedService = { ...service, isActive: isActivating };
      setServices(prev => prev.map(s => s.id === service.id ? updatedService : s));
      toast.success(`Servicio "${service.name}" ${isActivating ? 'activado' : 'desactivado'}.`);

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ocurrió un error desconocido");
    }
  };

  const handleSaveService = async (serviceData: ServiceFormData) => {
    if (!user) return;
    
    const isEditing = !!serviceData.id;
    const url = isEditing ? `/api/medical-services/${serviceData.id}` : '/api/medical-services';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const token = await user.getIdToken();
      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error al ${isEditing ? 'actualizar' : 'crear'} el servicio`);
      }
      
      toast.success(`Servicio "${serviceData.name}" ${isEditing ? 'actualizado' : 'creado'} exitosamente.`);
      setIsModalOpen(false);
      setEditingService(null);
      fetchServices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ocurrió un error desconocido");
    }
  };
  
  const openEditModal = (service: MedicalService) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  if (loading || authLoading) return <ServiceSpecialtySkeleton />;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Servicios y Categorías (Especialidades)</CardTitle>
            <CardDescription>
              Define los servicios ofrecidos y agrúpalos por categorías.
            </CardDescription>
          </div>
          <Button onClick={openCreateModal}>Agregar Nuevo Servicio</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 h-[600px] overflow-y-auto">
        {specialties.map((specialty) => (
          <section key={specialty.name}>
            <h3 className="text-xl font-semibold mb-3 capitalize">{specialty.name}</h3>
            <div className="space-y-4">
              {specialty.services.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">{service.name} <Badge variant="outline">{service.code}</Badge></p>
                    <p className="text-sm text-muted-foreground">
                      Duración: {service.durationMinutes} min - Precio: ${service.basePrice}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Switch checked={service.isActive} onCheckedChange={() => handleToggleService(service)} />
                    <Button variant="outline" size="sm" onClick={() => openEditModal(service)}>Editar</Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </CardContent>
      <ServiceFormModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSave={handleSaveService}
        service={editingService}
      />
    </Card>
  );
}

interface ServiceFormModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: ServiceFormData) => void;
  service: MedicalService | null;
}

function ServiceFormModal({ isOpen, onOpenChange, onSave, service }: ServiceFormModalProps) {
  const [formData, setFormData] = useState<ServiceFormData>({});

  useEffect(() => {
    if (service) {
      setFormData({ ...service });
    } else {
      setFormData({
        name: '',
        description: '',
        code: '',
        durationMinutes: 30,
        basePrice: '0',
        category: '',
        isActive: true,
      });
    }
  }, [service, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? 'Editar Servicio' : 'Crear Nuevo Servicio'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="code">Código</Label>
              <Input id="code" name="code" value={formData.code || ''} onChange={handleChange} required />
            </div>
          </div>
          <div>
            <Label htmlFor="category">Categoría (Especialidad)</Label>
            <Input id="category" name="category" value={formData.category || ''} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" name="description" value={formData.description || ''} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="durationMinutes">Duración (min)</Label>
              <Input id="durationMinutes" name="durationMinutes" type="number" value={formData.durationMinutes || ''} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="basePrice">Precio ($)</Label>
              <Input id="basePrice" name="basePrice" type="number" step="0.01" value={formData.basePrice || ''} onChange={handleChange} required />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="isActive" name="isActive" checked={formData.isActive || false} onCheckedChange={(checked) => setFormData((p) => ({...p, isActive: checked}))} />
            <Label htmlFor="isActive">Activo</Label>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ServiceSpecialtySkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
      </CardHeader>
      <CardContent className="space-y-8 h-[600px] overflow-y-auto">
        {[...Array(3)].map((_, i) => (
          <section key={i}>
            <Skeleton className="h-7 w-1/4 mb-3" />
            <div className="space-y-4">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="w-full">
                    <Skeleton className="h-6 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
