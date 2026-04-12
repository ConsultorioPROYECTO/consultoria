# API de Solicitudes de Contacto

Este documento describe la implementación de la funcionalidad para manejar las solicitudes de contacto desde el formulario de la landing page.

## Archivos Creados/Modificados

### 1. Esquema de Base de Datos
- **Archivo**: `src/db/schema/contact_requests.ts`
- **Descripción**: Define la tabla `contact_requests` para almacenar la información de contacto.
- **Campos**:
  - `id`: Clave primaria autoincremental
  - `name`: Nombre completo (varchar 255)
  - `email`: Correo electrónico (varchar 255)
  - `company`: Empresa u organización (varchar 255)
  - `message`: Mensaje detallado (text)
  - `createdAt`: Timestamp de creación
  - `updatedAt`: Timestamp de última actualización

### 2. API Endpoint
- **Archivo**: `src/app/api/contact/route.ts`
- **Rutas**:
  - `POST /api/contact`: Crear nueva solicitud de contacto
  - `GET /api/contact`: Obtener todas las solicitudes (para admin)

### 3. Componente Frontend
- **Archivo**: `src/app/(Landing)/_components/contact-modal.tsx`
- **Modificación**: Actualizado para usar la nueva API en lugar de console.log

### 4. Migración de Base de Datos
- **Archivo**: `drizzle/migrations/0038_concerned_avengers.sql`
- **Descripción**: Crea la tabla `contact_requests` en la base de datos

## Uso de la API

### Crear Solicitud de Contacto

```javascript
const response = await fetch('/api/contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Juan Pérez',
    email: 'juan@ejemplo.com',
    company: 'Clínica Ejemplo',
    message: 'Estoy interesado en la plataforma...'
  })
});

const result = await response.json();
```

**Respuesta exitosa (201)**:
```json
{
  "success": true,
  "message": "Solicitud de contacto enviada exitosamente",
  "data": {
    "id": 1
  }
}
```

**Respuesta de error (400)**:
```json
{
  "success": false,
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "El nombre es requerido",
      "path": ["name"]
    }
  ]
}
```

### Obtener Solicitudes (Admin)

```javascript
const response = await fetch('/api/contact', {
  method: 'GET'
});

const result = await response.json();
```

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Juan Pérez",
      "email": "juan@ejemplo.com",
      "company": "Clínica Ejemplo",
      "message": "Estoy interesado en la plataforma...",
      "createdAt": "2025-01-20T10:30:00.000Z",
      "updatedAt": "2025-01-20T10:30:00.000Z"
    }
  ]
}
```

## Validaciones

La API incluye validaciones usando Zod:

- **name**: Requerido, máximo 255 caracteres
- **email**: Requerido, formato de email válido, máximo 255 caracteres
- **company**: Requerido, máximo 255 caracteres
- **message**: Requerido, máximo 2000 caracteres

## Seguridad

- La ruta POST `/api/contact` NO requiere autenticación (es para usuarios públicos)
- La ruta GET `/api/contact` podría requerir autenticación de admin en el futuro
- Todos los datos se validan antes de ser insertados en la base de datos
- Se incluye manejo de errores robusto

## Próximos Pasos

1. **Ejecutar la migración**: `npx drizzle-kit push` (en producción)
2. **Panel de administración**: Crear interfaz para ver las solicitudes
3. **Notificaciones**: Implementar notificaciones por email cuando llegue una nueva solicitud
4. **Autenticación en GET**: Agregar middleware de autenticación para la ruta GET
5. **Rate limiting**: Implementar límites de velocidad para prevenir spam