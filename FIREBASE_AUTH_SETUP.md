# Configuración de Autenticación Firebase

Esta documentación explica cómo implementar y usar el sistema de tokens personalizados de Firebase en el proyecto de consultorios médicos.

## 📋 Tabla de Contenidos

- [Archivos Creados](#archivos-creados)
- [Configuración Inicial](#configuración-inicial)
- [Estructura de Tokens](#estructura-de-tokens)
- [Uso en Rutas de API](#uso-en-rutas-de-api)
- [Ejemplos de Implementación](#ejemplos-de-implementación)
- [Seguridad](#seguridad)
- [Troubleshooting](#troubleshooting)

## 🗂️ Archivos Creados

### Archivos Principales

1. **`src/lib/firebase-auth.ts`**
   - Funciones principales para crear y verificar tokens
   - Definición de tipos y esquemas
   - Gestión de permisos por rol

2. **`src/lib/auth-middleware.ts`**
   - Middleware de autenticación para rutas de API
   - Helpers para verificar permisos específicos
   - Funciones de validación de acceso

3. **`src/app/api/auth/create-custom-token/route.ts`**
   - Endpoint para crear tokens personalizados
   - Integración con la base de datos
   - Validación de usuarios y organizaciones

4. **`src/app/api/auth/example-protected-route/route.ts`**
   - Ejemplos de rutas protegidas
   - Diferentes niveles de autenticación
   - Casos de uso comunes

5. **`.env.example.firebase`**
   - Variables de entorno necesarias
   - Instrucciones de configuración

## ⚙️ Configuración Inicial

### 1. Variables de Entorno

Copiar las variables del archivo `.env.example.firebase` a tu archivo `.env.local`:

```bash
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

### 2. Configuración en Firebase Console

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Seleccionar tu proyecto
3. Ir a "Configuración del proyecto" > "Cuentas de servicio"
4. Hacer clic en "Generar nueva clave privada"
5. Descargar el archivo JSON
6. Copiar los valores a las variables de entorno

### 3. Instalación de Dependencias

Las dependencias necesarias ya están incluidas en el `package.json`:
- `firebase-admin`: SDK de Firebase Admin
- `zod`: Validación de esquemas

## 🎫 Estructura de Tokens

### Claims Personalizados

Cada token incluye los siguientes claims:

```typescript
interface CustomClaims {
  role: 'admin' | 'doctor' | 'assistant' | 'patient';
  organizationId: string;
  organizationName: string;
  permissions: UserPermissions;
  calendarAccess: boolean;
  doctorInfo?: DoctorInfo;        // Solo para doctores
  assistantInfo?: AssistantInfo;  // Solo para asistentes
  tokenCreatedAt: number;
  tokenVersion: number;
}
```

### Permisos por Rol

| Permiso | Admin | Doctor | Assistant | Patient |
|---------|-------|--------|-----------|----------|
| `manageAppointments` | ✅ | ✅ | ✅ | ❌ |
| `viewAllAppointments` | ✅ | ❌ | ✅ | ❌ |
| `managePatients` | ✅ | ✅ | ✅ | ❌ |
| `manageServices` | ✅ | ❌ | ❌ | ❌ |
| `manageStaff` | ✅ | ❌ | ❌ | ❌ |
| `manageOrganization` | ✅ | ❌ | ❌ | ❌ |
| `accessCalendar` | ✅ | ✅ | ✅ | ❌ |
| `generateReports` | ✅ | ✅ | ❌ | ❌ |

## 🛡️ Uso en Rutas de API

### Autenticación Básica

```typescript
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request, {
    allowedRoles: ['admin', 'doctor'],
    requiredPermissions: ['managePatients'],
  });

  if (!authResult.success) {
    return NextResponse.json(authResult.error!.body, { 
      status: authResult.error!.status 
    });
  }

  const user = authResult.user!;
  // Lógica de la ruta...
}
```

### Middleware Específicos

```typescript
// Solo administradores
const authResult = await requireAdmin(request);

// Solo doctores
const authResult = await requireDoctor(request);

// Solo usuarios con acceso al calendario
const authResult = await requireCalendarAccess(request);
```

### Verificación de Acceso Específico

```typescript
import { canAccessDoctorAppointments, getDoctorInfo } from '@/lib/auth-middleware';

// Verificar si puede acceder a citas de un doctor específico
const canAccess = canAccessDoctorAppointments(user, doctorId);

// Obtener información del doctor del token
const doctorInfo = getDoctorInfo(user);
```

## 💡 Ejemplos de Implementación

### 1. Crear Token Personalizado

```typescript
import { createMedicalCustomToken } from '@/lib/firebase-auth';

const customToken = await createMedicalCustomToken({
  uid: 'firebase-uid',
  role: 'doctor',
  organizationId: 'org-123',
  organizationName: 'Clínica San José',
  doctorInfo: {
    doctorId: 'doc-456',
    specialty: 'Cardiología',
    googleCalendarId: 'calendar-id',
    medicalLicense: 'LIC-789',
  },
});
```

### 2. Verificar Token en el Frontend

```typescript
// En el cliente (React/Next.js)
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

// Intercambiar token personalizado por token de ID
const userCredential = await signInWithCustomToken(auth, customToken);
const idToken = await userCredential.user.getIdToken();

// Usar token de ID en requests a la API
fetch('/api/protected-route', {
  headers: {
    'Authorization': `Bearer ${idToken}`,
  },
});
```

### 3. Ruta Protegida Completa

```typescript
export async function POST(request: NextRequest) {
  // Autenticar y verificar permisos
  const authResult = await authenticateRequest(request, {
    requiredPermissions: ['manageAppointments'],
    allowedRoles: ['admin', 'doctor', 'assistant'],
  });

  if (!authResult.success) {
    return NextResponse.json(authResult.error!.body, { 
      status: authResult.error!.status 
    });
  }

  const user = authResult.user!;
  
  // Validar datos de entrada
  const validation = await validateRequestBody(request, AppointmentSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error.body, { 
      status: validation.error.status 
    });
  }

  // Lógica de negocio...
  const appointment = await createAppointment(validation.data, user);
  
  return NextResponse.json(
    createSuccessResponse(appointment, 'Cita creada exitosamente').body,
    { status: HTTP_STATUS.CREATED }
  );
}
```

## 🔒 Seguridad

### Mejores Prácticas

1. **Variables de Entorno**
   - Nunca commitear credenciales al repositorio
   - Usar variables de entorno en producción
   - Rotar claves periódicamente

2. **Validación de Tokens**
   - Siempre verificar tokens en el servidor
   - Validar claims personalizados
   - Verificar pertenencia a organización

3. **Permisos Granulares**
   - Usar permisos específicos en lugar de solo roles
   - Verificar acceso a recursos específicos
   - Implementar principio de menor privilegio

4. **Logging y Monitoreo**
   - Registrar intentos de acceso
   - Monitorear tokens expirados
   - Alertas por accesos no autorizados

### Revocación de Tokens

```typescript
import { revokeUserTokens } from '@/lib/firebase-auth';

// Revocar todos los tokens de un usuario
await revokeUserTokens(uid);
```

### Actualización de Claims

```typescript
import { updateUserClaims } from '@/lib/firebase-auth';

// Actualizar claims de un usuario
await updateUserClaims(uid, {
  role: 'admin',
  permissions: getPermissionsByRole('admin'),
});
```

## 🔧 Troubleshooting

### Errores Comunes

1. **"Token inválido"**
   - Verificar que las credenciales de Firebase Admin sean correctas
   - Confirmar que el token no haya expirado
   - Validar formato del header Authorization

2. **"Acceso denegado"**
   - Verificar que el usuario tenga el rol correcto
   - Confirmar que tenga los permisos necesarios
   - Validar pertenencia a la organización

3. **"Usuario no encontrado"**
   - Verificar que el usuario exista en la base de datos
   - Confirmar sincronización entre Firebase Auth y BD local
   - Validar que el UID coincida

### Debug

```typescript
// Habilitar logs detallados
console.log('User claims:', user);
console.log('Required permissions:', requiredPermissions);
console.log('User permissions:', user.permissions);
```

### Testing

```bash
# Probar endpoint de creación de token
curl -X POST http://localhost:3000/api/auth/create-custom-token \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "firebase-uid",
    "email": "doctor@example.com",
    "organizationId": "org-123"
  }'

# Probar ruta protegida
curl -X GET http://localhost:3000/api/auth/example-protected-route \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

## 📚 Referencias

- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Zod Validation](https://zod.dev/)

---

**Nota**: Esta implementación está diseñada específicamente para el sistema de consultorios médicos y incluye roles, permisos y claims adaptados a este dominio.