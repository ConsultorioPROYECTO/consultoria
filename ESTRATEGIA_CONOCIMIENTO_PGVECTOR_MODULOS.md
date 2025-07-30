# Estrategia de Gestión de Conocimiento RAG con pgVector - Módulos HTTP

## Resumen Ejecutivo

Esta estrategia define la implementación de un sistema de gestión de conocimiento RAG (Retrieval-Augmented Generation) utilizando **módulos que realizan peticiones HTTP** a una API externa de pgVector, en lugar de crear endpoints locales. El sistema sincroniza automáticamente el conocimiento de servicios médicos, organizaciones y doctores con pgVector para mejorar las capacidades de búsqueda y respuesta del asistente de IA.

## Arquitectura de la Solución

### API Externa de pgVector
- **URL**: `https://n8n.srv828784.hstgr.cloud/webhook/3b7d5b57-f750-490a-a047-cccee6818c26`
- **Métodos**: POST (para crear), PUT (para actualizar - sobrescribe completamente), DELETE (para eliminar)
- **Content-Type**: `application/json`
- **Timeout**: 10 segundos por petición
- **Reintentos**: Hasta 3 intentos con backoff exponencial

### Estructura de Petición JSON

#### Para Crear Conocimiento (POST)
```json
{
  "vector_table_name": "general",
  "meta_identificador": {
    "identificador_name": "unique_id",
    "value": "1_service_123"
  },
  "data": {
    "plain_text_data": "Servicio Médico: Consulta General\nID del Servicio: 123\nOrganización: Clínica ABC (ID: 1)\nDescripción: Consulta médica general\nDuración: 30 minutos\nPrecio: $50000",
    "markdown_text": "",
    "base_64_file": "",
    "mime_type": ""
  }
}
```

#### Para Actualizar Conocimiento (PUT)
**Nota**: El método PUT sobrescribe completamente los datos existentes.

```json
{
  "vector_table_name": "general",
  "meta_identificador": {
    "identificador_name": "unique_id",
    "value": "1_service_123"
  },
  "data": {
    "plain_text_data": "Servicio Médico: Consulta General ACTUALIZADA\nID del Servicio: 123\nOrganización: Clínica ABC (ID: 1)\nDescripción: Nueva descripción actualizada\nDuración: 30 minutos\nPrecio: $55000",
    "markdown_text": "",
    "base_64_file": "",
    "mime_type": ""
  }
}
```

#### Para Eliminar Conocimiento (DELETE)
```json
{
  "vector_table_name": "general",
  "meta_identificador": {
    "identificador_name": "unique_id",
    "value": "1_service_123"
  }
}
```

## 3. Patrón de Identificadores Únicos

### 3.1 Formato General
```
{organizationId}_{entityType}_{entityId}_{subType?}
```

### 3.2 Tipos de Entidades y Sus Identificadores

#### Servicios Médicos
- **Patrón**: `{organizationId}_service_{serviceId}`
- **Ejemplo**: `1_service_5`
- **Contenido**: Información completa del servicio médico

#### Información de la Organización
- **Patrón**: `{organizationId}_organization_{organizationId}`
- **Ejemplo**: `1_organization_1`
- **Contenido**: Datos generales de la organización

#### Doctores por Servicio
- **Patrón**: `{organizationId}_doctor_service_{doctorId}_{serviceId}`
- **Ejemplo**: `1_doctor_service_3_5`
- **Contenido**: Relación específica doctor-servicio con precios y disponibilidad

#### Perfil Completo de Doctor
- **Patrón**: `{organizationId}_doctor_{doctorId}`
- **Ejemplo**: `1_doctor_3`
- **Contenido**: Información completa del doctor

## 4. Contenido de Texto Plano por Tipo

### 4.1 Servicios Médicos
```
Servicio Médico: {name}
Código: {code}
Descripción: {description}
Categoría: {category}
Duración: {durationMinutes} minutos
Precio Base: ${basePrice}
Requiere Preparación: {requiresPreparation ? 'Sí' : 'No'}
{preparationInstructions ? `Instrucciones: ${preparationInstructions}` : ''}
Estado: {isActive ? 'Activo' : 'Inactivo'}
Organización ID: {organizationId}
```

### 4.2 Información de la Organización
```
Organización: {name}
Dirección: {address}
Teléfono: {phone}
Email: {email}
NIT: {nit}
```

### 4.3 Doctores por Servicio
```
Doctor: {doctor.user.name} {doctor.user.lastName}
Especialidad: {doctor.speciality}
Servicio: {service.name} ({service.code})
Precio Personalizado: ${customPrice || service.basePrice}
Disponible: {isAvailable ? 'Sí' : 'No'}
Teléfono Privado: {doctor.privatePhone || 'No disponible'}
```

### 4.4 Perfil Completo de Doctor
```
Doctor: {user.name} {user.lastName}
Email: {user.email}
Especialidad: {speciality}
Teléfono Privado: {privatePhone || 'No disponible'}
NIT ID: {nitId || 'No disponible'}
Calendario Sincronizado: {calendar_sync_enabled ? 'Sí' : 'No'}
Zona Horaria: {calendar_timezone || 'No configurada'}
Duración de Citas: {appointment_duration || 'No configurada'} minutos
Servicios Disponibles: {doctorServices.map(ds => ds.service.name).join(', ')}
```

