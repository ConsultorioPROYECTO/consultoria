# Esquemas de Validación Zod para Google Calendar

Este archivo contiene los esquemas de validación Zod para los tipos relacionados con Google Calendar, específicamente para los horarios de trabajo de los doctores.

## Esquemas Disponibles

### `timeHHMMSchema`
Valida strings de tiempo en formato HH:mm (24 horas) con exactamente 2 dígitos para horas y minutos.

**Ejemplos válidos:**
- `"09:00"`
- `"17:30"`
- `"00:00"`
- `"23:59"`

**Ejemplos inválidos:**
- `"9:00"` (falta cero inicial)
- `"25:00"` (hora inválida)
- `"12:60"` (minutos inválidos)

### `timeIntervalSchema`
Valida intervalos de tiempo con propiedades `start` y `end`, asegurando que la hora de inicio sea anterior a la de fin.

**Ejemplo válido:**
```typescript
{
  start: "09:00",
  end: "17:00"
}
```

### `dayOfWeekSchema`
Valida los días de la semana en formato inglés mayúsculas.

**Valores válidos:**
- `"MONDAY"`
- `"TUESDAY"`
- `"WEDNESDAY"`
- `"THURSDAY"`
- `"FRIDAY"`
- `"SATURDAY"`
- `"SUNDAY"`

### `dailyWorkingHoursSchema`
Valida los horarios de trabajo para un día específico, incluyendo:
- El día de la semana
- Un array de intervalos de tiempo
- Validación de que los intervalos no se superpongan

**Ejemplo válido:**
```typescript
{
  dayOfWeek: "MONDAY",
  intervals: [
    { start: "09:00", end: "12:00" },
    { start: "14:00", end: "17:00" }
  ]
}
```

### `doctorWorkingHoursSchema`
Valida los horarios de trabajo completos de un doctor, asegurando:
- Al menos 1 día de trabajo
- Máximo 7 días
- No hay días duplicados

**Ejemplo válido:**
```typescript
{
  workingHours: [
    {
      dayOfWeek: "MONDAY",
      intervals: [{ start: "09:00", end: "17:00" }]
    },
    {
      dayOfWeek: "TUESDAY",
      intervals: [{ start: "09:00", end: "17:00" }]
    }
  ]
}
```

### `updateWorkingHoursRequestSchema`
Valida el cuerpo de las peticiones PUT para actualizar horarios de trabajo.

### `doctorIdParamSchema`
Valida el parámetro ID del doctor en las rutas, asegurando que sea un string numérico.

## Uso en la API

La API `/api/doctors/[id]/working-hours` ahora utiliza estas validaciones Zod para:

1. **Validar parámetros de ruta:** El ID del doctor se valida usando `doctorIdParamSchema`
2. **Validar cuerpo de peticiones:** Los datos de horarios se validan usando `updateWorkingHoursRequestSchema`
3. **Manejo de errores:** Los errores de validación Zod se capturan y se devuelven con mensajes descriptivos

## Beneficios

- **Validación robusta:** Zod proporciona validaciones más detalladas y específicas
- **Mensajes de error claros:** Los errores incluyen información específica sobre qué campo falló y por qué
- **Type safety:** Los tipos TypeScript se infieren automáticamente de los esquemas Zod
- **Reutilización:** Los esquemas pueden reutilizarse en diferentes partes de la aplicación
- **Mantenibilidad:** Cambios en la validación se centralizan en un solo lugar

## Migración desde el sistema anterior

La API mantiene compatibilidad con el formato anterior (`WorkingHours`) mientras migra gradualmente al nuevo formato (`DoctorWorkingHours`). Esto permite una transición suave sin romper la funcionalidad existente.