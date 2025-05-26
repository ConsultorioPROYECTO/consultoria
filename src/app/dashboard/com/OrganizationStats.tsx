"use client"

import * as React from "react"
import { Users, Stethoscope, UserCheck, Calendar, TrendingUp, Activity } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card"
import { Badge } from "@rutas/components/ui/badge"
import { usePatients } from "@/hooks/usePatients"
import { useMedicalServices } from "@/hooks/useMedicalServices"
import { useDoctorServices } from "@/hooks/useDoctorServices"
import { useDoctorsWithAppointments } from "@/hooks/useDoctorsWithAppointments"

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

function StatCard({ title, value, description, icon, trend, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className="flex items-center pt-1">
            <TrendingUp className={`h-3 w-3 mr-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`} />
            <span className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OrganizationStats() {
  const { patients, loading: patientsLoading, error: patientsError } = usePatients();
  const { services, loading: servicesLoading, error: servicesError } = useMedicalServices();
  const { doctorServices, total: totalRelations, loading: relationsLoading, error: relationsError } = useDoctorServices();
  const { doctors, loading: doctorsLoading, error: doctorsError } = useDoctorsWithAppointments();

  const isLoading = patientsLoading || servicesLoading || relationsLoading || doctorsLoading;
  const hasError = patientsError || servicesError || relationsError || doctorsError;

  // Calcular estadísticas
  const stats = React.useMemo(() => {
    if (isLoading) return null;

    // Estadísticas de pacientes
    const totalPatients = patients.length;
    const activePatients = patients.filter(p => p.isActive).length;
    const malePatients = patients.filter(p => p.gender === 'M').length;
    const femalePatients = patients.filter(p => p.gender === 'F').length;

    // Estadísticas de servicios
    const totalServices = services.length;
    const activeServices = services.filter(s => s.isActive).length;
    const serviceCategories = [...new Set(services.map(s => s.category))].length;

    // Estadísticas de doctores
    const totalDoctors = doctors.length;
    const specialties = [...new Set(doctors.map(d => d.speciality))].length;

    // Estadísticas de citas
    const allAppointments = doctors.flatMap(d => d.appointments || []);
    const totalAppointments = allAppointments.length;
    const completedAppointments = allAppointments.filter(a => a.status === 'Completada').length;
    const pendingAppointments = allAppointments.filter(a => a.status === 'Pendiente').length;
    const confirmedAppointments = allAppointments.filter(a => a.status === 'Confirmada').length;

    // Estadísticas de relaciones doctor-servicio
    const availableRelations = doctorServices.filter(ds => ds.isAvailable).length;

    // Calcular precio promedio de servicios
    const avgServicePrice = services.length > 0 
      ? services.reduce((sum, s) => sum + parseFloat(s.basePrice), 0) / services.length 
      : 0;

    return {
      patients: {
        total: totalPatients,
        active: activePatients,
        male: malePatients,
        female: femalePatients,
      },
      services: {
        total: totalServices,
        active: activeServices,
        categories: serviceCategories,
        avgPrice: avgServicePrice,
      },
      doctors: {
        total: totalDoctors,
        specialties: specialties,
      },
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        pending: pendingAppointments,
        confirmed: confirmedAppointments,
      },
      relations: {
        total: totalRelations,
        available: availableRelations,
      },
    };
  }, [patients, services, doctors, doctorServices, totalRelations, isLoading]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-3 w-full bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (hasError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-red-600">
            Error al cargar estadísticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {patientsError || servicesError || relationsError || doctorsError}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-4">
      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Pacientes"
          value={stats.patients.total}
          description={`${stats.patients.active} activos`}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        
        <StatCard
          title="Servicios Médicos"
          value={stats.services.total}
          description={`${stats.services.categories} categorías`}
          icon={<Stethoscope className="h-4 w-4 text-muted-foreground" />}
        />
        
        <StatCard
          title="Doctores Activos"
          value={stats.doctors.total}
          description={`${stats.doctors.specialties} especialidades`}
          icon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
        />
        
        <StatCard
          title="Total Citas"
          value={stats.appointments.total}
          description={`${stats.appointments.completed} completadas`}
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Estadísticas detalladas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Distribución de Pacientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Masculino</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  {stats.patients.male}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Femenino</span>
                <Badge variant="outline" className="bg-pink-100 text-pink-800">
                  {stats.patients.female}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Otros</span>
                <Badge variant="outline" className="bg-gray-100 text-gray-800">
                  {stats.patients.total - stats.patients.male - stats.patients.female}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Estado de Citas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Completadas</span>
                <Badge className="bg-green-100 text-green-800">
                  {stats.appointments.completed}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Confirmadas</span>
                <Badge className="bg-blue-100 text-blue-800">
                  {stats.appointments.confirmed}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Pendientes</span>
                <Badge className="bg-yellow-100 text-yellow-800">
                  {stats.appointments.pending}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Servicios & Precios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Servicios activos</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  {stats.services.active}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Precio promedio</span>
                <span className="text-sm font-medium">
                  {formatPrice(stats.services.avgPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Asignaciones</span>
                <Badge variant="outline" className="bg-purple-100 text-purple-800">
                  {stats.relations.available}/{stats.relations.total}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicadores de actividad */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Resumen de Actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {stats.appointments.completed > 0 
                  ? ((stats.appointments.completed / stats.appointments.total) * 100).toFixed(1)
                  : 0}%
              </div>
              <div className="text-xs text-muted-foreground">Tasa de completitud</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {stats.doctors.total > 0 
                  ? (stats.relations.available / stats.doctors.total).toFixed(1)
                  : 0}
              </div>
              <div className="text-xs text-muted-foreground">Servicios por doctor</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {stats.patients.total > 0 
                  ? (stats.appointments.total / stats.patients.total).toFixed(1)
                  : 0}
              </div>
              <div className="text-xs text-muted-foreground">Citas por paciente</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {stats.services.total > 0 
                  ? ((stats.relations.available / (stats.doctors.total * stats.services.total)) * 100).toFixed(1)
                  : 0}%
              </div>
              <div className="text-xs text-muted-foreground">Cobertura servicios</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}