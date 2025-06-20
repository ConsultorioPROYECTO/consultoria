'use client'

import { useAuth } from "../../context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { AppSidebar } from "@/app/dashboard/com/app-sidebar"
import { OrganizationStats } from "../com/OrganizationStats"
import { PatientsTable } from "../com/PatientsTable"
import { MedicalServicesCard } from "../com/MedicalServicesCard"
import { DoctorServicesMatrix } from "../com/DoctorServicesMatrix"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@rutas/components/ui/breadcrumb"
import { Separator } from "@rutas/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
} from "@rutas/components/ui/sidebar"
import { NavigationProvider } from "@/app/context/NavigationContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rutas/components/ui/tabs"

export interface FetchRolUser {
  role: string;
}

export default function APIDemoPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [, setRolUser] = useState<FetchRolUser>({ role: "" })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchRolUser = async () => {
      if (user) {
        try {
          const idToken = await user.getIdToken()
          const response = await fetch('/api/users/rol', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            const data = await response.json()
            setRolUser({ role: data.role })
          } else {
            console.error('Error al obtener el rol del usuario')
          }
        } catch (error) {
          console.error('Error en la solicitud:', error)
        }
      }
    }

    fetchRolUser()
  }, [user])

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!user) {
    return null
  }

  return (
    <NavigationProvider>
      <SidebarProvider>
        <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Demo APIs</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="aspect-video rounded-xl bg-muted/50" />
            <div className="aspect-video rounded-xl bg-muted/50" />
            <div className="aspect-video rounded-xl bg-muted/50" />
          </div>
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
            <div className="p-6 space-y-6">
              {/* Título de la página */}
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Demostración de APIs</h1>
                <p className="text-muted-foreground">
                  Visualización de las nuevas APIs implementadas: Pacientes, Servicios Médicos y Relaciones Doctor-Servicio
                </p>
              </div>

              <Separator />

              {/* Estadísticas generales */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Estadísticas de la Organización</h2>
                <OrganizationStats />
              </div>

              <Separator />

              {/* Componentes en pestañas */}
              <Tabs defaultValue="patients" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="patients">Pacientes</TabsTrigger>
                  <TabsTrigger value="services">Servicios Médicos</TabsTrigger>
                  <TabsTrigger value="relations">Asignaciones Doctor-Servicio</TabsTrigger>
                </TabsList>
                
                <TabsContent value="patients" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Gestión de Pacientes</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Lista completa de pacientes registrados en la organización con funciones de búsqueda y filtrado.
                    </p>
                    <PatientsTable />
                  </div>
                </TabsContent>
                
                <TabsContent value="services" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Servicios Médicos</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Catálogo de servicios médicos disponibles con información de precios, duración y doctores asignados.
                    </p>
                    <MedicalServicesCard />
                  </div>
                </TabsContent>
                
                <TabsContent value="relations" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Asignaciones Doctor-Servicio</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Matriz de relaciones entre doctores y servicios médicos, mostrando disponibilidad y precios personalizados.
                    </p>
                    <DoctorServicesMatrix />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Información adicional */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Funcionalidades Implementadas</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>API de Pacientes</strong>: CRUD completo con validación de identificación</li>
                  <li>• <strong>API de Servicios Médicos</strong>: Gestión de catálogo con categorías y precios</li>
                  <li>• <strong>API de Relaciones Doctor-Servicio</strong>: Asignación y gestión de servicios por doctor</li>
                  <li>• <strong>Autenticación</strong>: Token-based con validación de roles y organización</li>
                  <li>• <strong>Filtros y búsqueda</strong>: Funcionalidad completa en todas las tablas</li>
                  <li>• <strong>Estados de carga</strong>: Skeleton loading y manejo de errores</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </NavigationProvider>
  )
}