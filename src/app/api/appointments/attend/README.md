# API de Atención de Citas

Este endpoint permite marcar citas médicas como atendidas (ATTENDED) de forma específica y controlada.

## Endpoint

```
PATCH /api/appointments/attend
```

## Autenticación

Requiere autenticación con Firebase Auth y los siguientes roles:
- `admin` - Administradores
- `medico` - Médicos
- `asistente` - Asistentes médicos

## Request Body

```typescript
interface AttendAppointmentRequest {
  appointmentId: number;  // ID de la cita a marcar como atendida
  notes?: string;         // Notas opcionales sobre la atención (máx. 1000 caracteres)
}
```

## Response

### Éxito (200)

```typescript
interface AttendAppointmentResponse {
  appointmentId: number;  // ID de la cita actualizada
  status: string;         // Nuevo estado ("attended")
  attendedAt: string;     // Timestamp ISO cuando se marcó como atendida
  notes?: string;         // Notas actualizadas si se proporcionaron
}
```

### Ejemplo de respuesta exitosa

```json
{
  "success": true,
  "message": "Appointment successfully marked as attended",
  "data": {
    "appointmentId": 123,
    "status": "attended",
    "attendedAt": "2025-01-20T14:30:00.000Z",
    "notes": "Paciente atendido sin complicaciones"
  }
}
```

## Errores

### 400 - Bad Request
- ID de cita inválido
- Notas demasiado largas (>1000 caracteres)
- Formato JSON inválido

### 403 - Forbidden
- Usuario sin permisos suficientes
- Usuario no pertenece a la organización de la cita

### 404 - Not Found
- Cita no encontrada

### 409 - Conflict
- Cita ya marcada como atendida
- Cita en estado inválido para ser marcada como atendida

### 500 - Internal Server Error
- Error de base de datos
- Error interno del servidor

## Validaciones de Negocio

### Estados válidos para marcar como atendida
- `pending` - Pendiente
- `accepted` - Confirmada

### Estados que NO permiten marcar como atendida
- `attended` - Ya atendida
- `rejected` - Rechazada
- `canceled` - Cancelada

### Validaciones de acceso
- Solo usuarios de la misma organización pueden marcar citas como atendidas
- Los asistentes pueden marcar cualquier cita de su organización
- Los médicos pueden marcar cualquier cita de su organización
- Los administradores tienen acceso completo

## Ejemplos de uso

### JavaScript/TypeScript

```typescript
async function markAppointmentAsAttended(appointmentId: number, notes?: string) {
  const token = await getAuthToken(); // Obtener token de Firebase
  
  const response = await fetch('/api/appointments/attend', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      appointmentId,
      notes
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error marking appointment as attended');
  }
  
  return await response.json();
}

// Uso
try {
  const result = await markAppointmentAsAttended(123, 'Consulta completada exitosamente');
  console.log('Cita marcada como atendida:', result.data);
} catch (error) {
  console.error('Error:', error.message);
}
```

### cURL

```bash
curl -X PATCH \
  'https://your-domain.com/api/appointments/attend' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_FIREBASE_TOKEN' \
  -d '{
    "appointmentId": 123,
    "notes": "Paciente atendido sin complicaciones"
  }'
```

## Consideraciones de Implementación

### Performance
- La operación es atómica y utiliza transacciones de base de datos
- Validaciones optimizadas con consultas mínimas
- Índices de base de datos para consultas rápidas

### Seguridad
- Validación estricta de permisos por organización
- Sanitización de datos de entrada
- Logging de operaciones para auditoría

### Integridad de Datos
- Actualización automática del timestamp `attendedAt`
- Preservación del historial de cambios
- Validación de estados de negocio

## Integración con Google Calendar

Esta API se enfoca únicamente en la actualización del estado local de la cita. Para sincronización con Google Calendar, se recomienda:

1. Usar eventos separados para sincronización
2. Implementar retry logic para fallos de sincronización
3. Mantener logs de sincronización para debugging

## Monitoreo y Logs

La API genera logs detallados para:
- Operaciones exitosas
- Errores de validación
- Errores de base de datos
- Intentos de acceso no autorizado

Estos logs son útiles para:
- Debugging de problemas
- Auditoría de operaciones
- Monitoreo de performance
- Análisis de uso
