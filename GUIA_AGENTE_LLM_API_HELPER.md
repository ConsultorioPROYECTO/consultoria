# Guía de Uso API Helper para Agente LLM

## Objetivo
Esta guía proporciona patrones de uso y lógica de decisión para que un agente LLM utilice eficazmente la API Helper para consultar información médica.

## Información de la API
- **Herramienta disponible**: `consultarInformacionMedica`
- **Endpoints**: 8 endpoints especializados para diferentes tipos de consultas
- **Autenticación**: Automática (configurada en la herramienta)

## Árbol de Decisión para Consultas

### 1. Análisis de Intención del Usuario

#### Consultas Generales/Contexto
- **Palabras clave**: "resumen", "información general", "estadísticas", "cuántos"
- **Acción**: Usar `endpoint="organization-summary"`
- **Ejemplo**: "¿Cuántos doctores tienen?" → organization-summary

#### Búsqueda de Personas
- **Palabras clave**: "buscar", "encontrar", "paciente", nombres propios
- **Acción**: Usar `endpoint="patients-search"` con `searchTerm`
- **Ejemplo**: "Busca a María García" → patients-search + searchTerm="María García"

#### Consultas de Agenda
- **Palabras clave**: "citas", "agenda", "hoy", "próximas", "programadas"
- **Lógica**:
  - "hoy" → `endpoint="appointments-today"`
  - "próximas", "siguientes" → `endpoint="appointments-upcoming"`
  - ID específico → `endpoint="appointment-details"`

#### Información de Personal
- **Palabras clave**: "doctores", "médicos", "especialistas", "disponibles"
- **Acción**: Usar `endpoint="doctors-with-services"`

#### Servicios Médicos
- **Palabras clave**: "servicios", "tratamientos", "procedimientos", "precios"
- **Acción**: Usar `endpoint="medical-services"`

## Patrones de Uso por Endpoint

### organization-summary
**Cuándo usar**:
- Primera consulta del usuario
- Preguntas sobre estadísticas generales
- Necesidad de contexto organizacional

**Parámetros**: Solo `endpoint`

**Procesamiento de respuesta**:
```
SI success = true:
  - Extraer datos de organization y statistics
  - Formatear números de manera legible
  - Proporcionar contexto relevante
SI success = false:
  - Informar error de manera amigable
  - Sugerir alternativas
```

### patients-search
**Cuándo usar**:
- Usuario menciona nombre de paciente
- Búsqueda por cédula, teléfono o email
- Consultas sobre información específica de paciente

**Parámetros**:
- `endpoint="patients-search"`
- `searchTerm`: Extraer del input del usuario
- `limit`: Usar 10 para búsquedas iniciales, 20 para búsquedas amplias

**Lógica de searchTerm**:
- Extraer nombres completos o parciales
- Incluir números de identificación
- Considerar variaciones de escritura

**Procesamiento de respuesta**:
```
SI resultados = 0:
  - Sugerir búsqueda con términos diferentes
  - Ofrecer búsqueda más amplia
SI resultados = 1:
  - Mostrar información del paciente
  - Ofrecer consultas adicionales
SI resultados > 1:
  - Listar opciones numeradas
  - Pedir aclaración al usuario
  - Mostrar datos distintivos (ID, teléfono)
```

### appointments-today
**Cuándo usar**:
- Consultas sobre agenda del día
- "¿Qué citas hay hoy?"
- Revisión de actividades diarias

**Parámetros**: Solo `endpoint`

**Procesamiento de respuesta**:
```
SI citas = 0:
  - "No hay citas programadas para hoy"
SI citas > 0:
  - Ordenar por hora (usar createdAt como referencia)
  - Formatear: "Dr. [Nombre] - [Paciente] - [Servicio] - [Estado]"
  - Agrupar por estado si es relevante
```

### appointments-upcoming
**Cuándo usar**:
- "Próximas citas", "siguientes días"
- Planificación a futuro
- Consultas con rango temporal específico

**Parámetros**:
- `endpoint="appointments-upcoming"`
- `days`: Extraer del contexto (default: 7)
  - "mañana" → days=1
  - "esta semana" → days=7
  - "próximos X días" → days=X

**Procesamiento de respuesta**:
```
Agrupar por fecha
Para cada día:
  - Mostrar fecha legible
  - Listar citas del día
  - Incluir información relevante del servicio
```

### doctors-with-services
**Cuándo usar**:
- Consultas sobre personal médico
- "¿Qué doctores tienen?"
- Búsqueda de especialidades

**Parámetros**: Solo `endpoint`

**Procesamiento de respuesta**:
```
Agrupar por especialidad (si aplica)
Para cada doctor:
  - Nombre y especialidad
  - Estado (activo/inactivo)
  - Información de contacto si es relevante
```

### medical-services
**Cuándo usar**:
- Consultas sobre servicios disponibles
- Preguntas sobre precios
- Información sobre procedimientos

**Parámetros**: Solo `endpoint`

**Procesamiento de respuesta**:
```
Agrupar por categoría
Para cada servicio:
  - Nombre y descripción
  - Duración y precio formateados
  - Instrucciones especiales si existen
```

### doctor-availability
**Cuándo usar**:
- Consultas sobre disponibilidad específica
- Verificación de horarios
- Preparación para agendamiento

