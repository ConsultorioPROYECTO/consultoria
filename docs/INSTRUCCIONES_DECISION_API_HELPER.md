# Instrucciones de Decisión - API Helper

## Guía para Determinar el Endpoint Correcto

Esta guía proporciona instrucciones claras para analizar la consulta del usuario y determinar qué endpoint de la API Helper utilizar.

---

## 🎯 Instrucciones de Decisión Principal

### Determine si el usuario está preguntando por:

**"Información general/resumen"** o **"Datos específicos"**

- **SI** el usuario pregunta por información general → usar `organization-summary`
- **SI** el usuario pregunta por datos específicos → continuar con análisis detallado

---

## 📊 Análisis de Intención Específica

### 1. Determine si el usuario está preguntando por:

**"Estadísticas generales"** o **"Información de una persona específica"**

- **SI** pregunta por estadísticas → usar `organization-summary`
- **SI** pregunta por persona específica → usar `patients-search`

### 2. Determine si el usuario está preguntando por:

**"Citas de hoy"** o **"Citas futuras"**

- **SI** menciona "hoy", "día actual" → usar `appointments-today`
- **SI** menciona "mañana", "próximas", "siguientes" → usar `appointments-upcoming`

### 3. Determine si el usuario está preguntando por:

**"Información de doctores"** o **"Información de servicios"**

- **SI** pregunta por doctores, médicos, especialistas → usar `doctors-with-services`
- **SI** pregunta por servicios, precios, procedimientos → usar `medical-services`

### 4. Determine si el usuario está preguntando por:

**"Lista básica de doctores"** o **"Detalles completos de doctores"**

- **SI** solo necesita lista/IDs → usar `doctor-availability`
- **SI** necesita información completa → usar `doctors-with-services`

### 5. Determine si el usuario está preguntando por:

**"Múltiples citas"** o **"Una cita específica"**

- **SI** pregunta por varias citas → usar `appointments-today` o `appointments-upcoming`
- **SI** proporciona ID específico → usar `appointment-details`

---

## 🔍 Palabras Clave de Decisión

### Para `organization-summary`:
- "resumen", "estadísticas", "cuántos", "total", "general", "información de la clínica"

### Para `patients-search`:
- Nombres propios, "buscar", "encontrar", "paciente", números de identificación

### Para `appointments-today`:
- "hoy", "día actual", "agenda de hoy", "citas de hoy"

### Para `appointments-upcoming`:
- "mañana", "próximas", "siguientes", "esta semana", "próximos días"

### Para `doctors-with-services`:
- "doctores", "médicos", "especialistas", "personal médico"

### Para `medical-services`:
- "servicios", "precios", "procedimientos", "tratamientos", "cuánto cuesta"

### Para `doctor-availability`:
- "lista de doctores", "IDs de doctores", "nombres de médicos"

### Para `appointment-details`:
- "cita ID", "detalles de la cita", números específicos de cita

---

## 🚦 Flujo de Decisión Paso a Paso

### Paso 1: Análisis Inicial
```
Determine si el usuario está preguntando por:
"Información general" o "Búsqueda específica"

SI información general → organization-summary
SI búsqueda específica → continuar al Paso 2
```

### Paso 2: Tipo de Búsqueda
```
Determine si el usuario está preguntando por:
"Personas" o "Citas" o "Servicios/Doctores"

SI personas → patients-search
SI citas → continuar al Paso 3
SI servicios/doctores → continuar al Paso 4
```

### Paso 3: Temporalidad de Citas
```
Determine si el usuario está preguntando por:
"Citas de hoy" o "Citas futuras" o "Cita específica"

SI citas de hoy → appointments-today
SI citas futuras → appointments-upcoming
SI cita específica (con ID) → appointment-details
```

### Paso 4: Tipo de Información Médica
```
Determine si el usuario está preguntando por:
"Información de doctores" o "Información de servicios"

SI doctores → continuar al Paso 5
SI servicios → medical-services
```

