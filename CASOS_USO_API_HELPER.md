# Casos de Uso Concretos - API Helper

## Guía Práctica para Seleccionar el Endpoint Correcto

Esta guía proporciona casos específicos y ejemplos reales para ayudar a determinar qué endpoint usar en cada situación.

---

## 📊 `organization-summary`

### Cuándo Usar
- **Primera interacción** con el sistema
- Necesitas **contexto general** antes de consultas específicas
- Preguntas sobre **estadísticas globales**
- **Reportes ejecutivos** o dashboards

### Casos Concretos

**✅ Usar organization-summary cuando el usuario pregunta:**
- "¿Cómo está la clínica hoy?"
- "Dame un resumen general"
- "¿Cuántos doctores y pacientes tienen?"
- "Necesito estadísticas de la organización"
- "¿Cuál es el estado actual de la clínica?"
- "Muéstrame un dashboard general"

**❌ NO usar cuando:**
- Buscan información específica de una persona
- Quieren detalles de citas particulares
- Necesitan datos de servicios específicos

### Ejemplo de Respuesta Esperada
```
"Clínica San Rafael tiene:
- 8 doctores activos
- 245 pacientes registrados
- 12 servicios médicos disponibles
- 6 citas programadas para hoy"
```

---

## 🔍 `patients-search`

### Cuándo Usar
- El usuario menciona **nombres específicos**
- Búsqueda por **datos de identificación**
- Necesitas **localizar un paciente** particular
- **Verificación de registro** de pacientes

### Casos Concretos

**✅ Usar patients-search cuando el usuario pregunta:**
- "Busca a María García"
- "¿Está registrado Juan Pérez?"
- "Necesito el teléfono de Ana López"
- "Busca por cédula 12345678"
- "¿Tienes a alguien con email juan@email.com?"
- "Muéstrame pacientes que se llamen Carlos"

**❌ NO usar cuando:**
- Quieren lista completa de todos los pacientes
- Buscan estadísticas generales
- Necesitan información de doctores

### Parámetros Importantes
```
searchTerm: "María García"  // Nombre completo o parcial
searchTerm: "12345678"      // Número de identificación
searchTerm: "555-0123"     // Teléfono
limit: 10                   // Para búsquedas iniciales
limit: 20                   // Para búsquedas amplias
```

### Manejo de Resultados
- **0 resultados**: Sugerir verificar ortografía o usar otros criterios
- **1 resultado**: Mostrar información completa del paciente
- **Múltiples resultados**: Listar opciones numeradas para que el usuario elija

---

## 📅 `appointments-today`

### Cuándo Usar
- Consultas sobre **agenda del día actual**
- **Revisión matutina** de actividades
- **Control diario** de citas
- **Planificación inmediata**

### Casos Concretos

**✅ Usar appointments-today cuando el usuario pregunta:**
- "¿Qué citas hay hoy?"
- "Muéstrame la agenda de hoy"
- "¿Cuántas citas tenemos programadas para hoy?"
- "¿Qué doctores tienen citas hoy?"
- "Dame el resumen del día"
- "¿Hay citas pendientes hoy?"

**❌ NO usar cuando:**
- Preguntan por citas de otros días
- Buscan citas futuras o pasadas
- Quieren detalles de una cita específica

### Ejemplo de Respuesta
```
"Hoy hay 6 citas programadas:
- 9:00 AM - Dr. García - Ana López - Consulta General
- 10:30 AM - Dr. Martínez - Carlos Ruiz - Cardiología
- 2:00 PM - Dr. García - María Pérez - Control"
```

---

## ⏰ `appointments-upcoming`

### Cuándo Usar
- **Planificación a futuro**
- Consultas con **rango temporal específico**
- **Organización semanal/mensual**
- **Previsión de carga de trabajo**

### Casos Concretos

**✅ Usar appointments-upcoming cuando el usuario pregunta:**
- "¿Qué citas hay mañana?"
- "Muéstrame las citas de esta semana"
- "¿Qué hay programado para los próximos 3 días?"
- "Dame la agenda de la próxima semana"
- "¿Cuántas citas hay en los próximos 15 días?"

**❌ NO usar cuando:**
- Solo quieren citas de hoy
- Buscan citas pasadas
- Necesitan detalles de una cita específica

### Configuración de Parámetros
```
days: 1    // "mañana"
days: 7    // "esta semana" (default)
days: 15   // "próximos 15 días"
days: 30   // "próximo mes"
```

### Interpretación de Términos
- **"mañana"** → `days=1`
- **"esta semana"** → `days=7`
- **"próximos X días"** → `days=X`
- **"próximo mes"** → `days=30`

---

## 👨‍⚕️ `doctors-with-services`

### Cuándo Usar
- Consultas sobre **personal médico**
- **Búsqueda de especialidades**
- **Información de contacto** de doctores
- **Verificación de disponibilidad** de personal

### Casos Concretos

**✅ Usar doctors-with-services cuando el usuario pregunta:**
- "¿Qué doctores tienen disponibles?"
- "Muéstrame todos los médicos"
- "¿Hay algún cardiólogo?"
- "Necesito el teléfono del Dr. García"
- "¿Qué especialidades manejan?"
- "Dame la lista de doctores activos"

**❌ NO usar cuando:**
- Buscan horarios específicos de doctores
- Quieren agendar citas
- Necesitan información de pacientes

### Ejemplo de Respuesta
```
"Doctores disponibles:

**Cardiología:**
- Dr. Juan García - Activo - Tel: 555-0101

**Medicina General:**
- Dra. Ana Martínez - Activa - Tel: 555-0102
- Dr. Carlos López - Activo - Tel: 555-0103"
```

---

## 🏥 `medical-services`

