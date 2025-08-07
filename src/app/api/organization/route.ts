// src/app/api/organization/route.ts

/**
 * @fileoverview API Route para obtener la lista de los appointments de un medico por medio de su token (protegida).
 * @version 1.0.0 
 * @author Santiago Prada
 * @date 2025-05-13
 *
 * @description
 * Maneja las solicitudes POST a `src/app/api/organization`. Requiere autenticación y que el
 * usuario solicitante tenga el rol de 'admin'.
 * Utiliza la instancia de Drizzle ORM (`db`) para consultar todos los registros
 * de la tabla `organization` en la base de datos MySQL.
 * Devuelve un un mensaje con el status de la consulta en formato JSON.
 *
 * La autenticación se maneja mediante la validación de Tokens ID de Firebase.
 *
 * @requires next/server - Para los tipos NextRequest y NextResponse.
 * @requires ../../../lib/db - Instancia `db` de Drizzle ORM.
 * @requires ../../../lib/db/schema - Definición de la tabla `appointments`.
 * @requires ../../../lib/server/middleware/authMiddleware - Para `withAuthentication`.
 * @requires firebase-admin/auth - Para el tipo `DecodedIdToken`.
 * @requires drizzle-orm - Para el operador `eq` y funciones de ordenamiento.
 *
 * @returns {Promise<NextResponse | Response>} Una promesa que resuelve a:
 *  - NextResponse con status 400 si el cuerpo o el rol de la solicitud es inválido.
 *  - NextResponse con status 401 si la autenticación falla (token faltante/inválido).
 *  - NextResponse con status 403 si el usuario autenticado no tiene el rol 'admin'.
 *  - NextResponse con status 201 si la consulta es exitosa.
 *  - NextResponse con status 500 y un mensaje de error si ocurre un problema en la BD.
 *
 * @example - Cómo probar la ruta con curl (requiere un token válido de un admin):
 * # Asumiendo que tienes un TOKEN_ID_ADMIN válido
 * curl -H "Authorization: Bearer <TOKEN_ID_ADMIN>" http://localhost:3000/api/doctors/dahsboard/appointments
 *
 * @todo 
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rutas/db';
import { organization, plans } from '@rutas/db/schema';
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { users } from '@rutas/db/schema/users';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generateRandomInvitationCode, generateUniqueInstanceId, generateUniqueApiKey } from '@/lib/organization-utils';
import { syncKnowledgeAfterCRUD } from '@/lib/knowledge-manager';

/**
 * Valida si una zona horaria es válida según los estándares IANA.
 * 
 * @description
 * Utiliza el método nativo `Intl.supportedValuesOf('timeZone')` para validar
 * que la zona horaria proporcionada esté soportada por el entorno de ejecución.
 * Si el método no está disponible (navegadores antiguos), utiliza un fallback
 * que intenta crear un objeto `Intl.DateTimeFormat` con la zona horaria.
 * 
 * @param {string} timezone - Identificador de zona horaria IANA (ej: 'America/New_York', 'UTC')
 * @returns {boolean} `true` si la zona horaria es válida, `false` en caso contrario
 * 
 * @example
 * ```typescript
 * isValidTimezone('America/New_York'); // true
 * isValidTimezone('UTC'); // true
 * isValidTimezone('Invalid/Timezone'); // false
 * ```
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf | Intl.supportedValuesOf()}
 * @see {@link https://en.wikipedia.org/wiki/List_of_tz_database_time_zones | IANA Time Zone Database}
 * 
 * @since 1.0.0
 */
const isValidTimezone = (timezone: string): boolean => {
  try {
    if (typeof Intl.supportedValuesOf !== 'undefined') {
      const supportedTimezones = Intl.supportedValuesOf('timeZone');
      return supportedTimezones.includes(timezone);
    }
    // Fallback: intentar crear un DateTimeFormat con la timezone
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

/**
 * Valida si un código de moneda es válido según el estándar ISO 4217.
 * 
 * @description
 * Utiliza el método nativo `Intl.supportedValuesOf('currency')` para validar
 * que el código de moneda proporcionado esté soportado por el entorno de ejecución.
 * Si el método no está disponible (navegadores antiguos), utiliza un fallback
 * que intenta crear un objeto `Intl.NumberFormat` con el código de moneda.
 * 
 * @param {string} currency - Código de moneda ISO 4217 (ej: 'USD', 'EUR', 'COP')
 * @returns {boolean} `true` si el código de moneda es válido, `false` en caso contrario
 * 
 * @example
 * ```typescript
 * isValidCurrency('USD'); // true
 * isValidCurrency('eur'); // true (se convierte a mayúsculas)
 * isValidCurrency('XYZ'); // false
 * ```
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf | Intl.supportedValuesOf()}
 * @see {@link https://en.wikipedia.org/wiki/ISO_4217 | ISO 4217 Currency Codes}
 * 
 * @since 1.0.0
 */
const isValidCurrency = (currency: string): boolean => {
  try {
    if (typeof Intl.supportedValuesOf !== 'undefined') {
      const supportedCurrencies = Intl.supportedValuesOf('currency');
      return supportedCurrencies.includes(currency.toUpperCase());
    }
    // Fallback: intentar crear un NumberFormat con la currency
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency });
    return true;
  } catch {
    return false;
  }
};

