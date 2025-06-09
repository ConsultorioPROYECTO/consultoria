# Configuración Google Calendar SDK

## Estructura de Implementación Creada

### 📁 Archivos Creados

1. **`src/lib/google-calendar.ts`** - Configuración base del SDK
2. **`src/types/calendar.ts`** - Interfaces TypeScript
3. **`src/services/calendar-service.ts`** - Servicio principal con CRUD operations
4. **`.env.example`** - Variables de entorno actualizadas

### 🔧 Configuración Requerida

#### 1. Google Cloud Console Setup

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear un nuevo proyecto o seleccionar uno existente
3. Habilitar **Google Calendar API**:
   - Ir a "APIs & Services" > "Library"
   - Buscar "Google Calendar API"
   - Hacer clic en "Enable"

#### 2. Service Account Creation

1. Ir a "APIs & Services" > "Credentials"
2. Hacer clic en "Create Credentials" > "Service Account"
3. Completar los detalles del Service Account
4. Descargar el archivo JSON con las credenciales

#### 3. Variables de Entorno

Copiar `.env.example` a `.env.local` y completar:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL="tu-service-account@tu-proyecto.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_PRIVATE_KEY_AQUI\n-----END PRIVATE KEY-----\n"
GOOGLE_MAIN_CALENDAR_ID="primary"
DEFAULT_TIMEZONE="America/Mexico_City"
```

### 🏗️ Arquitectura del Sistema

```
📦 Google Calendar Integration
├── 🔧 lib/google-calendar.ts          # SDK Configuration
├── 📋 types/calendar.ts               # TypeScript Interfaces
├── ⚙️ services/calendar-service.ts    # Business Logic
└── 🎯 Próximos pasos:
    ├── 📡 API Routes (/api/calendar/*)
    ├── 🎨 Frontend Integration
    └── 🔄 Real-time Sync
```

### 📋 Interfaces Principales

#### `ConsultorioCalendar`
```typescript
interface ConsultorioCalendar {
  id: string;                    // ID del calendario en Google
  consultorioId: string;         // ID interno del sistema
  name: string;                  // "Consultorio Dr. García"
  doctorId: string;              // ID del doctor
  timezone: string;              // "America/Mexico_City"
}
```

#### `AppointmentData`
```typescript
interface AppointmentData {
  patientName: string;
  doctorName: string;
  type: string;
  startTime: Date;
  endTime: Date;
  status: string;
  notes?: string;
}
```

### 🚀 Métodos Disponibles

#### CalendarService

- `createConsultorioCalendar()` - Crear calendario para consultorio
- `getConsultorioEvents()` - Obtener eventos de un período
- `createAppointment()` - Crear nueva cita médica
- `updateAppointment()` - Actualizar cita existente
- `deleteAppointment()` - Eliminar cita

### 🎨 Colores por Especialidad

- **Consulta General**: Azul (`1`)
- **Cardiología**: Verde (`2`)
- **Dermatología**: Púrpura (`3`)
- **Neurología**: Rosa (`4`)
- **Ginecología**: Amarillo (`5`)
- **Pediatría**: Naranja (`6`)
- **Oftalmología**: Turquesa (`7`)

## Implementación Completada

### ✅ Archivos Creados y Configurados

1. **Backend Google Calendar**:
   - `src/lib/google-calendar.ts` - Configuración del SDK
   - `src/types/calendar.ts` - Interfaces TypeScript
   - `src/services/calendar-service.ts` - Lógica de negocio

2. **API Routes**:
   - `src/app/api/appointments/route.ts` - CRUD de citas (GET, POST, PUT, DELETE)
   - `src/app/api/consultorios/[id]/route.ts` - Gestión de consultorios

3. **Frontend Integration**:
   - `src/app/dashboard/calender/com/calendar-view.tsx` - Integración completa con Google Calendar

### ✅ Funcionalidades Implementadas

- **Carga automática de eventos** desde Google Calendar
- **Fallback a eventos mock** si Google Calendar no está disponible
- **Indicador visual** de conexión con Google Calendar
- **Loading states** durante la carga de eventos
- **Función createNewAppointment** para crear citas
- **Conversión automática** de formatos entre Google Calendar y la aplicación
- **Gestión de errores** y recuperación automática

### 🔧 Uso del Componente

```tsx
// Con Google Calendar (requiere consultorioId)
<CalendarView consultorioId="1" />

// Sin Google Calendar (usa eventos mock)
<CalendarView />
```

### 📝 Próximos Pasos

1. **Configurar variables de entorno** según `.env.example`
2. **Crear Service Account** en Google Cloud Console
3. **Implementar sincronización en tiempo real** (webhooks)
4. **Crear interfaz de gestión de consultorios"
5. **Agregar autenticación y autorización**

### 🔒 Seguridad

- ✅ Service Account configurado
- ✅ Variables de entorno protegidas
- ✅ Scopes mínimos necesarios
- ✅ Validación de tipos TypeScript

### 📦 Dependencias Instaladas

- `googleapis` - SDK oficial de Google APIs

---

**Estado**: ✅ Estructura base completada (Pasos 1-3)
**Siguiente**: Implementar API Routes y integración frontend