### Cuándo Usar
- Consultas sobre **servicios disponibles**
- **Información de precios**
- **Duración de procedimientos**
- **Catálogo de servicios**

### Casos Concretos

**✅ Usar medical-services cuando el usuario pregunta:**
- "¿Qué servicios ofrecen?"
- "¿Cuánto cuesta una consulta?"
- "Muéstrame todos los procedimientos"
- "¿Cuánto dura una ecografía?"
- "¿Tienen servicio de cardiología?"
- "Dame la lista de precios"

**❌ NO usar cuando:**
- Buscan información de doctores
- Quieren agendar servicios
- Necesitan datos de pacientes

### Ejemplo de Respuesta
```
"Servicios médicos disponibles:

**Consultas:**
- Consulta General - 30 min - $50.000
- Consulta Especializada - 45 min - $80.000

**Procedimientos:**
- Ecografía - 20 min - $120.000
- Electrocardiograma - 15 min - $60.000"
```

---

## 🗓️ `doctor-availability`

### Cuándo Usar
- **Listado básico** de doctores registrados
- **Obtención de IDs** únicos de doctores
- **Consulta simple** sin detalles de horarios
- **Preparación para otras consultas**

### Casos Concretos

**✅ Usar doctor-availability cuando el usuario pregunta:**
- "Dame la lista básica de doctores"
- "¿Cuáles son los IDs de los doctores?"
- "Necesito los identificadores de médicos"
- "Muéstrame solo los nombres de doctores"

**❌ NO usar cuando:**
- Necesitan horarios específicos
- Quieren información detallada
- Buscan especialidades o servicios

### Parámetros Opcionales
```
doctorId: 123  // Para consultar doctor específico
// Sin parámetros adicionales para lista completa
```

---

## 📋 `appointment-details`

### Cuándo Usar
- **ID específico** de cita proporcionado
- **Información detallada** de una cita
- **Seguimiento** de citas particulares
- **Verificación** de detalles específicos

### Casos Concretos

**✅ Usar appointment-details cuando el usuario pregunta:**
- "Muéstrame los detalles de la cita 12345"
- "¿Qué información tienes de la cita ID 67890?"
- "Necesito ver toda la información de esta cita"
- "Dame los detalles completos de la cita número X"

**❌ NO usar cuando:**
- No tienen ID específico
- Buscan múltiples citas
- Quieren listas generales

### Parámetro Requerido
```
appointmentId: 12345  // ID específico de la cita
```

---

## 🎯 Flujo de Decisión Rápida

### Pregunta: "¿El usuario mencionó...?"

1. **Nombres específicos** → `patients-search`
2. **"Hoy"** → `appointments-today`
3. **"Próximo/siguiente/mañana"** → `appointments-upcoming`
4. **"Doctores/médicos"** → `doctors-with-services`
5. **"Servicios/precios"** → `medical-services`
6. **"Resumen/estadísticas"** → `organization-summary`
7. **ID específico de cita** → `appointment-details`
8. **Lista básica de doctores** → `doctor-availability`

---

## 🔄 Casos de Uso Combinados

### Escenario 1: Búsqueda Progresiva
```
Usuario: "Busca a María García"
1. patients-search → Encuentra paciente
2. Mostrar información
3. Ofrecer: "¿Quieres ver sus citas próximas?"
4. Si acepta → appointments-upcoming filtrado
```

### Escenario 2: Planificación Diaria
```
Usuario: "¿Cómo está el día?"
1. organization-summary → Contexto general
2. appointments-today → Agenda específica
3. Combinar información en respuesta integral
```

### Escenario 3: Consulta de Servicios
```
Usuario: "¿Tienen cardiología?"
1. medical-services → Verificar servicios
2. doctors-with-services → Mostrar cardiólogos
3. Combinar: servicios + doctores disponibles
```

---

## ⚠️ Errores Comunes a Evitar

### ❌ Error: Usar endpoint incorrecto
- **Problema**: Usar `appointments-today` para "citas de mañana"
- **Solución**: Usar `appointments-upcoming` con `days=1`

### ❌ Error: No usar parámetros
- **Problema**: Llamar `patients-search` sin `searchTerm`
- **Solución**: Extraer término de búsqueda del input del usuario

### ❌ Error: Parámetros incorrectos
- **Problema**: Usar `limit=100` en búsquedas iniciales
- **Solución**: Usar `limit=10` para búsquedas iniciales, `limit=20` para amplias

### ❌ Error: No manejar múltiples resultados
- **Problema**: Mostrar solo el primer resultado cuando hay varios
- **Solución**: Listar opciones y pedir aclaración al usuario

---

## 📝 Plantillas de Respuesta

### Para Múltiples Resultados
```
"Encontré [X] pacientes con ese nombre:
1. [Nombre Completo] - [Identificación]
2. [Nombre Completo] - [Identificación]
¿Cuál necesitas?"
```

### Para Sin Resultados
```
"No encontré pacientes con '[término]'.
¿Podrías verificar la ortografía o intentar con:
- Nombre completo
- Número de identificación
- Teléfono"
```

### Para Información Completa
```
"[Información solicitada]

¿Te gustaría que consulte:
- [Opción relacionada 1]
- [Opción relacionada 2]"
```

---

## 🎯 Resumen de Decisión

**Regla de Oro**: El endpoint debe coincidir exactamente con la intención específica del usuario.

- **Información general** → `organization-summary`
- **Buscar persona** → `patients-search`
- **Agenda hoy** → `appointments-today`
- **Agenda futura** → `appointments-upcoming`
- **Info doctores** → `doctors-with-services`
- **Info servicios** → `medical-services`
- **Lista doctores básica** → `doctor-availability`
- **Detalles cita específica** → `appointment-details`

Esta guía garantiza el uso óptimo de cada endpoint según el contexto y necesidades específicas del usuario.