/**
 * Esquema de validación para la creación de organización
 */
const createOrganizationSchema = z.object({
  organizationName: z.string()
    .min(1, 'El nombre de la organización es requerido')
    .max(255, 'El nombre de la organización no puede exceder 255 caracteres')
    .trim(),
  planId: z.string().min(1, 'El ID del plan es requerido'), // Cambiado a string
  timezone: z.string()
    .max(40, 'La zona horaria no puede exceder 40 caracteres')
    .refine(timezone => !timezone || isValidTimezone(timezone), {
      message: 'La zona horaria proporcionada no es válida según los estándares IANA'
    })
    .optional(),
  currency: z.string()
    .max(40, 'La moneda no puede exceder 40 caracteres')
    .refine(currency => !currency || isValidCurrency(currency), {
      message: 'El código de moneda proporcionado no es válido según ISO 4217'
    })
    .optional()
});

/**
 * Esquema de validación para la actualización de organización
 */
const updateOrganizationSchema = z.object({
  name: z.string()
    .min(1, 'El nombre de la organización es requerido')
    .max(255, 'El nombre de la organización no puede exceder 255 caracteres')
    .trim()
    .optional(),
  address: z.string()
    .max(255, 'La dirección no puede exceder 255 caracteres')
    .trim()
    .optional(),
  phone: z.string()
    .max(15, 'El teléfono no puede exceder 15 caracteres')
    .trim()
    .optional(),
  email: z.string()
    .email('Formato de email inválido')
    .max(255, 'El email no puede exceder 255 caracteres')
    .trim()
    .optional(),
  nit: z.string()
    .max(45, 'El NIT no puede exceder 45 caracteres')
    .trim()
    .optional(),
  timezone: z.string()
    .max(40, 'La zona horaria no puede exceder 40 caracteres')
    .trim()
    .refine(timezone => !timezone || isValidTimezone(timezone), {
      message: 'La zona horaria proporcionada no es válida según los estándares IANA'
    })
    .optional(),
  currency: z.string()
    .max(40, 'La moneda no puede exceder 40 caracteres')
    .trim()
    .refine(currency => !currency || isValidCurrency(currency), {
      message: 'El código de moneda proporcionado no es válido según ISO 4217'
    })
    .optional()
});



/**
 * Manejador para solicitudes POST a src/app/api/organization/route.ts.
 * Permite crear una organizacion a un usuario admin.
 * @async
 * @param {NextRequest} request
 * @param {DecodedIdToken} decodedToken
 * @returns {Promise<NextResponse | Response>}
 */
const postUserRoleHandler = async (
    request: NextRequest,
    userInfo: AuthenticatedUserInfo): Promise<NextResponse | Response> => {
    try {
      // La información del usuario ya está disponible en userInfo
      const body = await request.json();
      
      // Validar el cuerpo de la solicitud con Zod
      const validationResult = createOrganizationSchema.safeParse(body);
      
      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        
        return NextResponse.json(
          { 
            error: 'Datos de entrada inválidos', 
            details: errorMessages,
            issues: validationResult.error.errors
          },
          { status: 400 }
        );
      }
      
      const { organizationName, planId: planIdentifier, timezone, currency } = validationResult.data;

      // Mapeo de identificadores de plan del frontend a nombres en la BD
      const planIdentifierMap: { [key: string]: string } = {
        'basico': 'Básico',
        'profesional': 'Profesional',
        'empresarial': 'Empresarial'
      };

      const planName = planIdentifierMap[planIdentifier];

      if (!planName) {
        return NextResponse.json(
          { error: `El identificador de plan '${planIdentifier}' es inválido.` },
          { status: 400 }
        );
      }

      // 1. Buscar el plan por su nombre
      const plan = await db.query.plans.findFirst({
        where: eq(plans.name, planName)
      });

      if (!plan) {
        return NextResponse.json(
          { error: `El plan con el nombre '${planName}' no fue encontrado.` },
          { status: 404 }
        );
      }

      // 2. Actualizar el rol del usuario a 'admin'
      await db.update(users)
        .set({ role: "admin" })
        .where(eq(users.id, userInfo.user.id));

      // 3. Generar código de invitación, instanceId y apiKey
      const invitacionCode = await generateRandomInvitationCode();
      const instanceId = await generateUniqueInstanceId();
      const apiKey = await generateUniqueApiKey();
      
      // 4. Crear la organización usando el ID numérico del plan encontrado
      const insertResult = await db.insert(organization).values({
        name: organizationName,
        invitationCode: invitacionCode,
        planId: plan.id, // Usar el ID numérico del plan
        instanceId: instanceId,
        apiKey: apiKey,
        timezone: timezone,
        currency: currency,
      });

      const newOrganizationId = insertResult[0].insertId;

      if (!newOrganizationId) {
        return NextResponse.json(
          { error: 'Error al crear la organización.' },
          { status: 500 }
        );
      }

      // 5. Asociar el usuario a la organización
      await db.update(users)
      .set({ organizationId: newOrganizationId })
      .where(eq(users.id, userInfo.user.id));

      // 6. Sincronizar conocimiento con pgVector
      try {
        await syncKnowledgeAfterCRUD('organization', 'create', {
          id: newOrganizationId,
          organizationId: newOrganizationId
        });
        console.log(`Conocimiento sincronizado para organización ${newOrganizationId}`);
      } catch (syncError) {
        console.error('Error al sincronizar conocimiento:', syncError);
        // No fallar la operación principal por errores de sincronización
      }

      return NextResponse.json({ 
        message: 'Organización creada correctamente.',
        organizationId: newOrganizationId,
        invitationCode: invitacionCode,
        instanceId: instanceId,
        apiKey: apiKey
      });
    } catch (error) {
      console.error('Error en el servidor:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor.' },
        { status: 500 }
      );
    }
  };
