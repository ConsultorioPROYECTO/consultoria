# Optimización de la Tabla de Appointments para Dashboards

## Resumen

Se ha optimizado la tabla `appointments` para permitir consultas locales eficientes para dashboards y analytics, manteniendo la sincronización con Google Calendar pero priorizando el rendimiento de consultas para datos en tiempo real.

## Cambios Implementados

### 1. Nuevos Campos en la Tabla Appointments

#### Campos de Fecha y Hora
- `appointmentDate`: Fecha de la cita (YYYY-MM-DD)
- `appointmentTime`: Hora de inicio (HH:MM:SS)
- `endTime`: Hora de finalización (HH:MM:SS)
- `durationMinutes`: Duración en minutos (default: 30)

#### Campos de Contenido y Precio
- `notes`: Notas adicionales de la cita
- `patientNotes`: Notas específicas del paciente
- `appointmentPrice`: Precio específico de la cita

#### Estados y Metadatos
- `priority`: Prioridad ('low', 'normal', 'high', 'urgent')
- `isFirstTime`: Indica si es primera cita del paciente
- `isFollowUp`: Indica si es cita de seguimiento
- `followUpOfId`: ID de la cita original (para seguimientos)

#### Timestamps Adicionales
- `canceledAt`: Timestamp de cancelación
- `attendedAt`: Timestamp de asistencia

### 2. Índices Optimizados para Dashboards

#### Índices Básicos
- `idx_appointments_doctor_id`
- `idx_appointments_patient_id`
- `idx_appointments_service_id`
- `idx_appointments_organization_id`

#### Índices para Analytics
- `idx_appointments_date_time`: Para consultas por fecha/hora
- `idx_appointments_status`: Para filtros por estado
- `idx_appointments_priority`: Para filtros por prioridad

#### Índices Compuestos para Consultas Frecuentes
- `idx_appointments_org_date`: Organización + Fecha
- `idx_appointments_org_status`: Organización + Estado
- `idx_appointments_doctor_date`: Doctor + Fecha
- `idx_appointments_doctor_status`: Doctor + Estado
- `idx_appointments_patient_date`: Paciente + Fecha

#### Índices para Métricas de Tiempo
- `idx_appointments_created_at`
- `idx_appointments_attended_at`
- `idx_appointments_canceled_at`

### 3. Nuevas Relaciones

#### Seguimiento de Citas
- `originalAppointment`: Relación con la cita original
- `followUpAppointments`: Citas de seguimiento derivadas

### 4. Tipos TypeScript para Analytics

#### Archivo: `src/types/appointment-analytics.ts`
- `AppointmentMetrics`: Métricas básicas de citas
- `DoctorAppointmentMetrics`: Métricas por doctor
- `ServiceAppointmentMetrics`: Métricas por servicio
- `TimeBasedMetrics`: Métricas temporales
- `AppointmentFilters`: Filtros para consultas
- `OptimizedAppointmentQuery`: Consultas optimizadas
- `AppointmentAnalytics`: Clase con funciones de utilidad

### 5. Consultas Optimizadas

#### Archivo: `src/db/queries/appointment-analytics.ts`

##### Métodos Principales:
- `getBasicMetrics()`: Métricas generales por período
- `getDoctorMetrics()`: Métricas por doctor con tasa de utilización
- `getServiceMetrics()`: Métricas por servicio médico
- `getDailyMetrics()`: Métricas diarias para gráficos
- `getOptimizedAppointments()`: Consultas con joins optimizados
- `getHourlyDistribution()`: Distribución horaria de citas

## Beneficios de la Optimización

### 1. Rendimiento
- **Consultas más rápidas**: Índices compuestos para consultas frecuentes
- **Menos joins**: Datos desnormalizados para dashboards
- **Consultas locales**: Sin dependencia de APIs externas para analytics

### 2. Funcionalidad
- **Métricas en tiempo real**: Cálculos instantáneos de KPIs
- **Filtros avanzados**: Múltiples criterios de búsqueda
- **Seguimiento de citas**: Relaciones entre citas originales y seguimientos
- **Análisis temporal**: Tendencias y patrones por períodos

### 3. Escalabilidad
- **Índices optimizados**: Rendimiento constante con crecimiento de datos
- **Consultas eficientes**: Uso mínimo de recursos del servidor
- **Cacheable**: Resultados fáciles de cachear para mejor rendimiento

## Casos de Uso para Dashboards

### 1. Dashboard Ejecutivo
```typescript
// Métricas generales del mes
const metrics = await AppointmentAnalyticsQueries.getBasicMetrics(
  organizationId,
  '2024-01-01',
  '2024-01-31'
);
```

### 2. Dashboard de Doctores
```typescript
// Rendimiento por doctor
const doctorMetrics = await AppointmentAnalyticsQueries.getDoctorMetrics(
  organizationId,
  '2024-01-01',
  '2024-01-31'
);
```

### 3. Análisis de Servicios
```typescript
// Demanda por servicio
const serviceMetrics = await AppointmentAnalyticsQueries.getServiceMetrics(
  organizationId,
  '2024-01-01',
  '2024-01-31'
);
```

### 4. Gráficos de Tendencias
```typescript
// Datos para gráficos temporales
const dailyMetrics = await AppointmentAnalyticsQueries.getDailyMetrics(
  organizationId,
  '2024-01-01',
  '2024-01-31'
);
```

### 5. Consultas Filtradas
```typescript
// Citas con filtros específicos
const appointments = await AppointmentAnalyticsQueries.getOptimizedAppointments({
  organizationId: 1,
  status: ['pending', 'accepted'],
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31',
  priority: ['high', 'urgent']
});
```

## Migración y Compatibilidad

### Campos Existentes
- Se mantienen todos los campos existentes
- La sincronización con Google Calendar sigue funcionando
- No se rompe funcionalidad existente

### Nuevos Campos
- Todos los nuevos campos son opcionales o tienen valores por defecto
- Se pueden poblar gradualmente desde Google Calendar
- Compatibilidad hacia atrás garantizada

## Próximos Pasos

### 1. Migración de Datos
- Poblar campos nuevos desde datos existentes de Google Calendar
- Establecer valores por defecto para registros existentes

### 2. Implementación en Frontend
- Crear componentes de dashboard que usen las nuevas consultas
- Implementar gráficos y métricas en tiempo real
- Agregar filtros avanzados en la UI

### 3. Optimizaciones Adicionales
- Implementar cache para consultas frecuentes
- Agregar más índices según patrones de uso
- Considerar vistas materializadas para consultas complejas

### 4. Monitoreo
- Implementar logging de rendimiento de consultas
- Monitorear uso de índices
- Optimizar consultas según métricas reales

## Consideraciones de Rendimiento

### Consultas Recomendadas
- Siempre filtrar por `organizationId` primero
- Usar rangos de fechas específicos
- Limitar resultados con `LIMIT` y `OFFSET`
- Aprovechar índices compuestos

### Consultas a Evitar
- Consultas sin filtro de organización
- Rangos de fechas muy amplios sin límites
- Joins innecesarios cuando los datos están desnormalizados
- Consultas que no usan índices

## Conclusión

La optimización implementada transforma la tabla `appointments` en una fuente de datos eficiente para dashboards y analytics, manteniendo la funcionalidad existente mientras proporciona capacidades avanzadas de consulta y análisis en tiempo real.