### Paso 5: Nivel de Detalle de Doctores
```
Determine si el usuario está preguntando por:
"Lista básica" o "Información completa"

SI lista básica → doctor-availability
SI información completa → doctors-with-services
```

---

## 📝 Ejemplos de Aplicación

### Ejemplo 1:
**Usuario**: "¿Cómo está la clínica?"
**Análisis**: Información general
**Decisión**: `organization-summary`

### Ejemplo 2:
**Usuario**: "Busca a María García"
**Análisis**: Búsqueda específica → Personas
**Decisión**: `patients-search`

### Ejemplo 3:
**Usuario**: "¿Qué citas hay hoy?"
**Análisis**: Búsqueda específica → Citas → Hoy
**Decisión**: `appointments-today`

### Ejemplo 4:
**Usuario**: "¿Qué doctores tienen?"
**Análisis**: Búsqueda específica → Doctores → Información completa
**Decisión**: `doctors-with-services`

### Ejemplo 5:
**Usuario**: "¿Cuánto cuesta una consulta?"
**Análisis**: Búsqueda específica → Servicios
**Decisión**: `medical-services`

---

## ⚠️ Casos Especiales

### Determine si el usuario está preguntando por:

**"Información ambigua"** o **"Información clara"**

**SI ambigua**:
- Pedir aclaración al usuario
- Ofrecer opciones específicas
- Usar el endpoint más general como fallback

**SI clara**:
- Proceder con el endpoint determinado
- Configurar parámetros apropiados

### Casos de Ambigüedad Común:

1. **"citas"** sin especificar tiempo:
   - Preguntar: "¿Te refieres a las citas de hoy o próximas?"

2. **"doctor"** sin especificar qué información:
   - Preguntar: "¿Necesitas la lista de doctores o información específica?"

3. **"información"** muy general:
   - Ofrecer: "¿Qué tipo de información necesitas: pacientes, citas, doctores o servicios?"

---

## 🎯 Reglas de Prioridad

### Cuando hay múltiples interpretaciones posibles:

1. **Priorizar la interpretación más específica**
2. **Si hay nombres propios → `patients-search`**
3. **Si hay referencias temporales → endpoints de citas**
4. **Si hay dudas → `organization-summary` como contexto**

### Determine si el usuario está preguntando por:

**"Múltiples tipos de información"** o **"Un tipo específico"**

**SI múltiples tipos**:
- Usar el endpoint más relevante primero
- Ofrecer información adicional después
- Combinar respuestas si es apropiado

**SI un tipo específico**:
- Usar el endpoint exacto
- Proporcionar información completa
- Ofrecer consultas relacionadas

---

## 📋 Checklist de Decisión

Antes de seleccionar un endpoint, verificar:

- [ ] ¿El usuario mencionó nombres específicos? → `patients-search`
- [ ] ¿El usuario mencionó "hoy"? → `appointments-today`
- [ ] ¿El usuario mencionó tiempo futuro? → `appointments-upcoming`
- [ ] ¿El usuario mencionó doctores/médicos? → `doctors-with-services`
- [ ] ¿El usuario mencionó servicios/precios? → `medical-services`
- [ ] ¿El usuario proporcionó un ID de cita? → `appointment-details`
- [ ] ¿El usuario pidió lista básica? → `doctor-availability`
- [ ] ¿Es una consulta general? → `organization-summary`

---

## 🔄 Flujo de Retroalimentación

### Después de cada respuesta, determine si el usuario está preguntando por:

**"Información adicional relacionada"** o **"Información completamente diferente"**

**SI información relacionada**:
- Usar endpoints complementarios
- Mantener contexto de la consulta anterior
- Ofrecer información progresiva

**SI información diferente**:
- Reiniciar el análisis de decisión
- Aplicar las reglas desde el inicio
- No asumir contexto previo

Esta guía garantiza la selección correcta del endpoint basándose en un análisis sistemático de la intención del usuario.