/**
 * Manejador para solicitudes PATCH a src/app/api/organization/route.ts.
 * Permite actualizar la información de una organización.
 * @async
 * @param {NextRequest} request
 * @param {AuthenticatedUserInfo} userInfo
 * @returns {Promise<NextResponse | Response>}
 */
const patchOrganizationHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo
): Promise<NextResponse | Response> => {
  try {
    // Verificar que el usuario pertenezca a una organización
    if (!userInfo.user.organizationId) {
      return NextResponse.json(
        { error: 'Usuario no pertenece a ninguna organización' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validar el cuerpo de la solicitud con Zod
    const validationResult = updateOrganizationSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      
      return NextResponse.json(
        { 
          error: 'Datos de entrada inválidos', 
          details: errorMessages,
          issues: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Verificar que hay al menos un campo para actualizar
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron campos para actualizar' },
        { status: 400 }
      );
    }

    // Actualizar la organización
    const updateResult = await db.update(organization)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(organization.id, userInfo.user.organizationId));

    // Verificar que la organización fue actualizada
    if (updateResult[0].affectedRows === 0) {
      return NextResponse.json(
        { error: 'Organización no encontrada o no se pudo actualizar' },
        { status: 404 }
      );
    }

    // Obtener la organización actualizada
    const updatedOrganization = await db.query.organization.findFirst({
      where: eq(organization.id, userInfo.user.organizationId)
    });

    // Sincronizar conocimiento con pgVector
    try {
      await syncKnowledgeAfterCRUD('organization', 'update', {
        id: userInfo.user.organizationId,
        organizationId: userInfo.user.organizationId
      });
      console.log(`Conocimiento sincronizado para organización ${userInfo.user.organizationId}`);
    } catch (syncError) {
      console.error('Error al sincronizar conocimiento:', syncError);
      // No fallar la operación principal por errores de sincronización
    }

    return NextResponse.json({ 
      message: 'Organización actualizada correctamente.',
      organization: updatedOrganization
    });
  } catch (error) {
    console.error('Error en el servidor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
};

/**
 * Manejador para solicitudes GET a src/app/api/organization/route.ts.
 * Permite obtener la información de la organización del usuario.
 * @async
 * @param {NextRequest} request
 * @param {AuthenticatedUserInfo} userInfo
 * @returns {Promise<NextResponse | Response>}
 */
const getOrganizationHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo
): Promise<NextResponse | Response> => {
  try {
    // Verificar que el usuario pertenezca a una organización
    if (!userInfo.user.organizationId) {
      return NextResponse.json(
        { error: 'Usuario no pertenece a ninguna organización' },
        { status: 400 }
      );
    }

    // Obtener la información de la organización
    const organizationData = await db.query.organization.findFirst({
      where: eq(organization.id, userInfo.user.organizationId)
    });

    if (!organizationData) {
      return NextResponse.json(
        { error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      organization: organizationData
    });
  } catch (error) {
    console.error('Error en el servidor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
};

export const GET = withOptimizedAuthentication(getOrganizationHandler, {
  requiredRoles: ['admin', 'medico', 'asistente'],
  requireOrganization: true,
});

export const POST = withOptimizedAuthentication(postUserRoleHandler, {
  requiredRoles: ['admin', 'medico', 'asistente', 'N/A'],
  requireOrganization: false,
});

export const PATCH = withOptimizedAuthentication(patchOrganizationHandler, {
  requiredRoles: ['admin'],
  requireOrganization: true,
});
  