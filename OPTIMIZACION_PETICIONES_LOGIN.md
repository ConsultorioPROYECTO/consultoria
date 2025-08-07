# Optimización de Peticiones en el Login

## Problema Identificado

Al iniciar sesión, se generaban múltiples peticiones redundantes que causaban:
- Entre 6-8 peticiones por login
- Duplicación de llamadas a `/api/auth/sync-user`
- Múltiples llamadas a `/api/users/rol`
- Refresh innecesario de tokens de Firebase
- Lógica duplicada entre `AuthContext` y `useLoginSync`

## Solución Implementada

### 1. Optimización del AuthContext

**Cambios realizados:**
- **Eliminación de token refresh forzado**: Removido `getIdToken(true)` innecesario
- **Peticiones en paralelo**: Uso de `Promise.allSettled()` para ejecutar sync-user y rol simultáneamente
- **Cooldown de sincronización**: Implementado un cooldown de 5 segundos para evitar peticiones repetidas
- **Navegación automática**: Centralizada la lógica de navegación en el AuthContext
- **Mejor manejo de errores**: Uso de `Promise.allSettled()` para manejar errores independientemente

### 2. Eliminación de useLoginSync

**Archivos eliminados:**
- `/src/hooks/useLoginSync.ts`

**Archivos actualizados:**
- `/src/app/(Auth)/login/page.tsx` - Removida importación y uso
- `/src/app/(Auth)/login/_components/login-form.tsx` - Añadido toast de confirmación

### 3. Centralización de la Lógica

Toda la lógica de sincronización y navegación ahora está centralizada en `AuthContext`, eliminando duplicaciones y race conditions.

## Resultados de la Optimización

### Antes:
- 🔴 6-8 peticiones por login
- 🔴 Duplicación de sync-user
- 🔴 Token refresh innecesario
- 🔴 Lógica dispersa en múltiples hooks
- 🔴 Posibles race conditions

### Después:
- ✅ 2 peticiones por login (sync-user + rol)
- ✅ Peticiones ejecutadas en paralelo
- ✅ Cooldown para evitar spam
- ✅ Lógica centralizada en AuthContext
- ✅ Navegación automática
- ✅ Mejor experiencia de usuario

## Beneficios

1. **Performance**: Reducción del 75% en peticiones de red
2. **Mantenibilidad**: Código más limpio y centralizado
3. **Confiabilidad**: Eliminación de race conditions
4. **UX**: Navegación más rápida y fluida
5. **Escalabilidad**: Mejor base para futuras optimizaciones

## Funcionalidades Preservadas

- ✅ Validación de email verificado
- ✅ Manejo de errores
- ✅ Sincronización de usuario
- ✅ Obtención de rol y organización
- ✅ Navegación automática (onboard vs home)
- ✅ Compatibilidad con Google Auth
- ✅ Polling de roles (cuando sea necesario)

## Problema Identificado Post-Optimización

### Loop de Peticiones por Navegación Automática

Después de la implementación inicial, se detectó un **loop infinito de peticiones** causado por:

- **Navegación con recarga completa**: El uso de `window.location.href` en `AuthContext` causaba recargas completas de la página
- **Reinicio del contexto**: Cada recarga reiniciaba el `AuthContext`, ejecutando nuevamente `onAuthStateChanged`
- **Ciclo infinito**: Usuario autenticado → peticiones → navegación → recarga → reinicio del contexto → repetir

### Solución Implementada

1. **Eliminación de navegación automática del AuthContext**:
   - Removido `window.location.href` del `AuthContext`
   - El contexto ahora se enfoca únicamente en autenticación y estado del usuario

2. **Navegación manual en componentes**:
   - Agregado `useRouter` en `login-form.tsx`
   - Navegación basada en `useEffect` que escucha cambios en `userRole` y `organizationId`
   - Navegación sin recarga de página usando Next.js router

3. **Separación de responsabilidades**:
   - `AuthContext`: Manejo de autenticación y estado
   - Componentes de formulario: Manejo de navegación post-login

## Notas Técnicas

- El cooldown de 5 segundos previene peticiones excesivas durante cambios rápidos de estado
- `Promise.allSettled()` permite que ambas peticiones se ejecuten independientemente
- La navegación se maneja en los componentes usando `useRouter` de Next.js para evitar recargas
- Se mantiene toda la funcionalidad existente sin breaking changes
- **Importante**: No usar `window.location.href` en contextos de React para evitar loops de renderizado

## Testing

- ✅ ESLint: Sin errores
- ✅ TypeScript: Sin errores de compilación
- ✅ Funcionalidad: Todas las características preservadas