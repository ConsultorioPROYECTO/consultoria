# Guía de Conexión a Base de Datos - Patrón Singleton

## Resumen

Esta guía documenta la implementación del patrón Singleton para la conexión a la base de datos MySQL usando Drizzle ORM. La solución resuelve problemas de ESLint con variables globales y proporciona una gestión robusta de conexiones.

## Características Principales

### ✅ Beneficios de la Nueva Implementación

- **Patrón Singleton**: Garantiza una única instancia de conexión en toda la aplicación
- **Sin Variables Globales**: Elimina el uso de `declare global` y variables `var` problemáticas
- **Compatible con ESLint**: No genera advertencias de linting
- **Optimizado para HMR**: Funciona correctamente con Hot Module Replacement en desarrollo
- **Configuración por Entorno**: Diferentes configuraciones para desarrollo y producción
- **Manejo de Errores**: Gestión robusta de errores de conexión
- **Logging Detallado**: Información clara sobre el estado de las conexiones
- **Testing Friendly**: Métodos para testing y verificación de conexiones

### 🔧 Configuración del Pool

```typescript
// Configuración automática basada en el entorno
const poolConfig = {
  uri: DATABASE_URL,
  connectionLimit: isProduction ? 20 : 10,  // Más conexiones en producción
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};
```

## Uso Básico

### Importación Estándar

```typescript
// Importación principal (recomendada)
import { db } from '@/db';

// Uso en consultas
const users = await db.select().from(usersTable);
```

### Importación por Defecto

```typescript
// Compatible con imports existentes
import db from '@/db';

const users = await db.select().from(usersTable);
```

### Operaciones Avanzadas

```typescript
import { db, dbConnection } from '@/db';

// Verificar conexión
const isConnected = await dbConnection.testConnection();

// Acceso al pool (uso avanzado)
const pool = dbConnection.getPool();

// Cerrar conexiones (testing/shutdown)
await dbConnection.closeConnections();
```

## Migración desde la Versión Anterior

### Antes (Problemático)

```typescript
// ❌ Uso de variables globales
declare global {
  // eslint-disable-next-line no-var
  var drizzleMysqlPool: mysql.Pool | undefined;
  // eslint-disable-next-line no-var
  var drizzleDbInstance: MySql2Database<typeof schema> | undefined;
}

// ❌ Lógica compleja de inicialización
if (process.env.NODE_ENV === 'production') {
  // código duplicado...
} else {
  if (!globalThis.drizzleMysqlPool) {
    // más código duplicado...
  }
}
```

### Después (Solución Robusta)

```typescript
// ✅ Patrón Singleton limpio
class DatabaseConnection {
  private static instance: DatabaseConnection;
  
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }
}

// ✅ Exportación simple
export const db = DatabaseConnection.getInstance().getDatabase();
```

## Ventajas del Patrón Singleton

### 1. **Gestión de Recursos**
- Una única instancia de pool de conexiones
- Evita la creación excesiva de conexiones
- Optimiza el uso de memoria

### 2. **Consistencia**
- Configuración centralizada
- Comportamiento predecible
- Estado global controlado

### 3. **Mantenibilidad**
- Código más limpio y organizado
- Fácil testing y debugging
- Separación clara de responsabilidades

### 4. **Compatibilidad con ESLint**
- No requiere directivas `eslint-disable`
- Cumple con las mejores prácticas de TypeScript
- Evita el uso de variables `var` en contexto global

## Variables de Entorno

```bash
# Requerida
DATABASE_URL=mysql://user:password@host:port/database

# Opcional
DRIZZLE_LOGGER=true  # Habilita logging de consultas SQL
NODE_ENV=production  # Afecta la configuración del pool
```

## Logging y Monitoreo

La implementación incluye logging detallado:

```
✅ [DB] Conexión MySQL inicializada para desarrollo
📊 [DB] Pool configurado con límite de 10 conexiones
✅ [DB] Test de conexión exitoso
🔒 [DB] Conexiones cerradas correctamente
```

## Testing

```typescript
import { dbConnection } from '@/db';

describe('Database Connection', () => {
  afterAll(async () => {
    // Cerrar conexiones después de los tests
    await dbConnection.closeConnections();
  });

  it('should connect to database', async () => {
    const isConnected = await dbConnection.testConnection();
    expect(isConnected).toBe(true);
  });
});
```

## Resolución de Problemas

### Error: "DATABASE_URL environment variable is not set"

**Solución**: Configurar la variable de entorno en `.env.local`:

```bash
DATABASE_URL=mysql://user:password@localhost:3306/database
```

### Error: "Too many connections"

**Solución**: La implementación Singleton previene este problema automáticamente al reutilizar el pool de conexiones.

### Problemas de HMR en Desarrollo

**Solución**: El patrón Singleton mantiene la misma instancia durante Hot Module Replacement, evitando reconexiones innecesarias.

## Mejores Prácticas

1. **Usar la exportación `db` para consultas normales**
2. **Usar `dbConnection` solo para operaciones avanzadas**
3. **Cerrar conexiones en tests con `afterAll`**
4. **Configurar `DRIZZLE_LOGGER=true` solo en desarrollo**
5. **Monitorear logs para detectar problemas de conexión**

## Conclusión

La implementación del patrón Singleton para la conexión a base de datos proporciona:

- ✅ Solución robusta y escalable
- ✅ Compatibilidad total con ESLint
- ✅ Optimización de recursos
- ✅ Facilidad de mantenimiento
- ✅ Mejor experiencia de desarrollo

Esta solución reemplaza completamente el uso de variables globales problemáticas y proporciona una base sólida para el crecimiento de la aplicación.