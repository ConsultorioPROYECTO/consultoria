"use client"

import * as React from "react"
import { Users, Stethoscope, CheckCircle, XCircle, DollarSign } from "lucide-react"

import { Badge } from "@rutas/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rutas/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rutas/components/ui/table"
import { useDoctorServices } from "@/hooks/useDoctorServices"

export function DoctorServicesMatrix() {
  const { doctorServices, total, loading, error } = useDoctorServices();
  const [doctorFilter, setDoctorFilter] = React.useState<string>("all");
  const [serviceFilter, setServiceFilter] = React.useState<string>("all");

  // Obtener doctores y servicios únicos
  const { doctors, services } = React.useMemo(() => {
    const doctorMap = new Map();
    const serviceMap = new Map();

    doctorServices.forEach((ds) => {
      if (!doctorMap.has(ds.doctor.idDoctor)) {
        doctorMap.set(ds.doctor.idDoctor, {
          id: ds.doctor.idDoctor,
          name: ds.doctor.user.displayName,
          specialty: ds.doctor.speciality,
        });
      }
      if (!serviceMap.has(ds.service.id)) {
        serviceMap.set(ds.service.id, {
          id: ds.service.id,
          name: ds.service.name,
          code: ds.service.code,
          category: ds.service.category,
          basePrice: ds.service.basePrice,
        });
      }
    });

    return {
      doctors: Array.from(doctorMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      services: Array.from(serviceMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [doctorServices]);

  // Filtrar relaciones
  const filteredRelations = React.useMemo(() => {
    let filtered = doctorServices;

    if (doctorFilter !== "all") {
      filtered = filtered.filter(ds => ds.doctor.idDoctor.toString() === doctorFilter);
    }

    if (serviceFilter !== "all") {
      filtered = filtered.filter(ds => ds.service.id.toString() === serviceFilter);
    }

    return filtered;
  }, [doctorServices, doctorFilter, serviceFilter]);

  // Crear matriz de relaciones (para uso futuro)
  // const relationMatrix = React.useMemo(() => {
  //   const matrix = new Map<string, DoctorService>();
  //   
  //   filteredRelations.forEach((ds) => {
  //     const key = `${ds.doctor.idDoctor}-${ds.service.id}`;
  //     matrix.set(key, ds);
  //   });

  //   return matrix;
  // }, [filteredRelations]);

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(numPrice);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Servicios por Doctor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
            <Users className="h-4 w-4" />
            Servicios por Doctor
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
          <Users className="h-4 w-4" />
          Servicios por Doctor ({total} relaciones)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={doctorFilter} onValueChange={setDoctorFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por doctor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los doctores</SelectItem>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id.toString()}>
                    {doctor.name} ({doctor.specialty})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por servicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los servicios</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id.toString()}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vista de lista cuando hay filtros activos */}
          {(doctorFilter !== "all" || serviceFilter !== "all") && (
            <div className="space-y-2">
              {filteredRelations.length > 0 ? (
                filteredRelations.map((relation) => (
                  <Card key={`${relation.doctor.idDoctor}-${relation.service.id}`} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            {relation.doctor.user.displayName}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {relation.doctor.speciality}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{relation.service.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {relation.service.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-1">
                          {relation.isAvailable ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-xs">
                            {relation.isAvailable ? "Disponible" : "No disponible"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-medium">
                            {formatPrice(relation.customPrice || relation.service.basePrice)}
                          </span>
                          {relation.customPrice && (
                            <Badge variant="outline" className="text-xs ml-1">
                              Personalizado
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No se encontraron relaciones con los filtros aplicados
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Vista de matriz cuando no hay filtros */}
          {doctorFilter === "all" && serviceFilter === "all" && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Doctor</TableHead>
                    <TableHead>Servicios Asignados</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors.map((doctor) => {
                    const doctorRelations = doctorServices.filter(
                      ds => ds.doctor.idDoctor === doctor.id
                    );
                    
                    return (
                      <TableRow key={doctor.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{doctor.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {doctor.specialty}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {doctorRelations.slice(0, 3).map((relation) => (
                              <Badge
                                key={relation.service.id}
                                variant="outline"
                                className={
                                  relation.isAvailable
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }
                              >
                                {relation.service.code}
                                {relation.customPrice && (
                                  <DollarSign className="h-3 w-3 ml-1" />
                                )}
                              </Badge>
                            ))}
                            {doctorRelations.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{doctorRelations.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            {doctorRelations.length}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Estadísticas resumidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{doctors.length}</div>
              <div className="text-xs text-muted-foreground">Doctores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{services.length}</div>
              <div className="text-xs text-muted-foreground">Servicios</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{total}</div>
              <div className="text-xs text-muted-foreground">Relaciones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {doctorServices.filter(ds => ds.isAvailable).length}
              </div>
              <div className="text-xs text-muted-foreground">Disponibles</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}