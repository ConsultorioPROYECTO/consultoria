# API de Disponibilidad de Doctores por Servicio

## Descripción

Esta API permite obtener la disponibilidad de todos los doctores que pueden ofrecer un servicio médico específico durante los próximos 7 días.

## Endpoint

```
GET /api/services/[serviceId]/doctors/availability
```

## Parámetros

### Path Parameters

- `serviceId` (number, requerido): ID del servicio médico para el cual se quiere consultar la disponibilidad de doctores.

## Respuesta Exitosa

### Status Code: 200

```json
{
  "availability": {
    "doctors": [
      {
        "idDoctor": 1,
        "doctorName": "Dr. Juan Pérez",
        "availability": {
          "2024-01-15": {
            "intervals": [
              {
                "startTime": "09:00",
                "endTime": "09:30"
              },
              {
                "startTime": "09:30",
                "endTime": "10:00"
              },
              {
                "startTime": "14:00",
                "endTime": "14:30"
              }
            ],
            "timeZone": "America/Bogota"
          },
          "2024-01-16": {
            "intervals": [
              {
                "startTime": "10:00",
                "endTime": "10:30"
              }
            ],
            "timeZone": "America/Bogota"
          }
        }
      },
      {
        "idDoctor": 2,
        "doctorName": "Dra. María González",
        "availability": {
          "2024-01-15": {
            "intervals": [
              {
                "startTime": "11:00",
                "endTime": "11:30"
              }
            ],
            "timeZone": "America/Bogota"
          }
        }
      }
    ]
  }
}
```

## Respuestas de Error

### Status Code: 400 - Bad Request

```json
{
  "error": "El serviceId no es válido"
}
```

### Status Code: 404 - Not Found

```json
{
  "error": "Servicio médico no encontrado"
}
```

### Status Code: 500 - Internal Server Error

```json
{
  "error": "Error interno del servidor"
}
```

## Estructura de Datos

### TimeInterval

```typescript
type TimeInterval = {
  startTime: string; // Formato HH:mm (ej: "09:30")
  endTime: string;   // Formato HH:mm (ej: "10:00")
};
```

### DayAvailability

```typescript
type DayAvailability = {
  intervals: TimeInterval[];
  timeZone: string; // Zona horaria del doctor (ej: "America/Bogota")
};
```

### DoctorAvailabilityInfo

```typescript
type DoctorAvailabilityInfo = {
  idDoctor: number;
  doctorName: string;
  availability: {
    [date: string]: DayAvailability; // fecha en formato YYYY-MM-DD
  };
};
```

## Lógica de Funcionamiento

1. **Validación del Servicio**: Se verifica que el servicio médico existe y se obtiene su duración en minutos.

2. **Búsqueda de Doctores**: Se consultan todos los doctores que:
   - Están asociados al servicio médico (`doctor_services` table)
   - Tienen `isAvailable = true` para ese servicio
   - Tienen un `calendar_id` configurado

3. **Cálculo de Disponibilidad**: Para cada doctor:
   - Se consulta su disponibilidad usando `getDoctorAvailability()` para los próximos 7 días
   - Se generan slots de tiempo basados en la duración del servicio
   - Se organiza la disponibilidad por fecha

4. **Formato de Respuesta**: Se estructura la respuesta agrupando por doctor y fecha.

## Consideraciones

- **Zona Horaria**: Cada doctor puede tener su propia zona horaria configurada
- **Duración del Servicio**: Los intervalos se generan basándose en la duración específica del servicio médico
- **Período de Consulta**: Siempre consulta los próximos 7 días desde la fecha actual
- **Manejo de Errores**: Si un doctor individual falla, se continúa procesando los demás doctores

## Ejemplo de Uso

```bash
# Obtener disponibilidad de doctores para el servicio con ID 5
curl -X GET "http://localhost:3000/api/services/5/doctors/availability"
```

## Diferencias con la API Original

| Aspecto | API Original | Nueva API |
|---------|-------------|----------|
| Scope | Un doctor específico | Todos los doctores del servicio |
| Parámetro de fecha | Requerido en query | Automático (próximos 7 días) |
| Formato de respuesta | Array de slots | Agrupado por doctor y fecha |
| Filtro por servicio | En path parameter | Usado para buscar doctores |