## 5. Implementación de Módulos

### 5.1 Clase KnowledgeManager

**Ubicación**: `src/lib/knowledge-manager.ts`

**Responsabilidades**:
- Generar identificadores únicos
- Construir contenido de texto plano
- Hacer peticiones HTTP a la API externa
- Manejar errores y reintentos

### 5.2 Métodos Principales

```typescript
class KnowledgeManager {
  // Crear conocimiento de servicio
  async createServiceKnowledge(serviceId: number, organizationId: number): Promise<void>
  
  // Actualizar conocimiento de servicio
  async updateServiceKnowledge(serviceId: number, organizationId: number): Promise<void>
  
  // Crear o actualizar conocimiento de servicio (compatibilidad hacia atrás)
  async createOrUpdateServiceKnowledge(serviceId: number, organizationId: number): Promise<void>
  
  // Crear conocimiento de organización
  async createOrganizationKnowledge(organizationId: number): Promise<void>
  
  // Actualizar conocimiento de organización
  async updateOrganizationKnowledge(organizationId: number): Promise<void>
  
  // Crear o actualizar conocimiento de organización (compatibilidad hacia atrás)
  async createOrUpdateOrganizationKnowledge(organizationId: number): Promise<void>
  
  // Crear conocimiento de doctor-servicio
  async createDoctorServiceKnowledge(doctorId: number, serviceId: number, organizationId: number): Promise<void>
  
  // Actualizar conocimiento de doctor-servicio
  async updateDoctorServiceKnowledge(doctorId: number, serviceId: number, organizationId: number): Promise<void>
  
  // Crear o actualizar conocimiento de doctor-servicio (compatibilidad hacia atrás)
  async createOrUpdateDoctorServiceKnowledge(doctorId: number, serviceId: number, organizationId: number): Promise<void>
  
  // Eliminar conocimiento
  async deleteKnowledge(uniqueId: string, organizationId: number): Promise<void>
  
  // Generar ID único
  generateUniqueId(organizationId: number, entityType: EntityType, entityId: number, subType?: number): string
  
  // Hacer petición HTTP a pgVector
  private async makeVectorRequest(data: VectorRequest, organizationId: number, method: 'POST' | 'PUT' = 'POST'): Promise<void>
}
```

### 5.3 Sincronización Automática

**Función**: `syncKnowledgeAfterCRUD`

**Integración**: Middleware que se ejecuta después de operaciones CRUD

**Triggers**:
- Creación/modificación de servicios médicos
- Actualización de información de organización
- Cambios en relaciones doctor-servicio
- Modificación de perfiles de doctor

## 6. Manejo de Errores y Reintentos

### 6.1 Estrategia de Reintentos
- **Reintentos**: 3 intentos máximo
- **Backoff**: Exponencial (1s, 2s, 4s)
- **Timeout**: 10 segundos por petición
- **Método PUT**: Sobrescribe completamente los datos existentes (no es incremental)

### 6.2 Logging
- Registrar todas las peticiones exitosas
- Registrar errores con detalles completos
- Incluir identificadores únicos en logs

### 6.3 Manejo de Fallos
- Fallos no críticos: Log error y continuar
- Fallos críticos: Lanzar excepción
- Queue de reintentos para fallos temporales

## 7. Tipos TypeScript

```typescript
interface VectorRequest {
  vector_table_name: string;
  meta_identificador: {
    identificador_name: string;
    value: string;
  };
  data: {
    plain_text_data: string;
    markdown_text: string;
    base_64_file: string;
    mime_type: string;
  };
}

interface VectorDeleteRequest {
  vector_table_name: string;
  meta_identificador: {
    identificador_name: string;
    value: string;
  };
}

type EntityType = 'service' | 'organization' | 'doctor' | 'doctor_service';
type KnowledgeOperation = 'create' | 'update' | 'delete';
```

## 8. Ventajas de Esta Estrategia

### 8.1 Identificadores Únicos
- Permite actualizaciones precisas sin duplicados
- Facilita la eliminación selectiva
- Proporciona trazabilidad completa

### 8.2 Aislamiento por Organización
- Cada organización tiene sus propios identificadores
- Imposibilidad de acceso cruzado entre organizaciones
- Escalabilidad multi-tenant

### 8.3 Granularidad
- Control fino sobre qué información sincronizar
- Actualizaciones incrementales eficientes
- Flexibilidad para diferentes tipos de contenido

### 8.4 Integración Natural
- Aprovecha la autenticación por API Key existente
- Se integra con el patrón CRUD actual
- Mínimo impacto en el código existente

## 9. Consideraciones de Implementación

### 9.1 Rendimiento
- Peticiones HTTP asíncronas
- Batch processing para múltiples actualizaciones
- Cache local para evitar peticiones innecesarias

### 9.2 Seguridad
- Validación de datos antes de envío
- Sanitización de contenido de texto
- Rate limiting para evitar spam

### 9.3 Monitoreo
- Métricas de éxito/fallo de sincronización
- Alertas para fallos críticos
- Dashboard de estado de sincronización

### 9.4 Configuración
- URL de API configurable por ambiente
- Timeouts configurables
- Habilitación/deshabilitación por organización

Esta estrategia proporciona una base sólida para la gestión de conocimiento RAG con control granular, trazabilidad completa y escalabilidad multi-tenant.