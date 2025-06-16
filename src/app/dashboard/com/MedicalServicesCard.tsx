'use client'

import * as React from "react"
import { Clock, DollarSign, Stethoscope, Filter, Search } from "lucide-react"

import { Badge } from "@rutas/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card"
import { Input } from "@rutas/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rutas/components/ui/select"
import { useMedicalServices, type MedicalService } from "@/hooks/useMedicalServices"

interface ServiceCardProps {
  service: MedicalService;
}

function ServiceCard({ service }: ServiceCardProps) {
  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(numPrice);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">{service.name}</CardTitle>
          <div className="text-xs text-muted-foreground">
            Código: {service.code}
          </div>
        </div>
        <Badge 
          variant="outline"
          className="bg-blue-100 text-blue-800"
        >
          {service.category}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Descripción */}
          {service.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {service.description}
            </p>
          )}

          {/* Información básica */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium">
                {formatPrice(service.basePrice)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {formatDuration(service.durationMinutes)}
              </span>
            </div>
          </div>

          {/* Preparación requerida */}
          {service.requiresPreparation && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Requiere preparación
              </Badge>
            </div>
          )}

          {/* Doctores asignados */}
          {service.doctorServices && service.doctorServices.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Doctores disponibles:
              </div>
              <div className="space-y-1">
                {service.doctorServices.slice(0, 2).map((ds) => (
                  <div key={ds.doctorId} className="flex items-center justify-between">
                    <div className="text-xs">
                      <span className="font-medium">{ds.doctor.user.displayName}</span>
                      <span className="text-muted-foreground ml-1">({ds.doctor.speciality})</span>
                    </div>
                    {ds.customPrice && (
                      <span className="text-xs font-medium text-green-600">
                        {formatPrice(ds.customPrice)}
                      </span>
                    )}
                  </div>
                ))}
                {service.doctorServices.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{service.doctorServices.length - 2} más
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Citas recientes */}
          {service.appointments && service.appointments.length > 0 && (
            <div className="pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Últimas citas:
              </div>
              <div className="space-y-1">
                {service.appointments.slice(0, 2).map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between">
                    <span className="text-xs">
                      {appointment.patient.firstName} {appointment.patient.lastName}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        appointment.status === 'Completada' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'Confirmada' ? 'bg-blue-100 text-blue-800' :
                        appointment.status === 'Llegó' ? 'bg-purple-100 text-purple-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MedicalServicesCard() {
  const { services, loading, error } = useMedicalServices();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<string>("name");

  // Obtener categorías únicas
  const categories = React.useMemo(() => {
    const uniqueCategories = [...new Set(services.map(service => service.category))];
    return uniqueCategories.sort();
  }, [services]);

  // Filtrar y ordenar servicios
  const filteredAndSortedServices = React.useMemo(() => {
    let filtered = services;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por categoría
    if (categoryFilter !== "all") {
      filtered = filtered.filter(service => service.category === categoryFilter);
    }

    // Ordenar
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price":
          return parseFloat(a.basePrice) - parseFloat(b.basePrice);
        case "duration":
          return a.durationMinutes - b.durationMinutes;
        case "category":
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });
  }, [services, searchTerm, categoryFilter, sortBy]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Servicios Médicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Servicios Médicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Stethoscope className="h-4 w-4" />
          Servicios Médicos ({filteredAndSortedServices.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar servicios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nombre</SelectItem>
                <SelectItem value="price">Precio</SelectItem>
                <SelectItem value="duration">Duración</SelectItem>
                <SelectItem value="category">Categoría</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grid de servicios */}
          {filteredAndSortedServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Stethoscope className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No se encontraron servicios médicos
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}