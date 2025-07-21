'use client';

import { Button } from "@rutas/components/ui/button";
import { Input } from "@rutas/components/ui/input";
import { Switch } from "@rutas/components/ui/switch";
import { Badge } from "@rutas/components/ui/badge";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useMedicalServicesData } from "@/app/context/DashboardDataContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@rutas/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@rutas/components/ui/drawer";
import { Label } from "@rutas/components/ui/label";
import { toast } from "sonner";
import { Skeleton } from "@rutas/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rutas/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

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

interface ServiceSpecialtyConfigProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ServiceSpecialtyConfig({ isOpen, onOpenChange }: ServiceSpecialtyConfigProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { medicalServices, loading, error, refetch } = useMedicalServicesData();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [activeTab, setActiveTab] = useState('services');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<MedicalService | null>(null);

  useEffect(() => {
    const groupedBySpecialty = medicalServices.reduce((acc, service) => {
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
  }, [medicalServices]);

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
      
      // Refrescar los datos usando el hook centralizado
      await refetch();
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
      await refetch();
      
      // Si se creó un nuevo servicio, cambiar al tab de servicios para mostrar el resultado
      if (!isEditing) {
        setActiveTab('services');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ocurrió un error desconocido");
    }
  };
  
  const openEditModal = (service: MedicalService) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const ContentComponent = () => (
    <>
      {isMobile ? (
        <DrawerHeader className="text-left">
          <DrawerTitle>Configuración de Servicios y Especialidades</DrawerTitle>
          <div className="text-sm text-muted-foreground">
            Define los servicios ofrecidos y agrúpalos por categorías.
          </div>
        </DrawerHeader>
      ) : (
        <DialogHeader>
          <DialogTitle>Configuración de Servicios y Especialidades</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Define los servicios ofrecidos y agrúpalos por categorías.
          </div>
        </DialogHeader>
      )}
      
      {loading ? (
        <ServiceSpecialtySkeleton />
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="services">Ver Servicios</TabsTrigger>
            <TabsTrigger value="create">Crear Servicio</TabsTrigger>
          </TabsList>
          
          <TabsContent value="services" className="mt-6">
            <div className={`grid gap-8 ${isMobile ? 'max-h-[50vh]' : 'max-h-[60vh]'} overflow-y-auto pr-2`}>
              {specialties.map((specialty) => (
                <section key={specialty.name} className="grid gap-4">
                  <h3 className="text-xl font-semibold capitalize">{specialty.name}</h3>
                  <div className="grid gap-4">
                    {specialty.services.map((service) => (
                      <div key={service.id} className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-[1fr_auto]'} items-center gap-4 p-3 border rounded-md`}>
                        <div className="grid gap-1">
                          <p className="font-medium flex items-center gap-2">
                            {service.name} 
                            <Badge variant="outline">{service.code}</Badge>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Duración: {service.durationMinutes} min - Precio: ${service.basePrice}
                          </p>
                        </div>
                        <div className={`flex items-center gap-3 ${isMobile ? 'justify-between' : ''}`}>
                          <Switch checked={service.isActive} onCheckedChange={() => handleToggleService(service)} />
                          <Button variant="outline" size="sm" onClick={() => openEditModal(service)}>Editar</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="create" className="mt-6">
             <ServiceCreateForm onSave={handleSaveService} isMobile={isMobile} />
           </TabsContent>
        </Tabs>
      )}
      
      <ServiceFormModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSave={handleSaveService}
        service={editingService}
        isMobile={isMobile}
      />
    </>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[90vh] overflow-hidden">
            <div className="pb-4 px-4">
              <ContentComponent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
            <ContentComponent />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

interface ServiceFormModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: ServiceFormData) => void;
  service: MedicalService | null;
  isMobile?: boolean;
}

interface ServiceCreateFormProps {
  onSave: (data: ServiceFormData) => void;
  isMobile?: boolean;
}

function ServiceCreateForm({ onSave, isMobile = false }: ServiceCreateFormProps) {
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    code: '',
    durationMinutes: 30,
    basePrice: '0',
    category: '',
    isActive: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    // Reset form after submission
    setFormData({
      name: '',
      description: '',
      code: '',
      durationMinutes: 30,
      basePrice: '0',
      category: '',
      isActive: true,
    });
  };

  return (
    <div className={`${isMobile ? 'max-h-[50vh]' : 'max-h-[60vh]'} overflow-y-auto pr-2`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 font-medium`}>
          <div className="grid gap-2">
            <Label htmlFor="create-name" className="text-base font-medium">Nombre</Label>
            <Input id="create-name" name="name" value={formData.name || ''} onChange={handleChange} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-code" className="text-base font-medium">Código</Label>
            <Input id="create-code" name="code" value={formData.code || ''} onChange={handleChange} required />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="create-category" className="text-base font-medium">Categoría (Especialidad)</Label>
          <Input id="create-category" name="category" value={formData.category || ''} onChange={handleChange} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="create-description" className="text-base font-medium">Descripción</Label>
          <Input id="create-description" name="description" value={formData.description || ''} onChange={handleChange} />
        </div>
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
          <div className="grid gap-2">
            <Label htmlFor="create-durationMinutes" className="text-base font-medium">Duración (min)</Label>
            <Input id="create-durationMinutes" name="durationMinutes" type="number" value={formData.durationMinutes || ''} onChange={handleChange} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-basePrice" className="text-base font-medium">Precio ($)</Label>
            <Input id="create-basePrice" name="basePrice" type="number" step="0.01" value={formData.basePrice || ''} onChange={handleChange} required />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="create-isActive" name="isActive" checked={formData.isActive || false} onCheckedChange={(checked) => setFormData((p) => ({...p, isActive: checked}))} />
          <Label htmlFor="create-isActive" className="text-base font-medium">Activo</Label>
        </div>
        <div className="flex justify-end pt-4">
          <Button type="submit" className={`${isMobile ? 'w-full' : 'w-full sm:w-auto'}`}>Crear Servicio</Button>
        </div>
      </form>
    </div>
  );
}

function ServiceFormModal({ isOpen, onOpenChange, onSave, service, isMobile = false }: ServiceFormModalProps) {
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
    <>
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[90vh] overflow-hidden">
            <DrawerHeader>
              <DrawerTitle>{service ? 'Editar Servicio' : 'Crear Nuevo Servicio'}</DrawerTitle>
            </DrawerHeader>
            <form onSubmit={handleSubmit} className="space-y-4 p-4">
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                <div>
                  <Label htmlFor="name" className="text-base font-medium">Nombre</Label>
                  <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="code" className="text-base font-medium">Código</Label>
                  <Input id="code" name="code" value={formData.code || ''} onChange={handleChange} required />
                </div>
              </div>
              <div>
                <Label htmlFor="category" className="text-base font-medium">Categoría (Especialidad)</Label>
                <Input id="category" name="category" value={formData.category || ''} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="description" className="text-base font-medium">Descripción</Label>
                <Input id="description" name="description" value={formData.description || ''} onChange={handleChange} />
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                <div>
                  <Label htmlFor="durationMinutes" className="text-base font-medium">Duración (min)</Label>
                  <Input id="durationMinutes" name="durationMinutes" type="number" value={formData.durationMinutes || ''} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="basePrice" className="text-base font-medium">Precio ($)</Label>
                  <Input id="basePrice" name="basePrice" type="number" step="0.01" value={formData.basePrice || ''} onChange={handleChange} required />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="isActive" name="isActive" checked={formData.isActive || false} onCheckedChange={(checked) => setFormData((p) => ({...p, isActive: checked}))} />
                <Label htmlFor="isActive" className="text-base font-medium">Activo</Label>
              </div>
              <DrawerFooter className="flex flex-row gap-2 pt-4">
                <DrawerClose asChild>
                  <Button type="button" variant="outline" className="flex-1">Cancelar</Button>
                </DrawerClose>
                <Button type="submit" className="flex-1">Guardar</Button>
              </DrawerFooter>
            </form>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{service ? 'Editar Servicio' : 'Crear Nuevo Servicio'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 p-4">
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                <div>
                  <Label htmlFor="name" className="text-base font-medium">Nombre</Label>
                  <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="code" className="text-base font-medium">Código</Label>
                  <Input id="code" name="code" value={formData.code || ''} onChange={handleChange} required />
                </div>
              </div>
              <div>
                <Label htmlFor="category" className="text-base font-medium">Categoría (Especialidad)</Label>
                <Input id="category" name="category" value={formData.category || ''} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="description" className="text-base font-medium">Descripción</Label>
                <Input id="description" name="description" value={formData.description || ''} onChange={handleChange} />
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                <div>
                  <Label htmlFor="durationMinutes" className="text-base font-medium">Duración (min)</Label>
                  <Input id="durationMinutes" name="durationMinutes" type="number" value={formData.durationMinutes || ''} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="basePrice" className="text-base font-medium">Precio ($)</Label>
                  <Input id="basePrice" name="basePrice" type="number" step="0.01" value={formData.basePrice || ''} onChange={handleChange} required />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="isActive" name="isActive" checked={formData.isActive || false} onCheckedChange={(checked) => setFormData((p) => ({...p, isActive: checked}))} />
                <Label htmlFor="isActive" className="text-base font-medium">Activo</Label>
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
      )}
    </>
  );
}

function ServiceSpecialtySkeleton() {
  return (
    <div className="w-full">
      <div className="grid w-full grid-cols-2 mb-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2">
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
      </div>
    </div>
  );
}