**Parámetros**:
- `endpoint="doctor-availability"`
- `doctorId`: Solo si se especifica un doctor particular

### appointment-details
**Cuándo usar**:
- Usuario proporciona ID específico de cita
- Necesidad de información detallada
- Seguimiento de citas específicas

**Parámetros**:
- `endpoint="appointment-details"`
- `appointmentId`: Extraer del input del usuario

## Estrategias de Conversación

### Flujo Conversacional Inteligente

1. **Contexto Inicial**
   ```
   Usuario: "Hola"
   Agente: Usar organization-summary para obtener contexto
   Respuesta: Saludo + breve resumen de la organización
   ```

2. **Búsqueda Progresiva**
   ```
   Usuario: "Busca a Juan"
   Agente: patients-search con searchTerm="Juan"
   SI múltiples resultados:
     Mostrar opciones y pedir aclaración
   SI resultado único:
     Mostrar info + ofrecer consultas adicionales
   ```

3. **Consultas Relacionadas**
   ```
   Después de mostrar un paciente:
   - Ofrecer ver sus citas
   - Sugerir información de contacto
   - Proponer servicios relacionados
   ```

### Manejo de Ambigüedad

**Términos ambiguos**:
- "citas" → Preguntar: "¿Te refieres a las citas de hoy o próximas?"
- "doctor" → Si hay múltiples, pedir especificación
- "información" → Ofrecer opciones específicas

**Estrategia de clarificación**:
1. Identificar ambigüedad
2. Ofrecer opciones específicas
3. Usar la respuesta para refinar la consulta

## Optimización de Respuestas

### Formateo de Datos

**Fechas**:
- Convertir ISO a formato legible
- Usar "hoy", "mañana" cuando aplique
- Incluir día de la semana

**Números**:
- Formatear precios con separadores de miles
- Mostrar duraciones en formato amigable ("30 minutos")
- Usar plurales correctos

**Listas**:
- Numerar cuando hay múltiples opciones
- Agrupar por categorías relevantes
- Limitar a información esencial

### Personalización de Respuestas

**Tono profesional médico**:
- Usar terminología apropiada
- Mantener confidencialidad
- Ser preciso con información médica

**Estructura de respuestas**:
1. Confirmación de entendimiento
2. Información solicitada
3. Opciones adicionales (si aplica)
4. Pregunta de seguimiento

## Manejo de Errores y Casos Especiales

### Errores de API
```
SI error 401: "Hay un problema de autenticación. Por favor, inténtalo más tarde."
SI error 404: "No se encontró la información solicitada."
SI error 500: "Hay un problema temporal con el sistema. Inténtalo en unos momentos."
SI sin respuesta: "No pude obtener la información en este momento."
```

### Casos sin resultados
```
Búsqueda de pacientes sin resultados:
- Sugerir verificar ortografía
- Ofrecer búsqueda por otros criterios
- Proponer contacto directo

Citas vacías:
- Confirmar que no hay citas programadas
- Sugerir consultar otros períodos
- Ofrecer información sobre agendamiento
```

### Límites y Restricciones

**Información sensible**:
- No mostrar datos médicos específicos
- Proteger información personal completa
- Usar solo datos necesarios para identificación

**Límites de consulta**:
- Usar límites apropiados en búsquedas
- Evitar consultas excesivas en una conversación
- Priorizar eficiencia sobre exhaustividad

## Ejemplos de Implementación

### Caso 1: Consulta General
```
Usuario: "¿Cómo está la clínica hoy?"

Proceso:
1. Usar organization-summary
2. Usar appointments-today
3. Combinar información

Respuesta: "La clínica [Nombre] tiene [X] doctores activos y [Y] pacientes registrados. Hoy hay [Z] citas programadas: [lista resumida]"
```

### Caso 2: Búsqueda Específica
```
Usuario: "Necesito información de Carlos Rodríguez"

Proceso:
1. patients-search con searchTerm="Carlos Rodríguez"
2. Evaluar resultados
3. Mostrar información o pedir aclaración

Respuesta múltiple: "Encontré 2 pacientes:
1. Carlos Rodríguez Pérez - CC 12345678
2. Carlos Rodríguez López - CC 87654321
¿Cuál necesitas?"
```

### Caso 3: Planificación
```
Usuario: "¿Qué citas hay esta semana?"

Proceso:
1. appointments-upcoming con days=7
2. Agrupar por días
3. Formatear cronológicamente

Respuesta: "Esta semana hay [X] citas programadas:

**Lunes [fecha]:**
- Dr. García - Ana López - 9:00 AM
- Dr. Martínez - Juan Pérez - 2:00 PM

**Martes [fecha]:**
..."
```

## Métricas de Éxito

**Eficiencia**:
- Resolver consultas en máximo 2 llamadas a la API
- Proporcionar información completa en primera respuesta
- Minimizar necesidad de aclaraciones

**Precisión**:
- Interpretar correctamente la intención del usuario
- Usar el endpoint más apropiado
- Formatear información de manera clara

**Experiencia del usuario**:
- Respuestas naturales y conversacionales
- Información relevante y bien estructurada
- Opciones de seguimiento útiles

Esta guía está optimizada para maximizar la efectividad del agente LLM en el manejo de consultas médicas, manteniendo profesionalismo y eficiencia en todas las interacciones.