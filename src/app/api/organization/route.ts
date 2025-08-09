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
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { z } from 'zod';
import {
  createOrganization,
  updateOrganization,
  getOrganizationById,
} from '@/db/queries/organization';

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
 * @description Zod schema for validating the request body when creating an organization.
 * @property {string} organizationName - The name of the organization.
 * @property {string} planId - The identifier for the selected plan (e.g., 'basico', 'profesional').
 * @property {string} [timezone] - Optional IANA timezone identifier.
 * @property {string} [currency] - Optional ISO 4217 currency code.
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
 * @description Zod schema for validating the request body when updating an organization.
 * All fields are optional.
 * @property {string} [name] - The new name of the organization.
 * @property {string} [address] - The new address of the organization.
 * @property {string} [phone] - The new phone number of the organization.
 * @property {string} [email] - The new contact email for the organization.
 * @property {string} [nit] - The new tax identification number (NIT).
 * @property {string} [timezone] - The new IANA timezone identifier.
 * @property {string} [currency] - The new ISO 4217 currency code.
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
 * @summary Handles the creation of a new organization.
 * @description This handler processes POST requests to create a new organization.
 * It validates the request body, creates the organization, assigns the user as an admin,
 * generates necessary identifiers (invitation code, instance ID, API key),
 * sets up an R2 bucket, and associates the user with the new organization.
 * @param {NextRequest} request - The incoming Next.js request object.
 * @param {AuthenticatedUserInfo} userInfo - The authenticated user's information.
 * @returns {Promise<NextResponse>} A JSON response indicating success or failure.
 */
const createOrganizationHandler = async (
    request: NextRequest,
    userInfo: AuthenticatedUserInfo): Promise<NextResponse | Response> => {
    try {
      const body = await request.json();
      
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
      const userId = userInfo.user.firebaseUid; // Use Firebase UID from token

      const result = await createOrganization(
        organizationName,
        planIdentifier,
        timezone,
        currency,
        userId
      );

      return NextResponse.json({ 
        message: 'Organización creada correctamente.',
        ...result
      });
    } catch (error) {
      console.error('Error en el servidor:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  };
/**
 * @summary Handles updates to an existing organization.
 * @description This handler processes PATCH requests to update the details of the
 * organization associated with the authenticated user. It validates the request body
 * and applies the changes to the database.
 * @param {NextRequest} request - The incoming Next.js request object.
 * @param {AuthenticatedUserInfo} userInfo - The authenticated user's information,
 * which must include an `organizationId`.
 * @returns {Promise<NextResponse>} A JSON response with the updated organization data or an error.
 */
const patchOrganizationHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo
): Promise<NextResponse | Response> => {
  try {
    if (!userInfo.user.organizationId) {
      return NextResponse.json(
        { error: 'Usuario no pertenece a ninguna organización' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
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

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron campos para actualizar' },
        { status: 400 }
      );
    }

    const updatedOrganization = await updateOrganization(
      userInfo.user.organizationId,
      updateData
    );

    return NextResponse.json({ 
      message: 'Organización actualizada correctamente.',
      organization: updatedOrganization
    });
  } catch (error) {
    console.error('Error en el servidor:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
};

/**
 * @summary Retrieves the authenticated user's organization details.
 * @description This handler processes GET requests to fetch the information of the
 * organization to which the authenticated user belongs.
 * @param {NextRequest} request - The incoming Next.js request object.
 * @param {AuthenticatedUserInfo} userInfo - The authenticated user's information,
 * which must include an `organizationId`.
 * @returns {Promise<NextResponse>} A JSON response containing the organization data or an error.
 */
const getOrganizationHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo
): Promise<NextResponse | Response> => {
  try {
    if (!userInfo.user.organizationId) {
      return NextResponse.json(
        { error: 'Usuario no pertenece a ninguna organización' },
        { status: 400 }
      );
    }

    const organizationData = await getOrganizationById(userInfo.user.organizationId);

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

export const POST = withOptimizedAuthentication(createOrganizationHandler, {
  requiredRoles: ['admin', 'medico', 'asistente', 'N/A'],
  requireOrganization: false,
});

export const PATCH = withOptimizedAuthentication(patchOrganizationHandler, {
  requiredRoles: ['admin'],
  requireOrganization: true,
});
  