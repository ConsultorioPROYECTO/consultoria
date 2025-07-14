'use client'

import { useAuth } from "../../context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Calendar, CalendarCheck, Clock, Settings, RefreshCw } from "lucide-react"

import { AppSidebar } from "@/app/dashboard/com/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@rutas/components/ui/breadcrumb"
import { Button } from "@rutas/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@rutas/components/ui/card"
import { Input } from "@rutas/components/ui/input"
import { Label } from "@rutas/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rutas/components/ui/select"
import { Switch } from "@rutas/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rutas/components/ui/tabs"
import { Badge } from "@rutas/components/ui/badge"
import { Alert, AlertDescription } from "@rutas/components/ui/alert"
import {
  SidebarInset,
  SidebarProvider,
} from "@rutas/components/ui/sidebar"
import { NavigationProvider } from "@/app/context/NavigationContext"

// Tipos TypeScript para las APIs
/**
 * @fileoverview Página de demostración del calendario para doctores.
 * 
 * Este componente proporciona una interfaz interactiva para demostrar las funcionalidades
 * de gestión de calendarios de doctores, incluyendo configuración, sincronización con Google Calendar,
 * gestión de horarios de trabajo y verificación de disponibilidad.
 * 
 * **Características clave:**
 * - Autenticación y redirección a login
 * - Tabs para diferentes secciones: Configuración, Horarios, Eventos, Disponibilidad
 * - Integración con APIs para fetch y update de datos
 * - Manejo de estados con React hooks
 * - UI moderna con componentes de shadcn/ui
 * 
 * **Dependencias principales:**
 * - AuthContext para autenticación
 * - Next.js navigation
 * - Lucide-react icons
 * - shadcn/ui components
 * 
 * **Mejoras recientes:**
 * - Añadida verificación de disponibilidad con ignoreEventId
 * - Mejora en el manejo de errores y loading states
 * - Optimización de llamadas API
 * 
 * @author Brayan - Frontend Developer
 * @version 1.2.0
 * @since 2025-07-10
 */


/**
 * Configuración del calendario para un doctor.
 * 
 * @interface DoctorCalendarSettings
 * @property {string} [calendarId] - ID del calendario de Google
 * @property {string} [calendarName] - Nombre del calendario
 * @property {string} [timezone] - Zona horaria
 * @property {string} [color] - Color del calendario
 * @property {boolean} [syncEnabled] - Habilitar sincronización
 */
interface DoctorCalendarSettings {
  calendarId?: string
  calendarName?: string
  timezone?: string
  color?: string
  syncEnabled?: boolean
}

interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime: string }
  end: { dateTime: string }
  status: string
}

interface AvailabilityCheck {
  isAvailable: boolean
  conflictingEvents?: CalendarEvent[]
}

interface WorkingHours {
  [key: string]: {
    enabled: boolean
    start: string
    end: string
  }
}

interface CalendarInfo {
  id: string
  summary: string
  description?: string
  timeZone: string
  accessRole: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Componente principal de la página de demo del calendario del doctor.
 * 
 * Maneja la autenticación, estados y renderizado de la interfaz de demostración.
 * 
 * @returns {React.ReactElement} La página renderizada
 */
export default function DoctorCalendarDemoPage(): React.ReactElement {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  // Estados para la demostración
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('1')
  const [calendarSettings, setCalendarSettings] = useState<DoctorCalendarSettings | null>(null)
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [availability, setAvailability] = useState<AvailabilityCheck | null>(null)
  const [loading_api, setLoadingApi] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Estados para formularios
  const [newCalendarName, setNewCalendarName] = useState<string>('')
  const [selectedTimezone, setSelectedTimezone] = useState<string>('America/Bogota')
  const [selectedColor, setSelectedColor] = useState<string>('#4285f4')
  const [syncEnabled, setSyncEnabled] = useState<boolean>(true)
  const [checkStartDate, setCheckStartDate] = useState<string>('')
  const [checkEndDate, setCheckEndDate] = useState<string>('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Función helper para hacer llamadas a la API
  const apiCall = async <T,>(url: string, options?: RequestInit): Promise<ApiResponse<T>> => {
    try {
      setError(null)
      const idToken = await user?.getIdToken()
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error en la API')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Obtener configuración del calendario
  const fetchCalendarSettings = async (): Promise<void> => {
    setLoadingApi(true)
    const result = await apiCall<{ settings: DoctorCalendarSettings, calendarInfo: CalendarInfo }>(
      `/api/doctors/${selectedDoctorId}/calendar`
    )
    
    if (result.success && result.data) {
      setCalendarSettings(result.data.settings)
    }
    setLoadingApi(false)
  }

  // Obtener horarios de trabajo
  const fetchWorkingHours = async (): Promise<void> => {
    setLoadingApi(true)
    const result = await apiCall<{ workingHours: WorkingHours }>(
      `/api/doctors/${selectedDoctorId}/working-hours`
    )
    
    if (result.success && result.data) {
      setWorkingHours(result.data.workingHours)
    }
    setLoadingApi(false)
  }

  // Obtener eventos del calendario
  const fetchCalendarEvents = async (): Promise<void> => {
    setLoadingApi(true)
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const result = await apiCall<{ events: CalendarEvent[] }>(
      `/api/doctors/${selectedDoctorId}/calendar/events?startDate=${startDate}&endDate=${endDate}`
    )
    
    if (result.success && result.data) {
      setEvents(result.data.events)
    }
    setLoadingApi(false)
  }

  // Verificar disponibilidad
  const checkAvailability = async (): Promise<void> => {
    if (!checkStartDate || !checkEndDate) {
      setError('Por favor selecciona fechas de inicio y fin')
      return
    }

    setLoadingApi(true)
    const result = await apiCall<AvailabilityCheck>(
      `/api/doctors/${selectedDoctorId}/calendar/availability?startDateTime=${checkStartDate}&endDateTime=${checkEndDate}`
    )
    
    if (result.success && result.data) {
      setAvailability(result.data)
    }
    setLoadingApi(false)
  }

  // Crear calendario
  const createCalendar = async (): Promise<void> => {
    if (!newCalendarName.trim()) {
      setError('Por favor ingresa un nombre para el calendario')
      return
    }

    setLoadingApi(true)
    const result = await apiCall(
      `/api/doctors/${selectedDoctorId}/calendar`,
      {
        method: 'POST',
        body: JSON.stringify({
          calendarName: newCalendarName,
          timezone: selectedTimezone,
          color: selectedColor,
          syncEnabled,
        }),
      }
    )
    
    if (result.success) {
      setSuccess('Calendario creado exitosamente')
      setNewCalendarName('')
      await fetchCalendarSettings()
    }
    setLoadingApi(false)
  }

  // Sincronizar calendario
  const syncCalendar = async (): Promise<void> => {
    setLoadingApi(true)
    const result = await apiCall(
      `/api/doctors/${selectedDoctorId}/calendar/sync`,
      { method: 'POST' }
    )
    
    if (result.success) {
      setSuccess('Sincronización completada')
      await fetchCalendarEvents()
    }
    setLoadingApi(false)
  }

  // Alternar sincronización automática
  const toggleSync = async (enabled: boolean): Promise<void> => {
    setLoadingApi(true)
    const result = await apiCall(
      `/api/doctors/${selectedDoctorId}/calendar/toggle-sync`,
      {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      }
    )
    
    if (result.success) {
      setSuccess(`Sincronización ${enabled ? 'habilitada' : 'deshabilitada'}`)
      await fetchCalendarSettings()
    }
    setLoadingApi(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return <div>Loading...</div>
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
                  <BreadcrumbPage>Demo Calendario Doctores</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* Header con selección de doctor */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Demo APIs Calendario de Doctores</h1>
              <p className="text-muted-foreground mt-2">
                Demostración de integración con Google Calendar API, TypeScript, Shadcn UI y Tailwind CSS
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Label htmlFor="doctor-select">Doctor ID:</Label>
              <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Doctor 1</SelectItem>
                  <SelectItem value="2">Doctor 2</SelectItem>
                  <SelectItem value="3">Doctor 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Alertas */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Tabs principales */}
          <Tabs defaultValue="calendar" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Calendario
              </TabsTrigger>
              <TabsTrigger value="availability" className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" />
                Disponibilidad
              </TabsTrigger>
              <TabsTrigger value="working-hours" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horarios
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuración
              </TabsTrigger>
            </TabsList>

            {/* Tab Calendario */}
            <TabsContent value="calendar" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Configuración del Calendario
                    </CardTitle>
                    <CardDescription>
                      Información actual del calendario del doctor
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      onClick={fetchCalendarSettings} 
                      disabled={loading_api}
                      className="w-full"
                    >
                      {loading_api ? 'Cargando...' : 'Obtener Configuración'}
                    </Button>
                    
                    {calendarSettings && (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="font-medium">Nombre:</span>
                          <span>{calendarSettings.calendarName || 'No configurado'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Zona horaria:</span>
                          <span>{calendarSettings.timezone || 'No configurado'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Sincronización:</span>
                          <Badge variant={calendarSettings.syncEnabled ? 'default' : 'secondary'}>
                            {calendarSettings.syncEnabled ? 'Habilitada' : 'Deshabilitada'}
                          </Badge>
                        </div>
                        {calendarSettings.color && (
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Color:</span>
                            <div 
                              className="w-6 h-6 rounded-full border-2 border-gray-300"
                              style={{ backgroundColor: calendarSettings.color }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5" />
                      Eventos del Calendario
                    </CardTitle>
                    <CardDescription>
                      Eventos de la próxima semana
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      onClick={fetchCalendarEvents} 
                      disabled={loading_api}
                      className="w-full"
                    >
                      {loading_api ? 'Cargando...' : 'Obtener Eventos'}
                    </Button>
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {events.length > 0 ? (
                        events.map((event) => (
                          <div key={event.id} className="p-3 border rounded-lg">
                            <div className="font-medium">{event.summary}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(event.start.dateTime).toLocaleString()}
                            </div>
                            <Badge variant="outline" className="mt-1">
                              {event.status}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          No hay eventos para mostrar
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Acciones de sincronización */}
              <Card>
                <CardHeader>
                  <CardTitle>Acciones de Sincronización</CardTitle>
                  <CardDescription>
                    Controla la sincronización del calendario
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Button 
                      onClick={syncCalendar} 
                      disabled={loading_api}
                      variant="outline"
                    >
                      Sincronizar Ahora
                    </Button>
                    <Button 
                      onClick={() => toggleSync(true)} 
                      disabled={loading_api}
                      variant="outline"
                    >
                      Habilitar Sync Auto
                    </Button>
                    <Button 
                      onClick={() => toggleSync(false)} 
                      disabled={loading_api}
                      variant="outline"
                    >
                      Deshabilitar Sync Auto
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Disponibilidad */}
            <TabsContent value="availability" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5" />
                    Verificar Disponibilidad
                  </CardTitle>
                  <CardDescription>
                    Verifica si el doctor está disponible en un rango de fechas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Fecha y hora de inicio</Label>
                      <Input
                        id="start-date"
                        type="datetime-local"
                        value={checkStartDate}
                        onChange={(e) => setCheckStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-date">Fecha y hora de fin</Label>
                      <Input
                        id="end-date"
                        type="datetime-local"
                        value={checkEndDate}
                        onChange={(e) => setCheckEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={checkAvailability} 
                    disabled={loading_api}
                    className="w-full"
                  >
                    {loading_api ? 'Verificando...' : 'Verificar Disponibilidad'}
                  </Button>
                  
                  {availability && (
                    <div className="mt-4 p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge 
                          variant={availability.isAvailable ? 'default' : 'destructive'}
                          className="text-sm"
                        >
                          {availability.isAvailable ? 'Disponible' : 'No Disponible'}
                        </Badge>
                      </div>
                      
                      {availability.conflictingEvents && availability.conflictingEvents.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Eventos en conflicto:</h4>
                          <div className="space-y-2">
                            {availability.conflictingEvents.map((event) => (
                              <div key={event.id} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                                <div className="font-medium">{event.summary}</div>
                                <div className="text-muted-foreground">
                                  {new Date(event.start.dateTime).toLocaleString()} - 
                                  {new Date(event.end.dateTime).toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Horarios de Trabajo */}
            <TabsContent value="working-hours" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Horarios de Trabajo
                  </CardTitle>
                  <CardDescription>
                    Configuración de horarios laborales del doctor
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={fetchWorkingHours} 
                    disabled={loading_api}
                    className="w-full"
                  >
                    {loading_api ? 'Cargando...' : 'Obtener Horarios'}
                  </Button>
                  
                  {workingHours && (
                    <div className="space-y-3">
                      {Object.entries(workingHours).map(([day, hours]) => (
                        <div key={day} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="font-medium capitalize">{day}</span>
                            <Badge variant={hours.enabled ? 'default' : 'secondary'}>
                              {hours.enabled ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                          {hours.enabled && (
                            <div className="text-sm text-muted-foreground">
                              {hours.start} - {hours.end}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Configuración */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Crear Nuevo Calendario
                  </CardTitle>
                  <CardDescription>
                    Configura un nuevo calendario para el doctor
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="calendar-name">Nombre del Calendario</Label>
                    <Input
                      id="calendar-name"
                      placeholder="Ej: Consultas Dr. García"
                      value={newCalendarName}
                      onChange={(e) => setNewCalendarName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Zona Horaria</Label>
                    <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Bogota">América/Bogotá</SelectItem>
                        <SelectItem value="America/New_York">América/Nueva York</SelectItem>
                        <SelectItem value="Europe/Madrid">Europa/Madrid</SelectItem>
                        <SelectItem value="America/Mexico_City">América/Ciudad de México</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="color">Color del Calendario</Label>
                    <div className="flex gap-2">
                      {['#4285f4', '#ea4335', '#34a853', '#fbbc04', '#9c27b0', '#ff6d01'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            selectedColor === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setSelectedColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="sync-enabled"
                      checked={syncEnabled}
                      onCheckedChange={setSyncEnabled}
                    />
                    <Label htmlFor="sync-enabled">Habilitar sincronización automática</Label>
                  </div>
                  
                  <Button 
                    onClick={createCalendar} 
                    disabled={loading_api || !newCalendarName.trim()}
                    className="w-full"
                  >
                    {loading_api ? 'Creando...' : 'Crear Calendario'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </NavigationProvider>
  )
}